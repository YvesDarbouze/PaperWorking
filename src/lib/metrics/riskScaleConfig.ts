/**
 * Risk Scale Configuration — KPI #32 (Risk Assessment Score)
 *
 * Scale: 1–10 per source document ("typically rated on a scale, e.g., 1 to 10").
 * Composite = average of four sub-category scores.
 *
 * CRITICAL: Every sub-category derives from computed or collected data —
 * DSCR/LTV bands, hazard flags, occupancy/maintenance metrics, compliance rate.
 * No sub-score is ever typed in manually.
 *
 * Pure config — no runtime code, no I/O imports.
 */

// ─── Scale ──────────────────────────────────────────────────────────────────

/** Global scale bounds: 1 = lowest risk, 10 = highest risk. */
export const RISK_SCALE_MIN = 1;
export const RISK_SCALE_MAX = 10;

// ─── Sub-Category Definitions ───────────────────────────────────────────────

export type RiskSubCategory =
  | 'financial'
  | 'market'
  | 'operational'
  | 'compliance';

/** How a sub-score is derived. */
export interface RiskBand {
  /** Upper bound of this band (inclusive). Values ≤ this threshold → this score. */
  upperBound: number;
  /** Risk score assigned when the input value falls in this band. */
  score: number;
  /** Human-readable label for the band. */
  label: string;
}

export interface RiskSubCategoryConfig {
  /** Machine key matching RiskSubCategory. */
  key: RiskSubCategory;
  /** Human-readable name. */
  name: string;
  /** Description of what this sub-category measures. */
  description: string;
  /** Which computed metric(s) this sub-score derives from. */
  derivedFrom: string[];
  /**
   * Threshold bands, ordered low → high. The first band whose upperBound
   * is ≥ the input value determines the risk score.
   *
   * When derivedFrom references multiple metrics, the config documents
   * the primary driver; the engine may blend inputs as appropriate.
   */
  bands: RiskBand[];
}

// ─── The Config Object ──────────────────────────────────────────────────────

/**
 * Single source of truth for KPI #32 risk scoring.
 *
 * Each sub-category maps computed/collected data → a 1–10 risk score
 * via threshold bands. The composite Risk Assessment Score is the
 * arithmetic average of the four sub-scores.
 */
export const RISK_SCALE_CONFIG: {
  scale: { min: number; max: number };
  compositeFormula: string;
  benchmark: string;
  subCategories: RiskSubCategoryConfig[];
} = {
  scale: { min: RISK_SCALE_MIN, max: RISK_SCALE_MAX },
  compositeFormula: 'Risk Score = (Financial + Market + Operational + Compliance) ÷ 4',
  benchmark: '≤ 3.0 (low risk)',

  subCategories: [
    // ── Financial Risk ────────────────────────────────────────────────────
    // Primary drivers: DSCR and LTV bands.
    // Low DSCR = high financial risk; high LTV = high financial risk.
    // Score = max(DSCR band score, LTV band score).
    {
      key: 'financial',
      name: 'Financial Risk',
      description:
        'Leverage and debt-service capacity. Derived from DSCR and LTV — never manually entered.',
      derivedFrom: ['DSCR', 'LTV'],
      bands: [
        // DSCR bands (primary): higher DSCR = lower risk
        // Band thresholds represent DSCR values
        { upperBound: 0.90,  score: 10, label: 'Critical — DSCR < 0.90' },
        { upperBound: 1.00,  score: 8,  label: 'Severe — DSCR 0.90–1.00' },
        { upperBound: 1.10,  score: 6,  label: 'Elevated — DSCR 1.00–1.10' },
        { upperBound: 1.25,  score: 4,  label: 'Moderate — DSCR 1.10–1.25' },
        { upperBound: 1.50,  score: 2,  label: 'Low — DSCR 1.25–1.50' },
        { upperBound: Infinity, score: 1, label: 'Minimal — DSCR > 1.50' },
      ],
    },

    // ── Market Risk ───────────────────────────────────────────────────────
    // Primary drivers: market volatility, hazard flags, DOM trends.
    // Deferred until market data feed is integrated — returns null
    // with MARKET_DATA_DEFERRED reason code.
    {
      key: 'market',
      name: 'Market Risk',
      description:
        'Market conditions, pricing volatility, and environmental hazard flags. '
        + 'Derived from YoY sold price variance, demand growth, and hazard data — never manually entered.',
      derivedFrom: ['YOY_SOLD_PRICE_VARIANCE', 'DEMAND_GROWTH', 'DOM'],
      bands: [
        // YoY price decline bands (primary): larger decline = higher risk
        // Band thresholds represent YoY price change percentage
        { upperBound: -15,     score: 10, label: 'Critical — YoY decline > 15%' },
        { upperBound: -10,     score: 8,  label: 'Severe — YoY decline 10–15%' },
        { upperBound: -5,      score: 6,  label: 'Elevated — YoY decline 5–10%' },
        { upperBound: 0,       score: 4,  label: 'Moderate — YoY flat to -5%' },
        { upperBound: 5,       score: 2,  label: 'Low — YoY growth 0–5%' },
        { upperBound: Infinity, score: 1, label: 'Minimal — YoY growth > 5%' },
      ],
    },

    // ── Operational Risk ──────────────────────────────────────────────────
    // Primary drivers: occupancy rate, maintenance cost per unit.
    // Low occupancy = high operational risk; high maintenance = high risk.
    {
      key: 'operational',
      name: 'Operational Risk',
      description:
        'Property performance and upkeep burden. Derived from occupancy rate '
        + 'and maintenance cost per unit — never manually entered.',
      derivedFrom: ['OCCUPANCY', 'MAINTENANCE_COST_PER_UNIT'],
      bands: [
        // Occupancy bands (primary): lower occupancy = higher risk
        // Band thresholds represent occupancy percentage
        { upperBound: 50,      score: 10, label: 'Critical — occupancy < 50%' },
        { upperBound: 65,      score: 8,  label: 'Severe — occupancy 50–65%' },
        { upperBound: 75,      score: 6,  label: 'Elevated — occupancy 65–75%' },
        { upperBound: 85,      score: 4,  label: 'Moderate — occupancy 75–85%' },
        { upperBound: 92,      score: 2,  label: 'Low — occupancy 85–92%' },
        { upperBound: Infinity, score: 1, label: 'Minimal — occupancy > 92%' },
      ],
    },

    // ── Compliance Risk ───────────────────────────────────────────────────
    // Primary driver: KPI #33 (Compliance Rate).
    // Low compliance rate = high compliance risk.
    {
      key: 'compliance',
      name: 'Compliance Risk',
      description:
        'Regulatory and standards adherence. Derived from KPI #33 Compliance Rate — '
        + 'never manually entered.',
      derivedFrom: ['COMPLIANCE_RATE'],
      bands: [
        // Compliance rate bands: lower compliance = higher risk
        // Band thresholds represent compliance percentage
        { upperBound: 50,      score: 10, label: 'Critical — compliance < 50%' },
        { upperBound: 65,      score: 8,  label: 'Severe — compliance 50–65%' },
        { upperBound: 75,      score: 6,  label: 'Elevated — compliance 65–75%' },
        { upperBound: 85,      score: 4,  label: 'Moderate — compliance 75–85%' },
        { upperBound: 95,      score: 2,  label: 'Low — compliance 85–95%' },
        { upperBound: Infinity, score: 1, label: 'Minimal — compliance > 95%' },
      ],
    },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Given a raw input value and a sub-category's bands, return the risk score.
 * Bands are scanned in order; the first band whose upperBound >= value wins.
 *
 * Returns RISK_SCALE_MAX if no band matches (defensive — should not happen
 * if bands end with Infinity).
 */
export function scoreFromBands(value: number, bands: RiskBand[]): number {
  for (const band of bands) {
    if (value <= band.upperBound) {
      return band.score;
    }
  }
  return RISK_SCALE_MAX;
}

/**
 * Returns the label for a given risk score.
 */
export function riskLabel(score: number): string {
  if (score <= 2) return 'Low';
  if (score <= 4) return 'Moderate';
  if (score <= 6) return 'Elevated';
  if (score <= 8) return 'Severe';
  return 'Critical';
}
