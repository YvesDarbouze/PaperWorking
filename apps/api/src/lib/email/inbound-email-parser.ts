export function stripQuotedHistoryAndSignatures(text: string): string {
  if (!text) return '';

  const lines = text.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('>')) break;

    if (
      /^on\s+.*wrote:$/i.test(trimmed) ||
      /^from:\s+/i.test(trimmed) ||
      /^to:\s+/i.test(trimmed) ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('_____') ||
      /^sent\s+from\s+my/i.test(trimmed)
    ) {
      break;
    }

    if (
      trimmed === '--' ||
      trimmed === 'Regards,' ||
      trimmed === 'Thanks,' ||
      trimmed === 'Sincerely,' ||
      trimmed === 'Best regards,' ||
      trimmed === 'Best,'
    ) {
      break;
    }

    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
}

export type DealThreadEventType =
  | 'INVITE_SENT'
  | 'INTEREST_EXPRESSED'
  | 'DECLINED'
  | 'OWNER_MESSAGE'
  | 'INBOUND_EMAIL_REPLY';

export interface DealThreadEvent {
  id: string;
  dealId: string;
  dealSlug: string;
  eventType: DealThreadEventType;
  senderName: string;
  senderEmail: string;
  timestamp: string;
  content: string;
  badgeLabel?: string;
  metadata?: {
    token?: string;
    viaEmail?: boolean;
    [key: string]: unknown;
  };
}

export interface InboundEmailPayload {
  From: string;
  Subject?: string;
  TextBody?: string;
  To?: string;
  MailboxHash?: string;
  MessageID?: string;
}

export function parseInboundEmailPayload(
  payload: InboundEmailPayload,
): { success: boolean; event?: DealThreadEvent; error?: string } {
  if (!payload?.From) {
    return { success: false, error: 'Missing From header in email payload.' };
  }

  let token: string | null = null;
  const recipient = payload.To || '';
  const match = recipient.match(/reply\+([a-zA-Z0-9_-]+)@/);
  if (match) {
    token = match[1];
  } else if (payload.MailboxHash) {
    token = payload.MailboxHash;
  }

  const cleanedBody = stripQuotedHistoryAndSignatures(payload.TextBody || '');
  const senderEmail = payload.From.toLowerCase().trim();
  const senderName = payload.From.split('@')[0];

  const event: DealThreadEvent = {
    id: `msg_email_${Date.now()}`,
    dealId: 'deal_inbound',
    dealSlug: 'deal_inbound',
    eventType: 'INBOUND_EMAIL_REPLY',
    senderName,
    senderEmail,
    timestamp: new Date().toISOString(),
    content: cleanedBody || '(No message body)',
    badgeLabel: 'via Email',
    metadata: {
      token: token || undefined,
      viaEmail: true,
    },
  };

  return { success: true, event };
}

export interface AbuseCounterState {
  bounceCount?: number;
  complaintCount?: number;
  invitationSuspended?: boolean;
}

export interface AbuseUpdateResult {
  userUpdates: Record<string, unknown>;
  operatorAlert?: {
    type: string;
    userId: string;
    details: string;
  };
}

/**
 * Computes Firestore user updates for bounce/complaint abuse thresholds.
 */
export function computeAbuseUserUpdates(
  status: 'Bounced' | 'Failed',
  userData: AbuseCounterState,
  senderUid: string,
): AbuseUpdateResult {
  const userUpdates: Record<string, unknown> = {};

  if (status === 'Bounced') {
    const newBounces = (userData.bounceCount ?? 0) + 1;
    userUpdates.bounceCount = newBounces;

    if (newBounces >= 5) {
      userUpdates.invitationSuspended = true;
      userUpdates.suspensionReason = 'EXCESSIVE_BOUNCES';
      return {
        userUpdates,
        operatorAlert: {
          type: 'SUSPENSION_ALERT',
          userId: senderUid,
          details: `Lead Investor invitation privileges suspended automatically due to SendGrid bounces (${newBounces} bounces).`,
        },
      };
    }
  } else {
    const newComplaints = (userData.complaintCount ?? 0) + 1;
    userUpdates.complaintCount = newComplaints;

    if (newComplaints >= 2) {
      userUpdates.invitationSuspended = true;
      userUpdates.suspensionReason = 'USER_COMPLAINT';
      return {
        userUpdates,
        operatorAlert: {
          type: 'SUSPENSION_ALERT',
          userId: senderUid,
          details: `Lead Investor invitation privileges suspended automatically due to SendGrid spam complaints (${newComplaints} complaints).`,
        },
      };
    }
  }

  return { userUpdates };
}
