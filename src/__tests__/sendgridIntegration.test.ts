import { SendGridEmailAdapter } from '@/lib/email/adapters/SendGridEmailAdapter';
import { MockEmailAdapter } from '@/lib/email/adapters/MockEmailAdapter';
import { getEmailProvider } from '@/lib/email/getEmailProvider';

// Save original env
const ORIGINAL_ENV = process.env;

describe('SendGrid & System Email Provider Integration (EM Series v2)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EMAIL_PROVIDER;
    delete process.env.SYSTEM_EMAIL_PROVIDER;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.EMAIL_GLOBAL_KILL_SWITCH;
    // @ts-expect-error - mock global.fetch in Jest
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('SendGridEmailAdapter', () => {
    it('successfully dispatches email via SendGrid API v3 (202 Accepted, F-3 ordering, F-13 zero PII)', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key';
      process.env.SENDGRID_FROM_EMAIL = 'notifications@mail.paperworking.co';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 202,
        headers: new Headers({
          'x-message-id': 'sg_msg_unique_123',
        }),
      });

      const adapter = new SendGridEmailAdapter();
      const result = await adapter.sendEmail({
        to: ['investor@example.com'],
        from: 'notifications@mail.paperworking.co',
        subject: 'Phase Advanced',
        html: '<p>Project phase advanced to Phase 2</p>',
        text: 'Project phase advanced to Phase 2',
        replyTo: 'hi@paperworking.co',
        templateKey: 'PROD-ACT-PHASE-ADVANCE',
        messageClass: 'O',
        sendRecordId: 'sr_12345',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sg_msg_unique_123');
      expect(result.mock).toBe(false);
      expect(result.provider).toBe('sendgrid');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/mail/send',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer SG.test_key',
            'Content-Type': 'application/json',
          },
        })
      );

      // Verify payload structure sent to SendGrid
      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.personalizations).toEqual([{ to: [{ email: 'investor@example.com' }] }]);
      expect(callBody.from).toEqual({ email: 'notifications@mail.paperworking.co' });
      expect(callBody.subject).toBe('Phase Advanced');
      expect(callBody.reply_to).toEqual({ email: 'hi@paperworking.co' });

      // F-3: Plain text MUST precede HTML
      expect(callBody.content[0].type).toBe('text/plain');
      expect(callBody.content[1].type).toBe('text/html');

      // F-13: Zero PII in custom_args
      expect(callBody.custom_args).toEqual({
        send_record_id: 'sr_12345',
        template_key: 'PROD-ACT-PHASE-ADVANCE',
        message_class: 'O',
      });

      // F-5: bypass_list_management is strictly NOT present
      expect(callBody.mail_settings?.bypass_list_management).toBeUndefined();
    });

    it('enforces bypass_unsubscribe_management ONLY for Class E (F-5)', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key';
      process.env.SENDGRID_FROM_EMAIL = 'security@mail.paperworking.co';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 202,
        headers: new Headers({
          'x-message-id': 'sg_msg_class_e',
        }),
      });

      const adapter = new SendGridEmailAdapter();
      const result = await adapter.sendEmail({
        to: ['user@example.com'],
        from: 'security@mail.paperworking.co',
        subject: 'Security Alert',
        html: '<p>Security Alert</p>',
        text: 'Security Alert',
        templateKey: 'ACCT-SECURITY-OTP',
        messageClass: 'E',
      });

      expect(result.success).toBe(true);
      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.mail_settings?.bypass_unsubscribe_management).toEqual({ enable: true });
      expect(callBody.mail_settings?.bypass_list_management).toBeUndefined();
    });

    it('halts outbound email when EMAIL_GLOBAL_KILL_SWITCH is enabled', async () => {
      process.env.EMAIL_GLOBAL_KILL_SWITCH = 'true';
      process.env.SENDGRID_API_KEY = 'SG.test_key';

      const adapter = new SendGridEmailAdapter();
      const result = await adapter.sendEmail({
        to: ['user@example.com'],
        from: 'security@mail.paperworking.co',
        subject: 'Security Alert',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('GLOBAL_KILL_SWITCH_ACTIVE');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles SendGrid API error responses gracefully', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid recipient address',
      });

      const adapter = new SendGridEmailAdapter();
      const result = await adapter.sendEmail({
        to: ['invalid-email'],
        from: 'notifications@mail.paperworking.co',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.mock).toBe(false);
      expect(result.provider).toBe('sendgrid');
      expect(result.error).toContain('SendGrid API error (400): Invalid recipient address');
    });

    it('falls back to mock response when SENDGRID_API_KEY is missing', async () => {
      delete process.env.SENDGRID_API_KEY;

      const adapter = new SendGridEmailAdapter();
      const result = await adapter.sendEmail({
        to: ['investor@example.com'],
        from: 'notifications@mail.paperworking.co',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.messageId).toContain('mock_sg_');
    });
  });

  describe('getEmailProvider Factory (Gate E-1)', () => {
    it('returns SendGridEmailAdapter when EMAIL_PROVIDER=sendgrid', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      const provider = getEmailProvider();
      expect(provider).toBeInstanceOf(SendGridEmailAdapter);
      expect(provider.name).toBe('sendgrid');
    });

    it('returns MockEmailAdapter when EMAIL_PROVIDER=mock', () => {
      process.env.EMAIL_PROVIDER = 'mock';
      const provider = getEmailProvider();
      expect(provider).toBeInstanceOf(MockEmailAdapter);
      expect(provider.name).toBe('mock');
    });

    it('auto-detects SendGrid when SENDGRID_API_KEY is present', () => {
      process.env.SENDGRID_API_KEY = 'SG.auto_detect';
      const provider = getEmailProvider();
      expect(provider).toBeInstanceOf(SendGridEmailAdapter);
    });

    it('defaults to MockEmailAdapter when no keys or providers are specified', () => {
      const provider = getEmailProvider();
      expect(provider).toBeInstanceOf(MockEmailAdapter);
      expect(provider.name).toBe('mock');
    });
  });
});
