/**
 * Plaid transaction → REIL phase tagging and project scoping.
 *
 * Every Plaid-connected transaction is scoped to a Project and bucketed into a
 * REIL workflow phase so Tax Intelligence can report on it:
 *
 *   Acquisition (Phase 1) → "Find & Fund" costs   — due diligence, inspections,
 *                                                   appraisals, earnest money,
 *                                                   loan origination
 *   Hold        (Phase 3) → operating expenses and rent revenue
 *   Exit        (Phase 4) → sale costs and capital gains
 *
 * Kept React-free so the mapping is unit-testable on its own.
 *
 * @see src/lib/constants/phaseColors.ts for the canonical phase palette.
 */

export type ReilPhase = 'acquisition' | 'hold' | 'exit';

export interface PhaseBucket {
  readonly phase: ReilPhase;
  /** Label shown in the Tax Intelligence UI. */
  readonly label: string;
  /** Numeric REIL phase, matching `PHASE_COLORS` keys. */
  readonly phaseNumber: number;
}

export const PHASE_BUCKETS: Record<ReilPhase, PhaseBucket> = {
  acquisition: { phase: 'acquisition', label: 'Find & Fund', phaseNumber: 1 },
  hold:        { phase: 'hold',        label: 'Operating',   phaseNumber: 3 },
  exit:        { phase: 'exit',        label: 'Disposition', phaseNumber: 4 },
};

/** Render order for phase breakdowns. */
export const PHASE_ORDER: readonly ReilPhase[] = ['acquisition', 'hold', 'exit'] as const;

/**
 * A Plaid transaction, narrowed to the fields tagging needs. Kept structural so
 * callers can pass their own richer type without casting.
 */
export interface TaggableTransaction {
  id: string;
  /** Project this transaction belongs to. Null means untagged. */
  projectId?: string | null;
  /** Plaid category (or our own override), e.g. "Repairs", "Closing Costs". */
  category?: string | null;
  /** Free-text merchant/description, used as a fallback signal. */
  description?: string | null;
  /** Positive = money in, negative = money out. */
  amountCents?: number | null;
  date?: string | null;
}

export interface TaggedTransaction extends TaggableTransaction {
  phase: ReilPhase;
  /** True when the phase came from an explicit category rather than a guess. */
  confident: boolean;
}

/* ── Category → phase rules ─────────────────────────────────────────────── */

/**
 * Ordered rules. First match wins, so the more specific patterns are listed
 * first — "closing costs" must beat the generic "cost" style matches, and
 * "capital gains" must beat "gain".
 */
const PHASE_RULES: ReadonlyArray<{ phase: ReilPhase; pattern: RegExp }> = [
  // ── Exit ──
  { phase: 'exit', pattern: /capital\s*gain|sale\s*proceed|seller\s*credit|disposition|realtor\s*commission|sales?\s*commission|escrow\s*payout|payoff/i },
  // ── Acquisition ──
  { phase: 'acquisition', pattern: /earnest|due\s*diligence|inspection|appraisal|title\s*search|origination|acquisition|closing\s*cost|survey|attorney\s*fee|loan\s*fee|underwriting\s*fee/i },
  // ── Hold ──
  { phase: 'hold', pattern: /rent|tenant|lease|utilit|repair|maintenance|management\s*fee|hoa|insurance|property\s*tax|landscap|pest|turnover|vacan|capex|capital\s*expenditure|mortgage\s*interest|escrow/i },
];

/**
 * Classify a transaction into a REIL phase.
 *
 * Returns `confident: false` when nothing matched and the default was applied.
 * Callers should surface unconfident rows for manual categorisation rather than
 * silently reporting them — a mis-bucketed transaction is a wrong tax figure.
 */
export function tagTransactionPhase(tx: TaggableTransaction): TaggedTransaction {
  const haystack = `${tx.category ?? ''} ${tx.description ?? ''}`.trim();

  if (haystack) {
    for (const rule of PHASE_RULES) {
      if (rule.pattern.test(haystack)) {
        return { ...tx, phase: rule.phase, confident: true };
      }
    }
  }

  // Default to the holding period: it is the longest-running phase and the one
  // most operating spend belongs to. Flagged unconfident so the UI can prompt.
  return { ...tx, phase: 'hold', confident: false };
}

export function tagTransactions(txs: TaggableTransaction[]): TaggedTransaction[] {
  return txs.map(tagTransactionPhase);
}

/* ── Project scoping ────────────────────────────────────────────────────── */

/** Transactions belonging to one project. `null` selects untagged ones. */
export function scopeToProject<T extends TaggableTransaction>(
  txs: T[],
  projectId: string | null,
): T[] {
  if (projectId === null) return txs.filter((t) => !t.projectId);
  return txs.filter((t) => t.projectId === projectId);
}

/** True when every transaction carries a project — req 7's tagging guarantee. */
export function allTransactionsScoped(txs: TaggableTransaction[]): boolean {
  return txs.every((t) => !!t.projectId);
}

export function untaggedTransactions<T extends TaggableTransaction>(txs: T[]): T[] {
  return txs.filter((t) => !t.projectId);
}

/* ── Aggregation ────────────────────────────────────────────────────────── */

export interface PhaseTotals {
  phase: ReilPhase;
  label: string;
  /** Money out, in cents, as a positive number. */
  outflowCents: number;
  /** Money in, in cents. */
  inflowCents: number;
  count: number;
  /** Rows whose phase was guessed rather than matched. */
  unconfidentCount: number;
}

/** Totals per phase, always returning all three buckets in PHASE_ORDER. */
export function summarizeByPhase(txs: TaggableTransaction[]): PhaseTotals[] {
  const tagged = tagTransactions(txs);

  return PHASE_ORDER.map((phase) => {
    const rows = tagged.filter((t) => t.phase === phase);
    return {
      phase,
      label: PHASE_BUCKETS[phase].label,
      outflowCents: rows.reduce((sum, t) => sum + Math.max(0, -(t.amountCents ?? 0)), 0),
      inflowCents: rows.reduce((sum, t) => sum + Math.max(0, t.amountCents ?? 0), 0),
      count: rows.length,
      unconfidentCount: rows.filter((t) => !t.confident).length,
    };
  });
}

/* ── Report readiness ───────────────────────────────────────────────────── */

/** Minimum transactions before a report is considered meaningful — req 6. */
export const MIN_TRANSACTIONS_FOR_REPORT = 3;

export interface ReportReadiness {
  ready: boolean;
  /** Tooltip copy when not ready. Empty string when ready. */
  reason: string;
}

/**
 * Whether there is enough data to export a report. Drives the disabled state
 * and tooltip on every Export PDF action.
 */
export function assessReportReadiness(
  projectCount: number,
  transactionCount: number,
): ReportReadiness {
  if (projectCount === 0) {
    return { ready: false, reason: 'Add your first property to unlock Tax Intelligence.' };
  }
  if (transactionCount < MIN_TRANSACTIONS_FOR_REPORT) {
    return { ready: false, reason: 'Add more transactions to generate this report.' };
  }
  return { ready: true, reason: '' };
}
