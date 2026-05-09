/**
 * REI Metrics — unified facade barrel export
 *
 * Re-exports everything from:
 *  - reiMetrics.ts       (new pure formula functions + DerivedMetrics types)
 *  - dealMetrics.ts      (computeFlipMetrics, computeHoldMetrics, dealHealthColor)
 *  - calculatorUtils.ts  (computeAutopsyMetrics, calculateSeventyPercentRule, etc.)
 *
 * Import from '@/lib/metrics' to access all calculation functions and types.
 */
export * from './reiMetrics';
export * from '@/lib/financials/dealMetrics';
export * from '@/lib/math/calculatorUtils';
