export type InvitationRespondAction = 'accept' | 'decline' | 'interested' | 'reopen';

export interface InvitationRespondBody {
  token?: unknown;
  action?: unknown;
  signatureDataUrl?: unknown;
  declineReason?: unknown;
  disclosedCard?: unknown;
}

export interface DisclosedBusinessCard {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export function validateInvitationRespondBody(
  body: InvitationRespondBody,
): { ok: true; value: {
  token: string;
  action: InvitationRespondAction;
  signatureDataUrl?: string;
  declineReason?: string;
  disclosedCard?: DisclosedBusinessCard;
} } | { ok: false; error: string; status: number } {
  const token = body.token;
  if (!token || typeof token !== 'string' || token.length < 16) {
    return { ok: false, error: 'Invalid or missing invitation token.', status: 400 };
  }

  const action = body.action;
  if (
    action !== 'accept' &&
    action !== 'decline' &&
    action !== 'interested' &&
    action !== 'reopen'
  ) {
    return {
      ok: false,
      error: 'action must be "accept", "decline", "interested", or "reopen".',
      status: 400,
    };
  }

  if (action === 'accept') {
    const sig = body.signatureDataUrl;
    if (!sig || typeof sig !== 'string') {
      return {
        ok: false,
        error: 'signatureDataUrl is required when accepting.',
        status: 400,
      };
    }
  }

  let disclosedCard: DisclosedBusinessCard | undefined;
  if (body.disclosedCard && typeof body.disclosedCard === 'object') {
    const card = body.disclosedCard as Record<string, unknown>;
    disclosedCard = {
      name: typeof card.name === 'string' ? card.name : '',
      email: typeof card.email === 'string' ? card.email : '',
      phone: typeof card.phone === 'string' ? card.phone : '',
      company: typeof card.company === 'string' ? card.company : '',
    };
  }

  return {
    ok: true,
    value: {
      token,
      action,
      signatureDataUrl:
        typeof body.signatureDataUrl === 'string' ? body.signatureDataUrl : undefined,
      declineReason:
        typeof body.declineReason === 'string' ? body.declineReason : undefined,
      disclosedCard,
    },
  };
}

export function isInvitationExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt < now;
}

export function isCommitmentLocked(status: string): boolean {
  return ['signed', 'funds-confirmed', 'cleared'].includes(status);
}

export function buildInvitationStatusUpdate(
  action: InvitationRespondAction,
  options: {
    signatureDataUrl?: string;
    declineReason?: string;
    disclosedCard?: DisclosedBusinessCard;
    fallbackCard?: DisclosedBusinessCard;
  } = {},
): Record<string, unknown> {
  if (action === 'accept') {
    return {
      status: 'accepted',
      signatureDataUrl: options.signatureDataUrl,
    };
  }
  if (action === 'decline') {
    return {
      status: 'declined',
      declineReason: options.declineReason ?? null,
    };
  }
  if (action === 'interested') {
    const disclosedCard = options.disclosedCard ?? options.fallbackCard ?? {
      name: 'Anonymous Investor',
      email: '',
      phone: '',
      company: '',
    };
    return {
      status: 'interested',
      inviteeBusinessCard: disclosedCard,
      cardExchangeStatus: 'pending',
    };
  }
  return { status: 'opened' };
}
