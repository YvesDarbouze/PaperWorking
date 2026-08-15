/**
 * PaperWorking — System Email Provider Interface & Types (EM Series v2)
 *
 * Provides a vendor-agnostic abstraction for sending transactional system emails.
 * Adapters implement this interface for SendGrid and Mock delivery per Gate E-1.
 */

export interface EmailTag {
  name: string;
  value: string;
}

export interface EmailDispatchPayload {
  to: string[];
  subject: string;
  html: string;
  text: string; // Plain-text is mandatory (F-3, Rule 6)
  from?: string; // Must be @mail.paperworking.co (F-2)
  replyTo?: string; // Monitored hi@paperworking.co or masked relay (E-3, E-7)
  templateKey?: string; // Canonical catalog key (§4)
  category?: string; // Coarse category tag (F-12)
  messageClass?: 'E' | 'O' | 'C'; // Essential, Optional, Commercial (§4)
  sendRecordId?: string; // Opaque send record ID for custom_args (F-13)
  asmGroupId?: number; // SendGrid Unsubscribe Group ID (F-6)
  asmGroupsToDisplay?: number[]; // Groups to display (F-6)
  listUnsubscribeHeader?: string; // RFC 8058 List-Unsubscribe header (F-8)
  listUnsubscribePostHeader?: string; // RFC 8058 List-Unsubscribe-Post header (F-8)
  sandboxMode?: boolean; // CI sandbox mode (F-4)
  idempotencyKey?: string; // Event-derived deduplication key
  tags?: EmailTag[];
  metadata?: Record<string, unknown>;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  mock: boolean;
  provider: 'sendgrid' | 'mock';
  acceptedAt?: string;
  error?: string;
}

export interface IEmailProvider {
  name: 'sendgrid' | 'mock';
  sendEmail(payload: EmailDispatchPayload): Promise<EmailDispatchResult>;
}
