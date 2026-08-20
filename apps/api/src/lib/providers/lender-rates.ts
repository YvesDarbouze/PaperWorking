export interface LenderRate {
  id: string;
  name: string;
  interestRate: number;
  points: number;
  lenderFeesCents: number;
  asOf: Date;
}

export const DEFAULT_RATES: LenderRate[] = [
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

export function parseRatesDoc(data: Record<string, unknown>): LenderRate[] {
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
