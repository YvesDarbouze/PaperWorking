/**
 * IRS Form 1040-ES estimated-payment due dates.
 *
 * The dates are statutory and fixed, so they live here rather than in
 * `reportEngine.ts` (which models figures, not the calendar). Drives the
 * "payment due within 30 days" alert on the Quarterly tab.
 *
 * Note: the IRS shifts a due date that lands on a weekend or federal holiday to
 * the next business day. That adjustment is NOT applied here — the alert is a
 * planning nudge, not a filing deadline, and the shift is never more than a few
 * days. Anyone filing to the day should confirm with their CPA.
 */

export interface EstimatedTaxDueDate {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  /** The tax year the payment applies to. */
  taxYear: number;
  dueDate: Date;
}

/** Alert threshold, in days. */
export const DUE_SOON_DAYS = 30;

/**
 * The four 1040-ES deadlines for a tax year. Q4 falls in the FOLLOWING
 * calendar year (January 15), which is the usual off-by-one trap here.
 */
export function estimatedTaxDueDates(taxYear: number): EstimatedTaxDueDate[] {
  return [
    { quarter: 'Q1', taxYear, dueDate: new Date(Date.UTC(taxYear, 3, 15)) },      // Apr 15
    { quarter: 'Q2', taxYear, dueDate: new Date(Date.UTC(taxYear, 5, 15)) },      // Jun 15
    { quarter: 'Q3', taxYear, dueDate: new Date(Date.UTC(taxYear, 8, 15)) },      // Sep 15
    { quarter: 'Q4', taxYear, dueDate: new Date(Date.UTC(taxYear + 1, 0, 15)) },  // Jan 15 (next year)
  ];
}

/** The next deadline on or after `now`, looking into next year's Q1 if needed. */
export function nextEstimatedTaxDueDate(now: Date = new Date()): EstimatedTaxDueDate {
  const year = now.getUTCFullYear();
  const candidates = [
    // The prior year's Q4 lands in January of this year.
    ...estimatedTaxDueDates(year - 1),
    ...estimatedTaxDueDates(year),
    ...estimatedTaxDueDates(year + 1),
  ].filter((d) => d.dueDate.getTime() >= startOfDayUtc(now).getTime());

  // Sorted by construction; the first future date wins.
  return candidates[0];
}

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole days from `now` until `due` (0 when due today). */
export function daysUntil(due: Date, now: Date = new Date()): number {
  const ms = startOfDayUtc(due).getTime() - startOfDayUtc(now).getTime();
  return Math.round(ms / 86_400_000);
}

export interface DueSoonStatus {
  dueSoon: boolean;
  quarter: EstimatedTaxDueDate['quarter'];
  days: number;
  /** Human label, e.g. "Q3 estimated payment due in 12 days". */
  label: string;
}

/** Whether the next estimated payment falls inside the alert window. */
export function estimatedPaymentDueSoon(
  now: Date = new Date(),
  withinDays: number = DUE_SOON_DAYS,
): DueSoonStatus {
  const next = nextEstimatedTaxDueDate(now);
  const days = daysUntil(next.dueDate, now);
  const when = days === 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`;
  return {
    dueSoon: days <= withinDays,
    quarter: next.quarter,
    days,
    label: `${next.quarter} estimated payment due ${when}`,
  };
}
