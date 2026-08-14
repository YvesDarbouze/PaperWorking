import { IEmailProvider, EmailDispatchPayload, EmailDispatchResult } from '../emailProvider';

/**
 * Mock Email Adapter — Local Development & Test Transport (EM Series v2)
 *
 * Simulates system email dispatch without sending external API calls.
 */
export class MockEmailAdapter implements IEmailProvider {
  readonly name = 'mock' as const;

  async sendEmail(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    const mockId = `mock_sys_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(
      `[MockEmailAdapter] 📧 MOCK SYSTEM EMAIL DISPATCH:\n` +
        `  To: ${payload.to.join(', ')}\n` +
        `  Subject: ${payload.subject}\n` +
        `  From: ${payload.from || 'notifications@mail.paperworking.co'}\n` +
        `  Template Key: ${payload.templateKey || 'UNREGISTERED'}\n` +
        `  Message ID: ${mockId}`
    );

    return {
      success: true,
      messageId: mockId,
      mock: true,
      provider: 'mock',
      acceptedAt: new Date().toISOString(),
    };
  }
}
