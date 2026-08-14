import { IEmailProvider, EmailDispatchPayload, EmailDispatchResult } from '../emailProvider';

/**
 * SendGrid Email Adapter — Real SendGrid API v3 Implementation
 *
 * Dispatches emails via POST https://api.sendgrid.com/v3/mail/send
 * Requires SENDGRID_API_KEY environment variable.
 */
export class SendGridEmailAdapter implements IEmailProvider {
  readonly name = 'sendgrid' as const;

  async sendEmail(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      const mockId = `mock_sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.warn(
        '[SendGridEmailAdapter] ⚠️ SENDGRID_API_KEY is missing — falling back to mock dispatch.\n' +
          `  To: ${payload.to.join(', ')}\n` +
          `  Subject: ${payload.subject}`
      );
      return {
        success: true,
        messageId: mockId,
        mock: true,
        provider: 'sendgrid',
      };
    }

    const defaultFrom =
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      'notifications@paperworking.co';
    const fromEmail = payload.from || defaultFrom;

    const body: Record<string, any> = {
      personalizations: [
        {
          to: payload.to.map((email) => ({ email })),
        },
      ],
      from: { email: fromEmail },
      subject: payload.subject,
      content: [
        {
          type: 'text/html',
          value: payload.html,
        },
      ],
    };

    if (payload.text) {
      body.content.unshift({
        type: 'text/plain',
        value: payload.text,
      });
    }

    if (payload.replyTo) {
      body.reply_to = { email: payload.replyTo };
    }

    if (payload.tags && payload.tags.length > 0) {
      body.custom_args = payload.tags.reduce((acc, tag) => {
        acc[tag.name] = tag.value;
        return acc;
      }, {} as Record<string, string>);
    }

    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        const errorMessage = `SendGrid API error (${res.status}): ${errorText}`;
        console.error(`[SendGridEmailAdapter] ❌ ${errorMessage}`);

        this.emitTelemetry('system_email_send_failed', {
          provider: 'sendgrid',
          error: errorMessage,
          recipientCount: payload.to.length,
          subject: payload.subject,
        });

        return {
          success: false,
          messageId: '',
          mock: false,
          provider: 'sendgrid',
          error: errorMessage,
        };
      }

      // SendGrid returns 202 Accepted. The message ID is in the X-Message-Id header.
      const headerMsgId = res.headers.get('x-message-id');
      const messageId =
        headerMsgId || `sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      this.emitTelemetry('system_email_sent', {
        provider: 'sendgrid',
        messageId,
        recipientCount: payload.to.length,
        subject: payload.subject,
      });

      return {
        success: true,
        messageId,
        mock: false,
        provider: 'sendgrid',
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown network error';
      console.error('[SendGridEmailAdapter] ❌ Network error dispatching email:', errorMessage);

      this.emitTelemetry('system_email_send_failed', {
        provider: 'sendgrid',
        error: errorMessage,
        recipientCount: payload.to.length,
        subject: payload.subject,
      });

      return {
        success: false,
        messageId: '',
        mock: false,
        provider: 'sendgrid',
        error: errorMessage,
      };
    }
  }

  private emitTelemetry(event: string, properties: Record<string, any>) {
    try {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (posthogKey && typeof fetch !== 'undefined') {
        fetch('https://app.posthog.com/capture/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: posthogKey,
            event,
            properties: {
              ...properties,
              distinct_id: properties.distinct_id || 'system_email_provider',
            },
          }),
        }).catch(() => {});
      }
    } catch {
      // Fire-and-forget telemetry failure shouldn't affect core execution
    }
  }
}
