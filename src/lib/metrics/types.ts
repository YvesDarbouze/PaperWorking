/**
 * Structured metric result types for the REI Metrics Engine.
 *
 * These types wrap the raw numerical outputs of reiMetrics.ts with
 * state tracking, input provenance, and missing-field diagnostics.
 *
 * Pure types — no runtime code, no I/O imports.
 */

/**
 * Lifecycle state of a computed metric.
 *
 * - projected:  Based on user assumptions (Phase 1 — Find & Fund)
 * - actual:     Computed from confirmed deal terms (Phase 2 — Acquisition complete)
 * - live:       Computed from real-time operational data (Phase 3 — Hold)
 * - realized:   Computed from final exit numbers (Phase 4 — Exit)
 * - incomplete: One or more required inputs missing — value is null
 * - n/a:        Metric does not apply to this deal type (e.g. DSCR on all-cash)
 */
export type MetricState = 'projected' | 'actual' | 'live' | 'realized' | 'incomplete' | 'n/a';

/**
 * Canonical wrapper for every metric computation.
 */
export interface MetricResult {
  /** The computed metric value, or null if incomplete/n/a */
  value: number | null;
  /** The state of this metric based on input data quality */
  state: MetricState;
  /** Map of field paths to the values used in computation */
  inputsUsed: Record<string, number | string>;
  /** List of field paths that were missing, preventing full computation */
  inputsMissing: string[];
  /** Optional project IDs included in the rollup calculation */
  projectsIncluded?: string[];
  /** Optional project IDs excluded from the rollup calculation */
  projectsExcluded?: string[];
}

/**
 * Machine-readable reason code for metrics that return null because
 * their data instrument doesn't exist yet. Components render these
 * as honest states (em-dash + tooltip), never as missing/error.
 *
 * KPI-33 §2 — three null classes:
 *   1. INCOMPLETE: required input fields exist but are not yet populated
 *   2. DEFERRED:   the instrument (ledger, market feed, checklist) isn't built
 *   3. NOT_APPLICABLE: metric doesn't apply to this deal type
 */
export type MetricNullReason =
  // Class 2 — instrument not yet built (VZ-1 spec §honesty)
  | 'REQUIRES_INCOME_LEDGER'        // #15 AAR, #17 Revenue Growth
  | 'REQUIRES_EXPENSE_LEDGER'       // #13 CapEx tracking
  | 'REQUIRES_TENANT_REGISTRY'      // #19 Tenant Turnover, #21 Lease Renewal
  | 'REQUIRES_SALE_RECORD'          // #12 ROI (actual), #31 Avg Commission
  | 'REQUIRES_RE_VALUATION'         // (reserved — future revaluation instrument)
  | 'REQUIRES_LISTING_LOG'          // #23 DOM, #30 Listing-to-Meeting
  | 'REQUIRES_PORTFOLIO_HISTORY'    // #20 Avg Rent/Property, #25 Portfolio Value Growth
  | 'REQUIRES_COMPLIANCE_CHECKLIST' // #33 Compliance Rate
  // Class 3 — deferred by product decision
  | 'MARKET_DATA_DEFERRED'          // #27, #28, #29 — awaits RentCast / market feed
  // Standard null classes
  | 'INCOMPLETE'                    // Fields exist but not populated
  | 'NOT_APPLICABLE';               // Metric doesn't apply (e.g. DSCR on all-cash)

/**
 * Extended metric result that includes a reason code when value is null.
 */
export interface MetricResultWithReason extends MetricResult {
  /** Why this metric returned null — machine-readable, for honest UI states */
  nullReason?: MetricNullReason;
}

/**
 * All canonical and supplemental REI datapoints exposed by PaperWorking.
 *
 * The 33 KPIs (numbered per the canonical source document) plus the
 * 10 hero scorecard metrics. Note: APPRECIATION is hero #10 and is
 * separate from the 33's numbering.
 */
export type MetricId =
  // ── Hero 10 (Scorecard) ─────────────────────────────────────────────────
  | 'NOI'                       // Hero 1  / KPI 1
  | 'CASH_FLOW'                 // Hero 2  / KPI 5
  | 'CAP_RATE'                  // Hero 3  / KPI 2
  | 'COC'                       // Hero 4  / KPI 3
  | 'GRM'                       // Hero 5  / KPI 6
  | 'DSCR'                      // Hero 6  / KPI 7
  | 'IRR'                       // Hero 7  / KPI 4
  | 'OCCUPANCY'                 // Hero 8  / KPI 18
  | 'OER'                       // Hero 9  / KPI 9
  | 'APPRECIATION'              // Hero 10 / NOT in the 33's numbering — scorecard only

  // ── Financial Performance (KPIs 1–17) — beyond hero overlap ─────────────
  | 'LTV'                       // KPI 8
  | 'EQUITY_TO_VALUE'           // KPI 10
  | 'INTEREST_COVERAGE'         // KPI 11
  | 'ROI'                       // KPI 12
  | 'CAPEX'                     // KPI 13
  | 'GOI'                       // KPI 14
  | 'AAR'                       // KPI 15
  | 'EQUITY_MULTIPLE'           // KPI 16
  | 'REVENUE_GROWTH'            // KPI 17

  // ── Operational Efficiency (KPIs 18–24) — beyond hero overlap ───────────
  | 'TENANT_TURNOVER'           // KPI 19
  | 'AVG_RENT_PER_PROPERTY'     // KPI 20
  | 'LEASE_RENEWAL'             // KPI 21
  | 'MAINTENANCE_COST_PER_UNIT' // KPI 22
  | 'DOM'                       // KPI 23
  | 'CONSTRUCTION_COST_SQFT'    // KPI 24

  // ── Asset & Portfolio Management (KPIs 25–29) ───────────────────────────
  | 'PORTFOLIO_VALUE_GROWTH'    // KPI 25
  | 'PAYBACK_PERIOD'            // KPI 26
  | 'YOY_SOLD_PRICE_VARIANCE'   // KPI 27
  | 'SOLD_PER_INVENTORY'        // KPI 28
  | 'DEMAND_GROWTH'             // KPI 29

  // ── Marketing & Sales (KPIs 30–31) ──────────────────────────────────────
  | 'LISTING_TO_MEETING'        // KPI 30
  | 'AVG_COMMISSION'            // KPI 31

  // ── Risk Management & Compliance (KPIs 32–33) ──────────────────────────
  | 'RISK_SCORE'                // KPI 32
  | 'COMPLIANCE_RATE'           // KPI 33

  // ── Legacy supplemental (computed, not in the 33) ───────────────────────
  | 'DEBT_YIELD'
  | 'BREAK_EVEN_OCCUPANCY'
  | 'CAPITAL_RESERVES'
  | 'BUDGET_VARIANCE';
