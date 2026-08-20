export function validateLoanEstimateCreateBody(body: Record<string, unknown>): {
  ok: true;
  estimate: Record<string, unknown>;
} | { ok: false; error: string; status: number } {
  const lenderName = typeof body.lenderName === 'string' ? body.lenderName.trim() : '';
  if (!lenderName) return { ok: false, error: 'Lender name is required', status: 400 };

  const amountCents = body.amountCents;
  if (typeof amountCents !== 'number' || amountCents <= 0) {
    return { ok: false, error: 'Amount must be greater than zero', status: 400 };
  }
  const interestRate = body.interestRate;
  if (typeof interestRate !== 'number' || interestRate < 0) {
    return { ok: false, error: 'Interest rate must be non-negative', status: 400 };
  }
  const termMonths = body.termMonths;
  if (typeof termMonths !== 'number' || termMonths <= 0) {
    return { ok: false, error: 'Term months must be greater than zero', status: 400 };
  }

  const fileId = body.fileId;
  const hasDoc = !!fileId;
  const sourceTags = body.sourceTags || {
    lenderName: hasDoc ? 'document' : 'manual',
    amountCents: hasDoc ? 'document' : 'manual',
    interestRate: hasDoc ? 'document' : 'manual',
    termMonths: hasDoc ? 'document' : 'manual',
    points: hasDoc ? 'document' : 'manual',
    estimatedCostsCents: hasDoc ? 'document' : 'manual',
  };

  return {
    ok: true,
    estimate: {
      loanRecordId: body.loanRecordId || null,
      lenderName,
      amountCents,
      interestRate,
      termMonths,
      points: typeof body.points === 'number' ? body.points : 0,
      estimatedCostsCents: typeof body.estimatedCostsCents === 'number' ? body.estimatedCostsCents : 0,
      fileId: fileId || null,
      fileName: body.fileName || null,
      fileUrl: body.fileUrl || null,
      isChosen: false,
      sourceTags,
    },
  };
}

export function canAddLoanEstimate(role: string, partyId?: string | null): { ok: true } | { ok: false; error: string; status: number } {
  if (role === 'LP') {
    return { ok: false, error: 'Access denied: LPs cannot add loan estimates.', status: 403 };
  }
  if (role === 'Vendor') {
    const allowed = ['f4HardMoneyLenderVendor', 'f4CdcVendor', 'f4AppraiserVendor'];
    if (!allowed.includes(partyId || '')) {
      return { ok: false, error: 'Access denied: Vendor is not authorized to add loan estimates.', status: 403 };
    }
  }
  return { ok: true };
}
