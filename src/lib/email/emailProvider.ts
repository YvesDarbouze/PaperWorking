/**
 * PaperWorking — System Email Provider Interface & Types
 *
 * Provides a vendor-agnostic abstraction for sending transactional system emails.
 * Adapters implement this interface for SendGrid, Resend, and Mock delivery.
 */

export interface EmailDispatchPayload {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  metadata?: Record<string, any>;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  mock: boolean;
  provider: 'sendgrid' | 'resend' | 'mock';
  error?: string;
}

export interface IEmailProvider {
  name: 'sendgrid' | 'resend' | 'mock';
  sendEmail(payload: EmailDispatchPayload): Promise<EmailDispatchResult>;
}
