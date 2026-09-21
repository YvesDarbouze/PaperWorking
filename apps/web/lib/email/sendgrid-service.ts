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

export type RecipientInput = string | SendGridMailRecipient;

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
      email: process.env.SENDGRID_FROM_EMAIL || 'no_reply@paperworking.co',
      name: `${AVA_CONFIG.agentName} from PaperWorking`,
    };
  }

  /**
   * Dispatches email with exponential backoff for transient failures (429, 5xx).
   */
  async send(
    payload: Omit<SendGridMailPayload, 'to' | 'from' | 'replyTo'> & {
      to: RecipientInput | RecipientInput[];
      from?: RecipientInput;
      replyTo?: RecipientInput;
    },
    maxRetries = 3,
  ): Promise<SendGridDispatchResult> {
    if (!payload.to || (Array.isArray(payload.to) && payload.to.length === 0)) {
      throw new SendGridPayloadError('Email must specify at least one "to" recipient.');
    }
    if (!payload.subject?.trim()) {
      throw new SendGridPayloadError('Email must specify a valid subject.');
    }
    if (!payload.text?.trim() && !payload.html?.trim()) {
      throw new SendGridPayloadError('Email must include text or HTML content.');
    }

    const isMockKey =
      !this.apiKey ||
      this.apiKey.startsWith('mock-') ||
      this.apiKey === 'AIzaSyFakeKeyForLocalEmulatorTesting000';
    if (process.env.NODE_ENV === 'production' && isMockKey) {
      throw new SendGridAuthError('SENDGRID_API_KEY is required in production');
    }
    const isTestEnv = process.env.NODE_ENV === 'test' || isMockKey;

    // In mock/test/CI mode: record in inspection buffer and return success
    const normalizeRecipient = (r: RecipientInput): SendGridMailRecipient => {
      if (typeof r === 'string') return { email: r };
      return { email: r.email, ...(r.name ? { name: r.name } : {}) };
    };

    const toRecipients = (Array.isArray(payload.to) ? payload.to : [payload.to]).map(normalizeRecipient);
    const fromRecipient = payload.from ? normalizeRecipient(payload.from) : this.defaultFrom;
    const replyToRecipient = payload.replyTo ? normalizeRecipient(payload.replyTo) : undefined;

    if (isTestEnv) {
      sentEmailsForTesting.push({
        ...payload,
        to: toRecipients,
        from: fromRecipient,
        replyTo: replyToRecipient,
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
                to: toRecipients,
              },
            ],
            from: fromRecipient,
            ...(replyToRecipient ? { reply_to: replyToRecipient } : {}),
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
   * Dispatches Community Feedback / Bug Report / Feature Request:
   * 1. Internal alert to PaperWorking team (hi@paperworking.co) with full user context, route, diagnostics, and ticket ID.
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
    ticketId?: string;
    severity?: string;
    module?: string;
    reilPhase?: string;
    diagnosticsSummary?: string;
    hasAttachment?: boolean;
    attachmentName?: string;
  }): Promise<{ userReceipt: SendGridDispatchResult; teamAlert: SendGridDispatchResult }> {
    const kindLabels = {
      idea: 'Product Idea / Improvement',
      bug: 'Bug Report',
      feature_request: 'Feature Request',
    };
    const readableKind = kindLabels[options.kind] || 'Feedback';
    const ticketTag = options.ticketId ? `[${options.ticketId}] ` : '';
    const severityTag = options.severity ? `[${options.severity.toUpperCase()}] ` : '';

    // 1. Team Notification to hi@paperworking.co
    const internalAlertEmail = process.env.SUPPORT_INTERNAL_EMAIL || 'hi@paperworking.co';
    const teamAlert = await this.send({
      to: { email: internalAlertEmail, name: 'PaperWorking Product Team' },
      subject: `${ticketTag}${severityTag}[Community ${readableKind}] ${options.title} (${options.userTier || 'User'})`,
      text: `New ${readableKind} submitted via ${AVA_CONFIG.agentName} Copilot:

Ticket ID: ${options.ticketId || 'N/A'}
From: ${options.userName || 'Anonymous'} <${options.userEmail}>
Account Tier: ${options.userTier || 'Investor'}
Route: ${options.route || '/'}
${options.module ? `Affected Workspace/Module: ${options.module}\n` : ''}${options.reilPhase ? `REIL Phase: ${options.reilPhase}\n` : ''}${options.severity ? `Severity: ${options.severity.toUpperCase()}\n` : ''}${options.hasAttachment ? `Media Attachment Attached: Yes (${options.attachmentName || 'screenshot/video'})\n` : ''}
Summary:
${options.title}

Details:
${options.description}

${options.diagnosticsSummary ? `--- Automated System Diagnostics ---\n${options.diagnosticsSummary}\n` : ''}${options.errorContext ? `--- Error / Technical Logs ---\n${options.errorContext}\n` : ''}`,
    });

    // 2. User Receipt
    const dinnerPledge = options.kind === 'feature_request'
      ? '\n🍽️ Dinner Guarantee: PaperWorking was designed to reduce risk for investors. If we develop your feature request, we will buy you dinner!\n'
      : '';

    const userReceipt = await this.send({
      to: { email: options.userEmail, name: options.userName },
      subject: `${ticketTag}We received your ${readableKind.toLowerCase()}: "${options.title}"`,
      text: `Hi ${options.userName || 'there'},

Thank you for contributing to the PaperWorking community. Your ${readableKind.toLowerCase()} has been logged and shared directly with our product team.
${options.ticketId ? `Your Tracking Ticket ID: ${options.ticketId}\n` : ''}
Summary: ${options.title}
${options.module ? `Workspace/Module: ${options.module}\n` : ''}${options.severity ? `Severity: ${options.severity}\n` : ''}${dinnerPledge}
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

  /**
   * Dispatches an official staff reply email to a user from no_reply@paperworking.co
   * quoting their ticket ID and subject.
   */
  async sendTicketStaffReply(params: {
    ticketId: string;
    ticketSubject: string;
    userEmail: string;
    userName?: string;
    adminName: string;
    replyContent: string;
  }): Promise<SendGridDispatchResult> {
    const greeting = params.userName ? `Hello ${params.userName},` : 'Hello,';
    const text = `${greeting}

Our operations team has updated your ticket [${params.ticketId}]:

"${params.replyContent}"

— ${params.adminName}
PaperWorking Customer Operations
https://paperworking.co
`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <div style="border-bottom: 2px solid #00DD94; padding-bottom: 12px; margin-bottom: 20px;">
          <span style="font-size: 20px; font-weight: 700; color: #111; letter-spacing: -0.02em;">PaperWorking</span>
          <span style="font-size: 12px; font-weight: 600; color: #666; margin-left: 8px; text-transform: uppercase;">Ticket Update</span>
        </div>
        <p style="font-size: 15px; line-height: 1.5; margin-bottom: 12px;">${greeting}</p>
        <p style="font-size: 15px; line-height: 1.5; color: #333; margin-bottom: 16px;">
          Our team has updated your ticket <strong>[${params.ticketId}] ${params.ticketSubject}</strong>:
        </p>
        <div style="background-color: #f7f7f8; border-left: 4px solid #00DD94; padding: 16px; margin: 20px 0; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #111; white-space: pre-wrap;">${params.replyContent}</div>
        <p style="font-size: 13px; color: #555; margin-top: 24px;">
          — <strong>${params.adminName}</strong><br/>
          PaperWorking Customer Operations
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 11px; color: #888; margin: 0;">
          This email was sent from no_reply@paperworking.co regarding PaperWorking Ticket ${params.ticketId}.
        </p>
      </div>
    `;

    return this.send({
      to: { email: params.userEmail, name: params.userName },
      from: { email: process.env.SENDGRID_FROM_EMAIL || 'no_reply@paperworking.co', name: 'PaperWorking Support' },
      subject: `Update on Ticket [${params.ticketId}]: ${params.ticketSubject}`,
      text,
      html,
    });
  }
}

export const sendGridService = new SendGridService();
