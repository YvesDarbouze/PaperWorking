export const VALID_LOAN_INSTRUMENTS = ['Conventional', 'Hard Money', 'Bridge', 'SBA 504'] as const;
export type LoanInstrument = (typeof VALID_LOAN_INSTRUMENTS)[number];

export function normalizeSelectedInstruments(body: {
  instrument?: unknown;
  instruments?: unknown;
  reset?: unknown;
}): { reset: boolean; instruments: string[] } {
  const reset =
    body.reset === true ||
    (!body.instrument &&
      (!Array.isArray(body.instruments) || body.instruments.length === 0));
  const instruments: string[] = [];
  if (Array.isArray(body.instruments)) {
    instruments.push(...body.instruments.filter((item): item is string => typeof item === 'string'));
  } else if (typeof body.instrument === 'string' && body.instrument) {
    instruments.push(body.instrument);
  }
  return { reset, instruments };
}

export function validateLoanInstruments(
  instruments: string[],
): { ok: true; instruments: LoanInstrument[] } | { ok: false; error: string; status: number } {
  for (const instrument of instruments) {
    if (!(VALID_LOAN_INSTRUMENTS as readonly string[]).includes(instrument)) {
      return {
        ok: false,
        error: `instrument must be one of: ${VALID_LOAN_INSTRUMENTS.join(', ')}`,
        status: 422,
      };
    }
  }
  return { ok: true, instruments: instruments as LoanInstrument[] };
}

export function buildAllCashProjectUpdate(currentModality: string[] = []): Record<string, unknown> {
  const nextModality = currentModality.filter(
    (modality) =>
      !['conventional_loan', 'hard_money', 'bridge', 'sba_504_bank', 'sba_504_cdc'].includes(modality),
  );
  return {
    'financials.financingType': 'All Cash',
    loanStatus: null,
    'fundingPlan.modality': nextModality,
  };
}

export function buildFinancedProjectUpdate(
  selectedInstruments: LoanInstrument[],
  currentModality: string[] = [],
): Record<string, unknown> {
  const nextModality = currentModality.filter(
    (modality) =>
      !['conventional_loan', 'hard_money', 'bridge', 'sba_504_bank', 'sba_504_cdc'].includes(modality),
  );
  if (selectedInstruments.includes('Conventional')) nextModality.push('conventional_loan');
  if (selectedInstruments.includes('Hard Money')) nextModality.push('hard_money');
  if (selectedInstruments.includes('Bridge')) nextModality.push('bridge');
  if (selectedInstruments.includes('SBA 504')) {
    nextModality.push('sba_504_bank', 'sba_504_cdc');
  }
  return {
    'financials.financingType': 'Financed',
    loanStatus: 'Application-Submitted',
    'fundingPlan.modality': nextModality,
  };
}

export function buildLoanRecordsForInstrument(
  projectId: string,
  instrument: LoanInstrument,
  createId: () => string,
): Array<Record<string, unknown>> {
  const now = new Date().toISOString();
  if (instrument === 'SBA 504') {
    return [
      {
        id: createId(),
        projectId,
        instrument,
        lenderName: 'SBA 504 First Lien Bank',
        amountCents: 0,
        interestRate: 0,
        termMonths: 120,
        points: 0,
        status: 'Application-Submitted',
        notes: 'Bank 50% First Lien Loan',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId(),
        projectId,
        instrument,
        lenderName: 'CDC Debenture Second Lien',
        amountCents: 0,
        interestRate: 0,
        termMonths: 240,
        points: 0,
        status: 'Application-Submitted',
        notes: 'CDC 35-40% Debenture Second Lien',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
  return [
    {
      id: createId(),
      projectId,
      instrument,
      lenderName: `${instrument} Lender`,
      amountCents: 0,
      interestRate: 0,
      termMonths: instrument === 'Conventional' ? 360 : 12,
      points: 0,
      status: 'Application-Submitted',
      notes: `${instrument} loan record`,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function buildLoanSyncPatchFromEstimate(
  estimate: Record<string, unknown>,
): Record<string, unknown> {
  return {
    lenderName: estimate.lenderName,
    amountCents: estimate.amountCents,
    interestRate: estimate.interestRate,
    termMonths: estimate.termMonths,
    points: estimate.points,
    estimatedCostsCents: estimate.estimatedCostsCents,
    fileId: estimate.fileId,
    fileName: estimate.fileName,
    fileUrl: estimate.fileUrl,
    sourceTags: estimate.sourceTags || null,
    updatedAt: new Date().toISOString(),
  };
}
