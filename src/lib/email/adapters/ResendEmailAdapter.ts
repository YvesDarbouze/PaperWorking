import { IEmailProvider, EmailDispatchPayload, EmailDispatchResult } from '../emailProvider';

/**
 * Resend Email Adapter — Real Resend API Implementation
 *
 * Dispatches emails via POST https://api.resend.com/emails
 * Requires RESEND_API_KEY environment variable.
 */
export class ResendEmailAdapter implements IEmailProvider {
  readonly name = 'resend' as const;

  async sendEmail(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      const mockId = `mock_resend_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.warn(
        '[ResendEmailAdapter] ⚠️ RESEND_API_KEY is missing — falling back to mock dispatch.\n' +
          `  To: ${payload.to.join(', ')}\n` +
          `  Subject: ${payload.subject}`
      );
      return {
        success: true,
        messageId: mockId,
        mock: true,
        provider: 'resend',
      };
    }

    const defaultFrom = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.co';
    const fromEmail = payload.from || defaultFrom;

    const body = {
      from: fromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.text && { text: payload.text }),
      ...(payload.replyTo && { reply_to: payload.replyTo }),
      ...(payload.tags && { tags: payload.tags }),
    };

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        const errorMessage = `Resend API error (${res.status}): ${errorText}`;
        console.error(`[ResendEmailAdapter] ❌ ${errorMessage}`);

        return {
          success: false,
          messageId: '',
          mock: false,
          provider: 'resend',
          error: errorMessage,
        };
      }

      const data = await res.json();
      return {
        success: true,
        messageId: data.id,
        mock: false,
        provider: 'resend',
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown network error';
      console.error('[ResendEmailAdapter] ❌ Network error dispatching email:', errorMessage);
      return {
        success: false,
        messageId: '',
        mock: false,
        provider: 'resend',
        error: errorMessage,
      };
    }
  }
}
