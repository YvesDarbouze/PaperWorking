/* ═══════════════════════════════════════════════════════
   PaperWorking — Deal Engagement, Invitations & Waitlist
   (PROMPT 4 — Deal Engagement & External Investor Funnel)
   ═══════════════════════════════════════════════════════ */

import crypto from 'crypto';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';
export type InterestStatus = 'COMMITTED' | 'WAITLIST' | 'DECLINED' | 'WITHDRAWN';

export interface BusinessCardSnapshot {
  displayName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
}

export interface DealInvitation {
  id: string;
  dealId: string;
  dealSlug: string;
  token: string;
  invitedEmail: string;
  invitedUserId?: string;
  senderUserId: string;
  senderName: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface DealInterest {
  id: string;
  dealId: string;
  userId: string;
  percentIntent?: number;
  amountIntent?: number;
  currency: string;
  businessCardSnapshot: BusinessCardSnapshot;
  status: InterestStatus;
  createdAt: string;
}

export interface IntentValidationResult {
  valid: boolean;
  error?: string;
  status: InterestStatus;
  calculatedAmount: number;
}

/**
 * Generates a secure, 30-day single-purpose invitation token bound to an email.
 */
export function generateInvitationToken(dealId: string, invitedEmail: string, senderUserId: string, senderName: string): DealInvitation {
  const token = crypto.randomBytes(24).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return {
    id: `inv_${token.slice(0, 12)}`,
    dealId,
    dealSlug: dealId,
    token,
    invitedEmail: invitedEmail.toLowerCase().trim(),
    senderUserId,
    senderName,
    status: 'PENDING',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Validates token status, checking expiry date and explicit revocation.
 */
export function validateInvitationToken(invite: DealInvitation): { valid: boolean; error?: string } {
  if (invite.status === 'REVOKED' || invite.revokedAt) {
    return { valid: false, error: 'This invitation link has been revoked by the deal owner.' };
  }
  if (invite.status === 'EXPIRED' || new Date(invite.expiresAt).getTime() < Date.now()) {
    return { valid: false, error: 'This invitation link has expired (links are valid for 30 days).' };
  }
  if (invite.status === 'DECLINED') {
    return { valid: false, error: 'This invitation has already been declined.' };
  }
  return { valid: true };
}

/**
 * Revokes an active invitation token.
 */
export function revokeInvitation(invite: DealInvitation): DealInvitation {
  return {
    ...invite,
    status: 'REVOKED',
    revokedAt: new Date().toISOString(),
  };
}

/**
 * Validates investment intent:
 * Must be EXACTLY ONE of percentIntent XOR amountIntent.
 * percentIntent: > 0 and <= 100
 * amountIntent: > 0
 * Determines if user is COMMITTED or placed on WAITLIST based on remaining target.
 */
export function validateInvestmentIntent(
  fundingTarget: number,
  currentCommittedAmount: number,
  currency: string,
  percentIntent?: number,
  amountIntent?: number
): IntentValidationResult {
  const hasPercent = percentIntent !== undefined && percentIntent !== null && !isNaN(percentIntent) && percentIntent > 0;
  const hasAmount = amountIntent !== undefined && amountIntent !== null && !isNaN(amountIntent) && amountIntent > 0;

  // Enforce XOR constraint
  if ((hasPercent && hasAmount) || (!hasPercent && !hasAmount)) {
    return {
      valid: false,
      error: 'Please specify investment intent as EITHER a percentage OR a currency amount (not both).',
      status: 'COMMITTED',
      calculatedAmount: 0,
    };
  }

  let calculatedAmount = 0;

  if (hasPercent) {
    const pct = Number(percentIntent);
    if (pct <= 0 || pct > 100) {
      return {
        valid: false,
        error: 'Percentage intent must be between 1% and 100%.',
        status: 'COMMITTED',
        calculatedAmount: 0,
      };
    }
    calculatedAmount = Math.round((pct / 100) * fundingTarget);
  } else {
    calculatedAmount = Number(amountIntent);
    if (calculatedAmount <= 0) {
      return {
        valid: false,
        error: 'Investment amount must be greater than $0.',
        status: 'COMMITTED',
        calculatedAmount: 0,
      };
    }
  }

  const remaining = Math.max(0, fundingTarget - currentCommittedAmount);
  const isWaitlist = currentCommittedAmount >= fundingTarget || calculatedAmount > remaining;
  const status: InterestStatus = isWaitlist ? 'WAITLIST' : 'COMMITTED';

  return {
    valid: true,
    status,
    calculatedAmount,
  };
}

/**
 * Sanitizes a Deal model into a public-safe teaser preview.
 * Strips private investor details, underwriting snapshots, and contact details.
 */
export function sanitizePublicTeaser(deal: {
  displayAddress: string;
  city?: string;
  state?: string;
  assetClass?: string;
  fundingTarget: number;
  committedAmount?: number;
  status: string;
  price?: number;
}) {
  return {
    displayAddress: deal.displayAddress,
    location: `${deal.city || 'Austin'}, ${deal.state || 'TX'}`,
    assetClass: deal.assetClass || 'Multi-Family',
    status: deal.status,
    fundingTarget: deal.fundingTarget,
    committedAmount: deal.committedAmount || 0,
    percentFunded: deal.fundingTarget > 0 ? Math.min(100, Math.round(((deal.committedAmount || 0) / deal.fundingTarget) * 100)) : 0,
    // Explicitly NO private investor list, NO full analyzer snapshot, NO owner contact info
  };
}
