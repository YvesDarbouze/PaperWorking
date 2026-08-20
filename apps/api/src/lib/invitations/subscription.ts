import { validateInvitationTokenFormat } from './guest-portal.js';
import { isInvitationExpired } from './token-ask.js';

export interface SubscriptionBody {
  action?: unknown;
  evidence?: unknown;
}

export function validateSubscriptionToken(
  token: string,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!validateInvitationTokenFormat(token)) {
    return { ok: false, error: 'Invalid token format', status: 400 };
  }
  return { ok: true };
}

export function checkSubscriptionInvitationExpiry(
  expiresAt: string | Date,
): { ok: true } | { ok: false; error: string; status: number } {
  if (isInvitationExpired(expiresAt)) {
    return { ok: false, error: 'Invitation has expired.', status: 410 };
  }
  return { ok: true };
}

export function buildCommitmentSignedTransition(input: {
  fromStatus: string | null;
  actorEmail: string;
  action?: unknown;
  evidence?: unknown;
}): {
  fromStatus: string | null;
  toStatus: 'signed';
  timestamp: string;
  actor: string;
  evidence: string;
} {
  const action = typeof input.action === 'string' ? input.action : undefined;
  const evidence =
    (typeof input.evidence === 'string' && input.evidence) ||
    (action === 'esign'
      ? 'E-Signed via DocuSign in Guest Portal'
      : 'Manually signed copy uploaded');

  return {
    fromStatus: input.fromStatus,
    toStatus: 'signed',
    timestamp: new Date().toISOString(),
    actor: input.actorEmail || 'Guest Investor',
    evidence,
  };
}
