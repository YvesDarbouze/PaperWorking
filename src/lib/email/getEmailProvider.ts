import { IEmailProvider } from './emailProvider';
import { SendGridEmailAdapter } from './adapters/SendGridEmailAdapter';
import { MockEmailAdapter } from './adapters/MockEmailAdapter';

/**
 * Factory function returning the active IEmailProvider adapter instance.
 *
 * Selection priority per Gate E-1:
 * 1. Explicit `SYSTEM_EMAIL_PROVIDER` or `EMAIL_PROVIDER` env var ('sendgrid' | 'mock')
 * 2. Auto-detect `SENDGRID_API_KEY` (selects SendGrid)
 * 3. Fallback to `MockEmailAdapter` for local development
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

  if (configuredProvider === 'mock') {
    return new MockEmailAdapter();
  }

  // Auto-detection based on SendGrid API key presence
  if (process.env.SENDGRID_API_KEY) {
    return new SendGridEmailAdapter();
  }

  return new MockEmailAdapter();
}
