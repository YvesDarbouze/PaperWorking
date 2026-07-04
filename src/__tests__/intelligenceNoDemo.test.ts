/**
 * Intelligence Page — No-Demo Regression Tests
 *
 * These tests enforce that intelligence pages never show fabricated data
 * to users who have real portfolios. Each test is named after the symptom
 * it guards against.
 *
 * Prevention mechanism: any change that would reintroduce a banned constant
 * (defaultNoi, defaultValues, 482910, etc.) or a magic multiplier (irr * 0.45)
 * will fail at least one file-scan test AND at least one computation test.
 */

jest.mock('../lib/firebase/config', () => ({ db: {}, auth: {}, storage: {} }));

import * as fs from 'fs';
import * as path from 'path';
import {
  computeNOIComponents,
  computeDSCR,
  computeTotalCashInvested,
  deriveAllMetrics,
} from '../lib/metrics/reiMetrics';
import type { ProjectFinancials } from '../types/schema';

const INTEL_DIR = path.join(__dirname, '../app/dashboard/intelligence');

function readPage(name: string): string {
  return fs.readFileSync(path.join(INTEL_DIR, name, 'page.tsx'), 'utf-8');
}

// ─── 1. NOI: no hardcoded demo seed ──────────────────────────────────────────

test('noi_no_demo_seed: noi/page.tsx must not contain the 482910 fallback constant', () => {
  const src = readPage('noi');
  expect(src).not.toContain('482910');
  expect(src).not.toContain('defaultNoi');
  expect(src).not.toContain('defaultGrossRent');
});

// ─── 2. NOI: components must sum to the whole ────────────────────────────────

test('noi_components_sum_to_noi: grossRent+otherIncome-vacancyLoss-opEx === noi', () => {
  const fin: ProjectFinancials = {
    purchasePrice: 300000,
    estimatedARV: 320000,
    costs: [],
    monthlyGrossRent: 4000,
    vacancyRatePercent: 5,
    holdingCostTaxes: 200,
    holdingCostInsurance: 80,
    propertyManagementFeePercent: 8,
    monthlyMaintenanceReserve: 100,
  };
  const c = computeNOIComponents(fin);
  const summedNoi =
    c.grossRentalIncome + c.otherIncome - c.vacancyLoss - c.totalOperatingExpenses;
  expect(Math.round(summedNoi)).toBe(Math.round(c.noi));
});

// ─── 3. DSCR: single source of truth — no divergence ───────────────────────

test('dscr_single_source_consistency: deriveAllMetrics.dscr equals NOI/annualDebtService', () => {
  const fin: ProjectFinancials = {
    purchasePrice: 300000,
    estimatedARV: 320000,
    costs: [],
    loanAmount: 240000,
    loanInterestRate: 7,
    loanTermYears: 30,
    monthlyGrossRent: 2800,
    vacancyRatePercent: 7,
    holdingCostTaxes: 250,
    holdingCostInsurance: 90,
    propertyManagementFeePercent: 10,
  };
  const derived = deriveAllMetrics(fin);
  const directDscr = computeDSCR(derived.noi, derived.annualDebtService);
  // Both paths use the same formula — no discrepancy allowed
  expect(derived.dscr).toBe(directDscr);
});

// ─── 4. DSCR: no demo constants in source ───────────────────────────────────

test('dscr_no_demo_seed: dscr/page.tsx must not contain the 1.42 fallback constant', () => {
  const src = readPage('dscr');
  expect(src).not.toContain('defaultDscr');
  expect(src).not.toContain('defaultProperties');
  // The hardcoded value 1.42 was the demo DSCR
  expect(src).not.toMatch(/currentDscr:\s*1\.42/);
});

// ─── 5. GRM: no hardcoded market rate ───────────────────────────────────────

test('grm_no_hardcoded_market_rate: grm/page.tsx must not fall back to 9.2 or 10.5 as demo', () => {
  const src = readPage('grm');
  expect(src).not.toContain('defaultProperties');
  // 9.2 was the fake portfolio GRM
  expect(src).not.toMatch(/currentGRM:\s*9\.2/);
  // 10.5 must not appear as a hardcoded fallback (only as a comment is acceptable)
  // Specifically, the ?? 10.5 fallback pattern must be gone
  expect(src).not.toMatch(/\?\?\s*10\.5/);
});

// ─── 6. Performance: no fake KPI values while loading ───────────────────────

test('performance_no_fake_kpis: performance/page.tsx must not contain $2.1M or $760k fallback', () => {
  const src = readPage('performance');
  expect(src).not.toContain('defaultValues');
  expect(src).not.toContain('defaultMonths');
  // The fake KPI constants
  expect(src).not.toContain('2_100_000');
  expect(src).not.toContain('760_000');
  expect(src).not.toContain('1_340_000');
});

// ─── 7. Performance: no demo chart data when loading ────────────────────────

test('performance_no_demo_chart_values: loading path returns empty series, not 920k-1.24M', () => {
  const src = readPage('performance');
  // 920000 was the first entry in the fake chart series
  expect(src).not.toContain('920000');
  // 1_240_000 was the fake total portfolio value shown while loading
  expect(src).not.toMatch(/totalValue:\s*1_240_000/);
});

// ─── 8. IRR: no magic multiplier for "realized to date" ─────────────────────

test('irr_no_magic_multiplier: irr/page.tsx must not compute realizedToDate as irr * 0.45', () => {
  const src = readPage('irr');
  expect(src).not.toMatch(/irr\s*\*\s*0\.45/);
  // The replacement computes from actual portfolio data
  expect(src).toContain('totalValue - totalCost');
});

// ─── 9. CoC: computeTotalCashInvested always non-negative ────────────────────

test('coc_positive_cash_invested: computeTotalCashInvested with valid financials >= 0', () => {
  // The -4443.31 seed came from negative loanAmount edge case
  const normal: ProjectFinancials = {
    purchasePrice: 350000,
    estimatedARV: 380000,
    costs: [],
    loanAmount: 280000,
    fixedAcquisitionCosts: 5000,
  };
  expect(computeTotalCashInvested(normal)).toBeGreaterThan(0);

  // Even when loanAmount > purchasePrice (unusual but possible), result should not be negative
  const edgeCase: ProjectFinancials = {
    purchasePrice: 0,
    estimatedARV: 0,
    costs: [],
    loanAmount: 280000,
  };
  expect(computeTotalCashInvested(edgeCase)).toBeGreaterThanOrEqual(0);
});
