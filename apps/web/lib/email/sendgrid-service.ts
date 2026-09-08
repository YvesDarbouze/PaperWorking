/**
 * Server-side SendGrid transactional mailer with retry and typed errors.
 *
 * Requirements:
 * - Key via environment: SENDGRID_API_KEY
 * - Server-only execution
 * - Exponential backoff retry for transient network/rate-limiting errors
 * - Typed errors (SendGridAuthError, SendGridRateLimitError, SendGridPayloadError, SendGridNetworkError)
 * - Safe mock mode for automated tests and CI environments
 */

import { AVA_CONFIG } from '../assistant/config';

// Typed Errors
export class SendGridError extends Error {
  constructor(message: string, public readonly statusCode?: number, public readonly details?: unknown) {
    super(message);
    this.name = 'SendGridError';
  }
}

export class SendGridAuthError extends SendGridError {
  constructor(message = 'SendGrid API key is missing or invalid') {
    super(message, 401);
    this.name = 'SendGridAuthError';
  }
}

export class SendGridRateLimitError extends SendGridError {
  constructor(message = 'SendGrid rate limit exceeded; retry advised') {
    super(message, 429);
    this.name = 'SendGridRateLimitError';
  }
}

export class SendGridPayloadError extends SendGridError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
    this.name = 'SendGridPayloadError';
  }
}

export class SendGridNetworkError extends SendGridError {
  constructor(message: string, details?: unknown) {
    super(message, 503, details);
    this.name = 'SendGridNetworkError';
  }
}

export interface SendGridMailRecipient {
  email: string;
  name?: string;
}

export interface SendGridMailPayload {
  to: SendGridMailRecipient | SendGridMailRecipient[];
  from?: SendGridMailRecipient;
  subject: string;
  text: string;
  html?: string;
  replyTo?: SendGridMailRecipient;
  customArgs?: Record<string, string>;
}

export interface SendGridDispatchResult {
  success: boolean;
  messageId?: string;
  mode: 'live' | 'mock';
  attempts: number;
}

// In-memory record for test inspection
export const sentEmailsForTesting: SendGridMailPayload[] = [];

export function __clearSentEmailsForTesting(): void {
  sentEmailsForTesting.length = 0;
}

/**
 * Server-side SendGrid client with retry logic.
 */
export class SendGridService {
  private apiKey: string | null;
  private defaultFrom: SendGridMailRecipient;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.SENDGRID_API_KEY ?? null;
    this.defaultFrom = {
      email: process.env.SENDGRID_FROM_EMAIL || 'support@paperworking.co',
      name: `${AVA_CONFIG.agentName} from PaperWorking`,
    };
  }

  /**
   * Dispatches email with exponential backoff for transient failures (429, 5xx).
   */
  async send(payload: SendGridMailPayload, maxRetries = 3): Promise<SendGridDispatchResult> {
    if (!payload.to || (Array.isArray(payload.to) && payload.to.length === 0)) {
      throw new SendGridPayloadError('Email must specify at least one "to" recipient.');
    }
    if (!payload.subject?.trim()) {
      throw new SendGridPayloadError('Email must specify a valid subject.');
    }
    if (!payload.text?.trim() && !payload.html?.trim()) {
      throw new SendGridPayloadError('Email must include text or HTML content.');
    }

    const isTestEnv =
      process.env.NODE_ENV === 'test' ||
      !this.apiKey ||
      this.apiKey.startsWith('mock-') ||
      this.apiKey === 'AIzaSyFakeKeyForLocalEmulatorTesting000';

    // In mock/test/CI mode: record in inspection buffer and return success
    if (isTestEnv) {
      sentEmailsForTesting.push({
        ...payload,
        from: payload.from ?? this.defaultFrom,
      });
      return {
        success: true,
        messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        mode: 'mock',
        attempts: 1,
      };
    }

    let attempt = 0;
    let delayMs = 250;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: Array.isArray(payload.to) ? payload.to : [payload.to],
              },
            ],
            from: payload.from ?? this.defaultFrom,
            reply_to: payload.replyTo,
            subject: payload.subject,
            content: [
              {
                type: 'text/plain',
                value: payload.text,
              },
              ...(payload.html
                ? [
                    {
                      type: 'text/html',
                      value: payload.html,
                    },
                  ]
                : []),
            ],
            custom_args: payload.customArgs,
          }),
        });

        if (response.status === 202 || response.status === 200) {
          const messageId = response.headers.get('x-message-id') || undefined;
          return {
            success: true,
            messageId,
            mode: 'live',
            attempts: attempt,
          };
        }

        if (response.status === 401 || response.status === 403) {
          throw new SendGridAuthError(`SendGrid authentication failed (${response.status})`);
        }

        if (response.status === 400) {
          const errData = await response.json().catch(() => ({}));
          throw new SendGridPayloadError('SendGrid rejected payload as invalid', errData);
        }

        if (response.status === 429) {
          if (attempt >= maxRetries) {
            throw new SendGridRateLimitError('SendGrid rate limit exceeded after maximum retries');
          }
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }

        if (response.status >= 500) {
          if (attempt >= maxRetries) {
            throw new SendGridNetworkError(`SendGrid server error (${response.status}) after ${attempt} attempts`);
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }

        const unknownError = await response.text().catch(() => 'Unknown error');
        throw new SendGridError(`SendGrid unexpected error (${response.status}): ${unknownError}`, response.status);
      } catch (err: unknown) {
        if (err instanceof SendGridError) {
          if (err instanceof SendGridRateLimitError || err instanceof SendGridNetworkError) {
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              delayMs *= 2;
              continue;
            }
          }
          throw err;
        }
        if (attempt >= maxRetries) {
          throw new SendGridNetworkError(`Network connectivity failed to SendGrid: ${(err as Error).message}`, err);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    throw new SendGridNetworkError(`Failed to send email after ${maxRetries} attempts`);
  }

  /**
   * Dispatches Community Feedback submission:
   * 1. Internal alert to PaperWorking team with full user context, route, and error details.
   * 2. User receipt confirming their idea/bug/feature request.
   */
  async sendFeedbackNotification(options: {
    kind: 'idea' | 'bug' | 'feature_request';
    title: string;
    description: string;
    userEmail: string;
    userName?: string;
    userTier?: string;
    route?: string;
    errorContext?: string;
  }): Promise<{ userReceipt: SendGridDispatchResult; teamAlert: SendGridDispatchResult }> {
    const kindLabels = {
      idea: 'Product Idea / Improvement',
      bug: 'Bug Report',
      feature_request: 'Feature Request',
    };
    const readableKind = kindLabels[options.kind] || 'Feedback';

    // 1. Team Notification
    const teamAlert = await this.send({
      to: { email: AVA_CONFIG.supportEmail, name: 'PaperWorking Product Team' },
      subject: `[Community ${readableKind}] ${options.title} (${options.userTier || 'User'})`,
      text: `New ${readableKind} submitted via ${AVA_CONFIG.agentName} Copilot:

From: ${options.userName || 'Anonymous'} <${options.userEmail}>
Tier: ${options.userTier || 'Investor'}
Route: ${options.route || '/'}

Summary:
${options.title}

Details:
${options.description}

${options.errorContext ? `Technical / Error Context:\n${options.errorContext}` : ''}
`,
    });

    // 2. User Receipt
    const userReceipt = await this.send({
      to: { email: options.userEmail, name: options.userName },
      subject: `We received your ${readableKind.toLowerCase()}: "${options.title}"`,
      text: `Hi ${options.userName || 'there'},

Thank you for contributing to the PaperWorking community. Your ${readableKind.toLowerCase()} has been logged and shared directly with our product team.

Summary: ${options.title}

We review community feedback weekly and use it directly to prioritize our product roadmap.

Warm regards,
${AVA_CONFIG.agentName} & the PaperWorking Team
`,
    });

    return { userReceipt, teamAlert };
  }

  /**
   * Dispatches Callback Request:
   * 1. Internal alert with transcript and tier urgency flag.
   * 2. User receipt with response expectation.
   */
  async sendCallbackRequest(options: {
    name: string;
    phone: string;
    email: string;
    preferredWindow: string;
    topic: string;
    userTier: string;
    transcript?: string;
  }): Promise<{ userReceipt: SendGridDispatchResult; teamAlert: SendGridDispatchResult }> {
    const isPriority = options.userTier === 'investment_team' || options.userTier === 'admin';
    const slaText = isPriority
      ? 'Priority Closing Desk: A dedicated team member will call you within 15 minutes.'
      : 'Business hours desk: We will call you during your requested window tomorrow between 9:00 AM – 6:00 PM EST.';

    // 1. Internal Team Alert
    const teamAlert = await this.send({
      to: { email: AVA_CONFIG.supportEmail, name: 'PaperWorking Support Desk' },
      subject: `${isPriority ? '[URGENT PRIORITY DESK] ' : ''}Callback Request: ${options.name} (${options.userTier})`,
      text: `Callback requested via ${AVA_CONFIG.agentName}:

Contact: ${options.name}
Phone: ${options.phone}
Email: ${options.email}
Account Tier: ${options.userTier} ${isPriority ? '★ PRIORITY SUBSCRIBER' : ''}
Preferred Window: ${options.preferredWindow}
Topic: ${options.topic}

--- Chat Transcript Context ---
${options.transcript || 'No prior transcript provided.'}
`,
    });

    // 2. User Receipt
    const userReceipt = await this.send({
      to: { email: options.email, name: options.name },
      subject: `PaperWorking Callback Confirmation: ${options.preferredWindow}`,
      text: `Hi ${options.name},

We've received your request for a phone callback regarding "${options.topic}".

${slaText}

Callback details:
- Phone: ${options.phone}
- Requested Window: ${options.preferredWindow}

If this is an immediate mid-closing emergency, Investment Team members can also call our priority line directly at 1-800-555-0199.

Warm regards,
${AVA_CONFIG.agentName} & the PaperWorking Team
`,
    });

    return { userReceipt, teamAlert };
  }
}

export const sendGridService = new SendGridService();
