export const PROOF_OF_FUNDS_ACTIONS = ['request', 'upload', 'verify', 'plaid_sync'] as const;

export type ProofOfFundsAction = (typeof PROOF_OF_FUNDS_ACTIONS)[number];

export interface ProofOfFundsPostBody {
  sourceId?: unknown;
  action?: unknown;
  documentId?: unknown;
  documentName?: unknown;
  documentUrl?: unknown;
  plaidAccountName?: unknown;
  plaidBalance?: unknown;
}

export function isProofOfFundsAction(value: unknown): value is ProofOfFundsAction {
  return typeof value === 'string' && PROOF_OF_FUNDS_ACTIONS.includes(value as ProofOfFundsAction);
}

export function validateProofOfFundsBody(
  body: ProofOfFundsPostBody,
): { ok: true; action: ProofOfFundsAction; sourceId: string | null; body: ProofOfFundsPostBody } | { ok: false; error: string; status: number } {
  if (!isProofOfFundsAction(body.action)) {
    return { ok: false, error: 'Invalid action', status: 400 };
  }

  const action = body.action;
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId : null;

  if (!sourceId && action !== 'plaid_sync') {
    return { ok: false, error: 'sourceId is required', status: 400 };
  }

  if (action === 'upload') {
    if (typeof body.documentUrl !== 'string' || !body.documentUrl.trim()) {
      return { ok: false, error: 'documentUrl is required for upload action', status: 400 };
    }
  }

  return { ok: true, action, sourceId, body };
}

export function computeCompletedFundCards(
  proofOfFunds: Array<{ status?: string }>,
  existingCards: string[] = [],
): string[] {
  const allVerified =
    proofOfFunds.length > 0 && proofOfFunds.every((pof) => pof.status === 'verified');

  if (allVerified) {
    return existingCards.includes('F1.4') ? existingCards : [...existingCards, 'F1.4'];
  }

  return existingCards.filter((id) => id !== 'F1.4');
}
