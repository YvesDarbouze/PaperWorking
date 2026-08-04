/* ═══════════════════════════════════════════════════════
   PaperWorking — Deal History & Communications Utilities
   (PROMPT 5 — Deal History & Communications)
   ═══════════════════════════════════════════════════════ */

import { DealInvitation, DealInterest } from './engagementUtils';

/**
 * Strips quoted email reply history and standard signatures.
 */
export function stripQuotedHistoryAndSignatures(text: string): string {
  if (!text) return '';

  const lines = text.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Quoted lines starting with >
    if (trimmed.startsWith('>')) {
      break;
    }

    // 2. Standard reply headers
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

    // 3. Signature markers
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
    businessCard?: {
      displayName: string;
      email: string;
      phone?: string;
      company?: string;
    };
    amountIntent?: number;
    percentIntent?: number;
    viaEmail?: boolean;
  };
}

export interface UserDealsHistory {
  createdDeals: any[];
  invitedDeals: { deal: any; invite: DealInvitation }[];
  committedDeals: { deal: any; interest: DealInterest }[];
}

/**
 * Filters all deals into "My Deals" categories for a specific user ID and email:
 * 1. Created Deals: deals created/owned by currentUserId
 * 2. Invited Deals: deals where invitedEmail matches user email
 * 3. Committed Deals: deals where userId matches currentUserId and status is COMMITTED or WAITLIST
 */
export function filterUserDealsHistory(
  allDeals: any[],
  allInvitations: DealInvitation[],
  allInterests: DealInterest[],
  currentUserId: string,
  userEmail: string
): UserDealsHistory {
  const normalizedEmail = (userEmail || '').toLowerCase().trim();

  // 1. Created / Owned Deals
  const createdDeals = allDeals.filter(
    (deal) => deal.ownerId === currentUserId || deal.owner?.userId === currentUserId || deal.owner?.email === normalizedEmail
  );

  // 2. Invited Deals
  const invitedDeals = allInvitations
    .filter((inv) => inv.invitedEmail.toLowerCase().trim() === normalizedEmail || inv.invitedUserId === currentUserId)
    .map((invite) => {
      const deal = allDeals.find((d) => d.id === invite.dealId || d.slug === invite.dealSlug) || {
        id: invite.dealId,
        slug: invite.dealSlug,
        displayAddress: invite.dealSlug,
        status: invite.status,
      };
      return { deal, invite };
    });

  // 3. Committed Deals
  const committedDeals = allInterests
    .filter((int) => int.userId === currentUserId && (int.status === 'COMMITTED' || int.status === 'WAITLIST'))
    .map((interest) => {
      const deal = allDeals.find((d) => d.id === interest.dealId) || {
        id: interest.dealId,
        displayAddress: 'Property Address',
        status: 'LISTED',
      };
      return { deal, interest };
    });

  return {
    createdDeals,
    invitedDeals,
    committedDeals,
  };
}

/**
 * Formats a single thread event for display in the communications trail.
 */
export function formatDealThreadEvent(event: DealThreadEvent) {
  let badgeLabel = 'System Event';
  let badgeColor = 'bg-slate-500/10 text-slate-400 border-slate-500/30';

  switch (event.eventType) {
    case 'INVITE_SENT':
      badgeLabel = 'Invitation Sent';
      badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      break;
    case 'INTEREST_EXPRESSED':
      badgeLabel = 'Interest Expressed';
      badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      break;
    case 'DECLINED':
      badgeLabel = 'Invitation Declined';
      badgeColor = 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      break;
    case 'OWNER_MESSAGE':
      badgeLabel = 'Owner Message';
      badgeColor = 'bg-violet-500/10 text-violet-400 border-violet-500/30';
      break;
    case 'INBOUND_EMAIL_REPLY':
      badgeLabel = 'via Email';
      badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      break;
  }

  return {
    ...event,
    badgeLabel: event.badgeLabel || badgeLabel,
    badgeColor,
    formattedDate: new Date(event.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

/**
 * Inbound Email Webhook Payload Parser Fixture:
 * Processes raw email webhook payload, cleans body history, extracts token,
 * and formats an INBOUND_EMAIL_REPLY thread event labeled "via Email".
 */
export function parseInboundEmailPayload(payload: {
  From: string;
  Subject: string;
  TextBody: string;
  To?: string;
  MailboxHash?: string;
  MessageID?: string;
}): { success: boolean; event?: DealThreadEvent; error?: string } {
  if (!payload || !payload.From) {
    return { success: false, error: 'Missing From header in email payload.' };
  }

  // Extract Token from To header or MailboxHash
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

  return {
    success: true,
    event,
  };
}
