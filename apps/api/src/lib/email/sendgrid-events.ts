export type EmailStatus = 'Sent' | 'Delivered' | 'Opened' | 'Clicked' | 'Bounced' | 'Failed';

export const SENDGRID_EVENT_STATUS_MAP: Record<string, EmailStatus> = {
  processed: 'Sent',
  deferred: 'Sent',
  delivered: 'Delivered',
  open: 'Opened',
  click: 'Clicked',
  bounce: 'Bounced',
  dropped: 'Bounced',
  spamreport: 'Failed',
  group_unsubscribe: 'Failed',
};

export interface SendGridWebhookEvent {
  event?: string;
  sg_message_id?: string;
  message_id?: string;
  'smtp-id'?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export function mapSendGridEventType(eventType: string): EmailStatus | null {
  return SENDGRID_EVENT_STATUS_MAP[eventType] ?? null;
}

export function extractSendGridMessageId(event: SendGridWebhookEvent): string {
  const rawMsgId = event.sg_message_id || event.message_id || event['smtp-id'] || '';
  return typeof rawMsgId === 'string' ? rawMsgId.split('.')[0] : '';
}

export function parseSendGridWebhookPayload(rawBody: string): SendGridWebhookEvent[] {
  const parsed = JSON.parse(rawBody) as unknown;
  if (Array.isArray(parsed)) return parsed as SendGridWebhookEvent[];
  if (parsed && typeof parsed === 'object') return [parsed as SendGridWebhookEvent];
  return [];
}

export function eventTimestamp(event: SendGridWebhookEvent): Date {
  return typeof event.timestamp === 'number'
    ? new Date(event.timestamp * 1000)
    : new Date();
}
