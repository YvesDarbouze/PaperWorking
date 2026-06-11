/* ═══════════════════════════════════════════════════════════════
   Closing Cost Model
   ───────────────────────────────────────────────────────────────
   Pure function — no Firestore, no React. Takes project financials
   and a user-override map; returns typed line items with:
     • computed  — formula result in dollars
     • override  — persisted user value (undefined = use computed)
     • amount    — final value to display (override ?? computed)
     • basis     — human-readable formula description (for tooltip)
     • isOverridden — true when override is set

   All monetary outputs are whole-dollar integers (cents discarded).

   Formula defaults (designed to be reasonable but not authoritative):
     - Origination       loanAmount × (originationPoints / 100)
     - Title & Recording 0.40% × purchasePrice   (title ins + recording fees)
     - Transfer Tax      0.10% × purchasePrice   (state-specific; overridable)
     - Prepaids & Escrow 15-day interest + 1 mo insurance + 3 mo tax escrow
   ═══════════════════════════════════════════════════════════════ */

export interface ClosingCostLine {
  id: string;
  label: string;
  /** Formula result, recalculated whenever financials change */
  computed: number;
  /** User-persisted dollar override; undefined = no override */
  override?: number;
  /** Final displayed amount: override ?? computed */
  amount: number;
  isOverridden: boolean;
  /** Short formula description shown as sub-label */
  basis: string;
}

/** Stored in project.financials.closingCostOverrides */
export type ClosingCostOverrides = Record<string, number>;

function fmtShort(dollars: number): string {
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}k`;
  return `$${dollars.toFixed(0)}`;
}

function line(
  id: string,
  label: string,
  computed: number,
  basis: string,
  overrides: ClosingCostOverrides
): ClosingCostLine {
  const override = overrides[id];
  const isOverridden = override !== undefined;
  return {
    id,
    label,
    computed,
    override,
    amount: isOverridden ? override : computed,
    isOverridden,
    basis,
  };
}

export interface ClosingCostInputs {
  purchasePrice?: number;
  loanAmount?: number;
  loanInterestRate?: number;    // percent, e.g. 6.125
  loanOriginationPoints?: number; // e.g. 1.0 = 1 point
}

export function computeClosingCostLines(
  financials: ClosingCostInputs,
  overrides: ClosingCostOverrides = {}
): ClosingCostLine[] {
  const pp    = financials.purchasePrice ?? 0;
  const loan  = financials.loanAmount ?? 0;
  const rate  = financials.loanInterestRate ?? 0;
  const pts   = financials.loanOriginationPoints ?? 0;

  // 1. Origination fees = loan × (pts / 100)
  const origComputed = pts > 0 ? Math.round(loan * (pts / 100)) : 0;
  const origBasis = pts > 0
    ? `${pts} pt${pts !== 1 ? 's' : ''} × ${fmtShort(loan)} loan`
    : 'origination points not set';

  // 2. Title insurance + recording fees ≈ 0.40% of purchase price
  const titleComputed = Math.round(pp * 0.004);
  const titleBasis = `0.40% × ${fmtShort(pp)}`;

  // 3. Transfer / recordation tax: 0.10% of purchase price (default)
  //    Varies widely by state; user should override for their jurisdiction.
  const transferComputed = Math.round(pp * 0.001);
  const transferBasis = `0.10% × ${fmtShort(pp)} (default rate; override for your state)`;

  // 4. Prepaids & Escrow:
  //    a) 15-day prepaid interest
  //    b) 1 month hazard insurance (≈ 0.5%/yr ÷ 12)
  //    c) 3-month property tax escrow (≈ 1.25%/yr ÷ 12 × 3)
  const dailyInterest     = rate > 0 && loan > 0 ? (loan * (rate / 100)) / 365 : 0;
  const prepaidInterest   = Math.round(dailyInterest * 15);
  const monthlyInsurance  = Math.round(pp * 0.005 / 12);
  const taxEscrow3mo      = Math.round((pp * 0.0125 / 12) * 3);
  const prepaidsComputed  = prepaidInterest + monthlyInsurance + taxEscrow3mo;
  const prepaidsBasis     = `15-day interest (${fmtShort(prepaidInterest)}) + ins (${fmtShort(monthlyInsurance)}) + 3mo tax (${fmtShort(taxEscrow3mo)})`;

  return [
    line('origination',   'Origination Fees',    origComputed,     origBasis,     overrides),
    line('titleRecording', 'Title & Recording',   titleComputed,    titleBasis,    overrides),
    line('transferTax',   'Transfer Tax',         transferComputed, transferBasis, overrides),
    line('prepaids',      'Prepaids & Escrow',    prepaidsComputed, prepaidsBasis, overrides),
  ];
}

/** Sum of all final amounts — the value to display as "Total Closing Costs" */
export function totalClosingCosts(lines: ClosingCostLine[]): number {
  return lines.reduce((s, l) => s + l.amount, 0);
}
