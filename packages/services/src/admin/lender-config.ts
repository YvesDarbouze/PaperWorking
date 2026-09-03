export type LenderRateRow = {
  id: string;
  name: string;
  interestRate: number;
  points: number;
  lenderFeesCents: number;
  asOf: Date;
};

export type LenderChecklistDefinitions = {
  Conventional: string[];
  'SBA 504': string[];
  'Hard Money': string[];
  Bridge: string[];
};

export const DEFAULT_LENDER_RATES: LenderRateRow[] = [
  {
    id: 'NEO',
    name: 'NEO Capital',
    interestRate: 6.125,
    points: 1.0,
    lenderFeesCents: 125000,
    asOf: new Date(0),
  },
  {
    id: 'LEGACY',
    name: 'Legacy Bank',
    interestRate: 6.45,
    points: 1.5,
    lenderFeesCents: 150000,
    asOf: new Date(0),
  },
];

export const DEFAULT_LENDER_CHECKLISTS: LenderChecklistDefinitions = {
  Conventional: [
    '3yr Personal Tax Returns',
    '3yr Business Tax Returns',
    'P&L Statement (Year-to-Date)',
    'Proforma (Financial Projections)',
    'Debt Schedule',
    'Organizational Documents (LLC/Articles)',
    'Project Cost Breakdown',
  ],
  'SBA 504': [
    '3yr Personal Tax Returns',
    '3yr Business Tax Returns',
    'P&L Statement (Year-to-Date)',
    'Proforma (Financial Projections)',
    'Debt Schedule',
    'Organizational Documents (LLC/Articles)',
    'Project Cost Breakdown (SBA 504)',
  ],
  'Hard Money': [
    'Purchase Contract',
    'Renovation Budget (Rehab Schedule)',
    'Proforma / Rent Roll',
    'Organizational Documents (LLC/Articles)',
  ],
  Bridge: [
    'Purchase Contract',
    'Renovation Budget (Rehab Schedule)',
    'Proforma / Rent Roll',
    'Organizational Documents (LLC/Articles)',
  ],
};

export function parseLenderRatesDoc(data: Record<string, unknown>): LenderRateRow[] {
  const raw = (data.rates ?? []) as unknown[];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((entry) => {
    const r = entry as Record<string, unknown>;
    const asOfValue = r.asOf as { toDate?: () => Date } | string | undefined;
    let asOf = new Date(0);
    if (asOfValue && typeof asOfValue === 'object' && typeof asOfValue.toDate === 'function') {
      asOf = asOfValue.toDate();
    } else if (asOfValue) {
      asOf = new Date(asOfValue as string);
    }
    return {
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      interestRate: Number(r.interestRate ?? 0),
      points: Number(r.points ?? 0),
      lenderFeesCents: Number(r.lenderFeesCents ?? 0),
      asOf,
    };
  });
}

export function parseLenderChecklistsDoc(data: Record<string, unknown>): LenderChecklistDefinitions {
  return {
    Conventional: Array.isArray(data.Conventional)
      ? data.Conventional.map(String)
      : DEFAULT_LENDER_CHECKLISTS.Conventional,
    'SBA 504': Array.isArray(data['SBA 504'])
      ? data['SBA 504'].map(String)
      : DEFAULT_LENDER_CHECKLISTS['SBA 504'],
    'Hard Money': Array.isArray(data['Hard Money'])
      ? data['Hard Money'].map(String)
      : DEFAULT_LENDER_CHECKLISTS['Hard Money'],
    Bridge: Array.isArray(data.Bridge)
      ? data.Bridge.map(String)
      : DEFAULT_LENDER_CHECKLISTS.Bridge,
  };
}

export function serializeLenderRateForApi(rate: LenderRateRow): {
  id: string;
  name: string;
  interestRate: number;
  points: number;
  lenderFeesCents: number;
  asOf: string | null;
} {
  return {
    id: rate.id,
    name: rate.name,
    interestRate: rate.interestRate,
    points: rate.points,
    lenderFeesCents: rate.lenderFeesCents,
    asOf: rate.asOf.getTime() === 0 ? null : rate.asOf.toISOString(),
  };
}
