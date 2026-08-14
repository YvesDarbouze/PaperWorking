import { IEmailProvider } from './emailProvider';
import { SendGridEmailAdapter } from './adapters/SendGridEmailAdapter';
import { ResendEmailAdapter } from './adapters/ResendEmailAdapter';
import { MockEmailAdapter } from './adapters/MockEmailAdapter';

/**
 * Factory function returning the active IEmailProvider adapter instance.
 *
 * Selection priority:
 * 1. Explicit `SYSTEM_EMAIL_PROVIDER` or `EMAIL_PROVIDER` env var ('sendgrid' | 'resend' | 'mock')
 * 2. Auto-detect `SENDGRID_API_KEY` (selects SendGrid)
 * 3. Auto-detect `RESEND_API_KEY` (selects Resend)
 * 4. Fallback to `MockEmailAdapter`
 */
export function getEmailProvider(): IEmailProvider {
  const configuredProvider = (
    process.env.SYSTEM_EMAIL_PROVIDER ||
    process.env.EMAIL_PROVIDER ||
    ''
  ).toLowerCase();

  if (configuredProvider === 'sendgrid') {
    return new SendGridEmailAdapter();
  }

  if (configuredProvider === 'resend') {
    return new ResendEmailAdapter();
  }

  if (configuredProvider === 'mock') {
    return new MockEmailAdapter();
  }

  // Auto-detection based on API key presence
  if (process.env.SENDGRID_API_KEY) {
    return new SendGridEmailAdapter();
  }

  if (process.env.RESEND_API_KEY) {
    return new ResendEmailAdapter();
  }

  return new MockEmailAdapter();
}
