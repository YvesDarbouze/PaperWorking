import { SendGridEmailAdapter } from '@/lib/email/adapters/SendGridEmailAdapter';
import { ResendEmailAdapter } from '@/lib/email/adapters/ResendEmailAdapter';
import { MockEmailAdapter } from '@/lib/email/adapters/MockEmailAdapter';
import { getEmailProvider } from '@/lib/email/getEmailProvider';

// Save original env
const ORIGINAL_ENV = process.env;

describe('SendGrid & System Email Provider Integration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EMAIL_PROVIDER;
    delete process.env.SYSTEM_EMAIL_PROVIDER;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.RESEND_API_KEY;
    // @ts-ignore
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('SendGridEmailAdapter', () => {
    it('successfully dispatches email via SendGrid API v3 (202 Accepted)', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key';
      process.env.SENDGRID_FROM_EMAIL = 'notifications@paperworking.co';

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
        subject: 'Phase Advanced',
        html: '<p>Project phase advanced to Phase 2</p>',
        text: 'Project phase advanced to Phase 2',
        replyTo: 'support@paperworking.co',
        tags: [{ name: 'projectId', value: 'proj_123' }],
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
      expect(callBody.from).toEqual({ email: 'notifications@paperworking.co' });
      expect(callBody.subject).toBe('Phase Advanced');
      expect(callBody.reply_to).toEqual({ email: 'support@paperworking.co' });
      expect(callBody.custom_args).toEqual({ projectId: 'proj_123' });
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
        subject: 'Test Subject',
        html: '<p>Test</p>',
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
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.messageId).toContain('mock_sg_');
    });
  });

  describe('getEmailProvider Factory', () => {
    it('returns SendGridEmailAdapter when EMAIL_PROVIDER=sendgrid', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      const provider = getEmailProvider();
      expect(provider).toBeInstanceOf(SendGridEmailAdapter);
      expect(provider.name).toBe('sendgrid');
    });

    it('returns ResendEmailAdapter when EMAIL_PROVIDER=resend', () => {
      process.env.EMAIL_PROVIDER = 'resend';
      const provider = getEmailProvider();
      expect(provider).toBeInstanceOf(ResendEmailAdapter);
      expect(provider.name).toBe('resend');
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

    it('auto-detects Resend when RESEND_API_KEY is present and SendGrid is missing', () => {
      process.env.RESEND_API_KEY = 're_auto_detect';
      const provider = getEmailProvider();
      expect(provider).toBeInstanceOf(ResendEmailAdapter);
    });

    it('defaults to MockEmailAdapter when no keys or providers are specified', () => {
      const provider = getEmailProvider();
      expect(provider).toBeInstanceOf(MockEmailAdapter);
      expect(provider.name).toBe('mock');
    });
  });
});
