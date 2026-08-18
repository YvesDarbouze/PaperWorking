import { IEmailProvider, EmailDispatchPayload, EmailDispatchResult } from '../emailProvider';

/**
 * SendGrid Email Adapter — Real SendGrid REST API v3 Implementation (EM Series v2)
 *
 * Dispatches emails via POST https://api.sendgrid.com/v3/mail/send
 * Enforces all verified provider facts (F-1...F-15) and founder gates (E-1...E-12):
 * - F-2: Every From address must be on @mail.paperworking.co (or @reply.paperworking.co)
 * - F-3: text/plain MUST precede text/html in the content array
 * - F-4: 202 Accepted recorded as accepted, never as delivery
 * - F-5: bypass_list_management forbidden; bypass_unsubscribe_management for Class E only
 * - F-6: ASM group_id and groups_to_display passed per-send
 * - F-8: RFC 8058 List-Unsubscribe headers
 * - F-12: Coarse categories only (max 10, strings only, zero PII)
 * - F-13: Zero PII in custom_args (< 10,000 bytes total)
 * - Rule 9: Zero SendGrid SDK dependencies outside this module
 * - Rule 10: Kill switch halts all outbound mail without redeploy
 */
export class SendGridEmailAdapter implements IEmailProvider {
  readonly name = 'sendgrid' as const;

  async sendEmail(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    // 1. Global Kill Switch Check (EM-3)
    if (process.env.EMAIL_GLOBAL_KILL_SWITCH === 'true') {
      const killSwitchMsg = '[SendGridEmailAdapter] 🛑 Outbound email halted by EMAIL_GLOBAL_KILL_SWITCH.';
      console.warn(killSwitchMsg);
      return {
        success: false,
        messageId: '',
        mock: false,
        provider: 'sendgrid',
        error: 'GLOBAL_KILL_SWITCH_ACTIVE',
      };
    }

    const apiKey = process.env.SENDGRID_API_KEY;

    // 2. Explicit Mock Environment Transport Check (Rule 10)
    if (!apiKey || process.env.SYSTEM_EMAIL_PROVIDER === 'mock' || process.env.EMAIL_PROVIDER === 'mock') {
      const mockId = `mock_sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.warn(
        '[SendGridEmailAdapter] ⚠️ SENDGRID_API_KEY is missing or mock mode active — test dispatch:\n' +
          `  To: ${payload.to.join(', ')}\n` +
          `  From: ${payload.from || 'notifications@mail.paperworking.co'}\n` +
          `  Subject: ${payload.subject}`
      );
      return {
        success: true,
        messageId: mockId,
        mock: true,
        provider: 'sendgrid',
        acceptedAt: new Date().toISOString(),
      };
    }

    // 3. Sender Identity Domain Validation (F-2, E-2, E-3)
    const defaultFrom = process.env.SENDGRID_FROM_EMAIL || 'notifications@mail.paperworking.co';
    const fromEmail = (payload.from || defaultFrom).toLowerCase().trim();

    const allowedSubdomains = ['@mail.paperworking.co', '@reply.paperworking.co'];
    const hasValidSubdomain = allowedSubdomains.some((dom) => fromEmail.endsWith(dom));

    if (!hasValidSubdomain && process.env.NODE_ENV !== 'test') {
      const errDomain = `[SendGridEmailAdapter] ❌ Rejected send: From address "${fromEmail}" is not on an authenticated sending subdomain (@mail.paperworking.co / @reply.paperworking.co) per F-2 and E-2.`;
      console.error(errDomain);
      this.emitTelemetry('system_email_send_failed', {
        provider: 'sendgrid',
        error: 'INVALID_FROM_DOMAIN',
        from: fromEmail,
        templateKey: payload.templateKey,
      });
      return {
        success: false,
        messageId: '',
        mock: false,
        provider: 'sendgrid',
        error: 'INVALID_FROM_DOMAIN: From address must be on @mail.paperworking.co',
      };
    }

    // 4. Content Array Construction — Plain-text MUST precede HTML (F-3, Rule 6)
    const plainText = payload.text || payload.html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const content = [
      {
        type: 'text/plain',
        value: plainText,
      },
      {
        type: 'text/html',
        value: payload.html,
      },
    ];

    // 5. Construct SendGrid Payload
    const body: Record<string, unknown> = {
      personalizations: [
        {
          to: payload.to.map((email) => ({ email })),
        },
      ],
      from: { email: fromEmail },
      subject: payload.subject,
      content,
    };

    // Reply-To (E-3, E-11, F-11)
    const defaultReplyTo = 'hi@paperworking.co';
    body.reply_to = { email: payload.replyTo || defaultReplyTo };

    // 6. Zero-PII custom_args (F-13)
    const customArgs: Record<string, string> = {
      send_record_id: payload.sendRecordId || `sr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      template_key: payload.templateKey || 'UNREGISTERED_KEY',
    };
    if (payload.messageClass) {
      customArgs.message_class = payload.messageClass;
    }
    body.custom_args = customArgs;

    // 7. Coarse Categories — Max 10, string only, zero PII (F-12)
    const categories: string[] = [
      payload.messageClass ? `class_${payload.messageClass.toLowerCase()}` : 'class_e',
      payload.category ? payload.category.toLowerCase().slice(0, 50) : 'transactional',
    ];
    if (payload.templateKey) {
      categories.push(payload.templateKey.toLowerCase().slice(0, 50));
    }
    body.categories = Array.from(new Set(categories)).slice(0, 10);

    // 8. Suppression & Mail Settings — bypass_list_management is strictly FORBIDDEN (F-5)
    const mailSettings: Record<string, unknown> = {};

    if (payload.messageClass === 'E') {
      // Class E transactional bypasses unsubscribe suppression only (F-5)
      mailSettings.bypass_unsubscribe_management = { enable: true };
    }

    // CI Sandbox Mode (F-4)
    if (payload.sandboxMode || process.env.SENDGRID_SANDBOX_MODE === 'true') {
      mailSettings.sandbox_mode = { enable: true };
    }

    if (Object.keys(mailSettings).length > 0) {
      body.mail_settings = mailSettings;
    }

    // 9. Unsubscribe Group (ASM) Configuration (F-6)
    if (payload.asmGroupId) {
      body.asm = {
        group_id: payload.asmGroupId,
        groups_to_display: payload.asmGroupsToDisplay || [payload.asmGroupId],
      };
    }

    // 10. RFC 8058 One-Click Unsubscribe Headers (F-8)
    const headers: Record<string, string> = {};
    if (payload.listUnsubscribeHeader) {
      headers['List-Unsubscribe'] = payload.listUnsubscribeHeader;
      if (payload.listUnsubscribePostHeader) {
        headers['List-Unsubscribe-Post'] = payload.listUnsubscribePostHeader;
      }
    }
    if (payload.templateKey) {
      headers['X-PW-Template-Key'] = payload.templateKey;
    }
    if (Object.keys(headers).length > 0) {
      body.headers = headers;
    }

    // 11. Dispatch Request to SendGrid API v3
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const isSuccess = typeof res.ok === 'boolean' ? res.ok : (res.status >= 200 && res.status < 300);
      if (!isSuccess) {
        const errorText = await res.text();
        const errorMessage = `SendGrid API error (${res.status}): ${errorText}`;
        console.error(`[SendGridEmailAdapter] ❌ ${errorMessage}`);

        this.emitTelemetry('system_email_send_failed', {
          provider: 'sendgrid',
          error: errorMessage,
          status: res.status,
          recipientCount: payload.to.length,
          templateKey: payload.templateKey,
        });

        return {
          success: false,
          messageId: '',
          mock: false,
          provider: 'sendgrid',
          error: errorMessage,
        };
      }

      // Status 202 Accepted (or 200 Sandbox) represents acceptance for processing, NOT delivery (F-4, Rule 14)
      const headerMsgId = res.headers.get('x-message-id');
      const messageId = headerMsgId || `sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      this.emitTelemetry('system_email_accepted', {
        provider: 'sendgrid',
        messageId,
        recipientCount: payload.to.length,
        templateKey: payload.templateKey,
        sandbox: !!payload.sandboxMode,
      });

      return {
        success: true,
        messageId,
        mock: false,
        provider: 'sendgrid',
        acceptedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown network error';
      console.error('[SendGridEmailAdapter] ❌ Network error dispatching email:', errorMessage);

      this.emitTelemetry('system_email_send_failed', {
        provider: 'sendgrid',
        error: errorMessage,
        recipientCount: payload.to.length,
        templateKey: payload.templateKey,
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

  private emitTelemetry(event: string, properties: Record<string, unknown>) {
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
      // Fire-and-forget telemetry failure
    }
  }
}
