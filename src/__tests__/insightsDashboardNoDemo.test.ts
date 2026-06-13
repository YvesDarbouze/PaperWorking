/**
 * InsightsDashboard — No Mock Data Regression Tests
 *
 * Root cause: getInputsFromProjects() in insights/page.tsx returned a
 * hardcoded DEFAULT_INPUTS constant ({purchasePrice:300000, rent:36000, ...})
 * whenever no projects existed or projects lacked real financials. That value
 * flowed into StressTestProvider → StressTestDashboardContent → InsightsDashboard,
 * producing the same fake 10-year pro-forma for every user and project.
 *
 * Fix:
 *   - DEFAULT_INPUTS constant removed.
 *   - getInputsFromProjects() returns null when validCount === 0, or
 *     totalPurchasePrice === 0, or totalGrossScheduledIncome === 0.
 *   - Hardcoded fallbacks (|| 300000, || 36000, etc.) removed from the
 *     returned object; only real aggregated values are used.
 *   - Stress-test tab is gated: StressTestProvider is only rendered when
 *     selectedInputs is truthy; null → InsightsDashboard with missingFields gate.
 *
 * Projections tab (ProjectionsTabContent) was already correct:
 *   - projectToInsightsInputs() returns null when purchasePrice or
 *     monthlyGrossRent is absent; InsightsDashboard renders the gate.
 *   - An assumptions transparency panel now shows the real inputs used.
 *
 * Evidence:
 *   - Two projects with different real inputs produce different InsightsEngine
 *     curves (one hand-checked).
 *   - A project missing required inputs triggers the gate naming them.
 *   - DEFAULT_INPUTS constant is absent (regression test).
 */

import * as fs from 'fs';
import * as path from 'path';
import { InsightsEngine } from '../lib/services/insightsEngine';
import type { InsightsEngineInputs } from '../lib/services/insightsEngine';
import { projectToInsightsInputs, REQUIRED_INSIGHTS_FIELDS } from '../lib/projections/projectionEngine';
import type { Project } from '../types/schema';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const PAGE     = read('app/dashboard/insights/page.tsx');
const PROJ_ENG = read('lib/projections/projectionEngine.ts');

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — source must contain no fake-data artifacts
   ────────────────────────────────────────────────────────────────────────── */
describe('insights/page.tsx — DEFAULT_INPUTS constant removed', () => {

  it('id_no_default_inputs_const: DEFAULT_INPUTS is not declared as a constant', () => {
    expect(PAGE).not.toMatch(/const DEFAULT_INPUTS\s*[=:]/);
  });

  it('id_no_hardcoded_300k: hardcoded purchase-price fallback 300000 is gone from return value', () => {
    // The || 300000 fallback must not appear in the function return
    expect(PAGE).not.toMatch(/purchasePrice.*\|\|\s*300000/);
  });

  it('id_no_hardcoded_36k: hardcoded rent fallback 36000 is gone from return value', () => {
    expect(PAGE).not.toMatch(/grossScheduledIncome.*\|\|\s*36000/);
  });

  it('id_getInputs_returns_undefined: getInputsFromProjects has an undefined/null return path for empty/missing data', () => {
    // The function must return undefined/null (not DEFAULT_INPUTS) when no real data.
    // Gate: validCount=0 or missing price/rent → early return
    expect(PAGE).toContain('totalPurchasePrice === 0 || totalGrossScheduledIncome === 0) return');
    // Early-exit for empty list
    expect(PAGE).toContain('projectsList.length === 0) return');
    // The return value must NOT be the old DEFAULT_INPUTS constant
    expect(PAGE).not.toContain('return DEFAULT_INPUTS');
  });

  it('id_null_guard_stress_test: StressTestProvider is only rendered when selectedInputs is truthy', () => {
    // The provider must appear inside a selectedInputs truthiness guard
    const providerIdx = PAGE.indexOf('<StressTestProvider');
    const windowBefore = PAGE.slice(Math.max(0, providerIdx - 200), providerIdx);
    expect(windowBefore).toMatch(/selectedInputs\b/);
  });

  it('id_gate_renders_missing_fields: gate block passes REQUIRED_INSIGHTS_FIELDS to InsightsDashboard', () => {
    // When selectedInputs is falsy the page renders InsightsDashboard with missingFields
    expect(PAGE).toContain('!selectedInputs');
    expect(PAGE).toMatch(/!selectedInputs[\s\S]{0,400}REQUIRED_INSIGHTS_FIELDS/);
  });

  it('id_assumptions_panel_present: ProjectionsTabContent renders an assumptions transparency panel', () => {
    // Check for "Assumptions panel" comment or the known label keys in the panel
    expect(PAGE).toContain('Assumptions panel');
    expect(PAGE).toContain('Purchase Price');
    expect(PAGE).toContain('Annual Rent');
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — projectionEngine gate and required fields
   ────────────────────────────────────────────────────────────────────────── */
describe('projectionEngine.ts — honest gate', () => {

  it('pe_requires_purchase_price: returns null when purchasePrice is 0', () => {
    expect(PROJ_ENG).toContain('purchasePrice <= 0 || monthlyGrossRent <= 0');
  });

  it('pe_required_fields_named: REQUIRED_INSIGHTS_FIELDS lists Purchase Price and Monthly Gross Rent', () => {
    expect(REQUIRED_INSIGHTS_FIELDS).toContain('Purchase Price');
    expect(REQUIRED_INSIGHTS_FIELDS).toContain('Monthly Gross Rent');
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — projectToInsightsInputs gates correctly
   ────────────────────────────────────────────────────────────────────────── */
describe('projectToInsightsInputs — missing-input gate', () => {

  function makeProject(overrides: Partial<Project['financials']> = {}): Project {
    return {
      id: 'test',
      propertyName: 'Test Property',
      currentPhase: 3,
      financials: {
        purchasePrice: 300000,
        monthlyGrossRent: 2500,
        ...overrides,
      } as any,
    } as unknown as Project;
  }

  it('gate_returns_null_no_financials: project with no financials block → null', () => {
    const p = { id: 'x', financials: undefined } as unknown as Project;
    expect(projectToInsightsInputs(p)).toBeNull();
  });

  it('gate_returns_null_missing_purchase_price: purchasePrice = 0 → null', () => {
    expect(projectToInsightsInputs(makeProject({ purchasePrice: 0 }))).toBeNull();
  });

  it('gate_returns_null_missing_rent: monthlyGrossRent = 0 → null', () => {
    expect(projectToInsightsInputs(makeProject({ monthlyGrossRent: 0 }))).toBeNull();
  });

  it('gate_returns_inputs_when_complete: both fields present → non-null InsightsEngineInputs', () => {
    const result = projectToInsightsInputs(makeProject());
    expect(result).not.toBeNull();
    expect(result?.purchasePrice).toBe(300000);
    expect(result?.grossScheduledIncome).toBe(2500 * 12);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — Two different real projects produce different, explainable curves
   ────────────────────────────────────────────────────────────────────────── */
describe('InsightsEngine — different inputs produce different curves', () => {

  // Project A: modest suburban rental — $200k, $1,500/mo, 20% down, 6%
  const INPUTS_A: InsightsEngineInputs = {
    purchasePrice: 200_000,
    rehabBudget: 10_000,
    downPayment: 40_000,       // 20% down
    interestRate: 6.0,
    amortizationTerm: 30,
    grossScheduledIncome: 18_000,  // $1,500/mo × 12
    operatingExpenses: 5_000,
    vacancyRate: 5.0,
    marketData: { daysOnMarket: 40, medianHomePrice: 210_000, averageRent: 1_500 },
  };

  // Project B: higher-value urban rental — $500k, $3,800/mo, 25% down, 7%
  const INPUTS_B: InsightsEngineInputs = {
    purchasePrice: 500_000,
    rehabBudget: 30_000,
    downPayment: 125_000,     // 25% down
    interestRate: 7.0,
    amortizationTerm: 30,
    grossScheduledIncome: 45_600, // $3,800/mo × 12
    operatingExpenses: 12_000,
    vacancyRate: 6.0,
    marketData: { daysOnMarket: 20, medianHomePrice: 520_000, averageRent: 3_800 },
  };

  const resultA = InsightsEngine.calculate(INPUTS_A);
  const resultB = InsightsEngine.calculate(INPUTS_B);

  it('diverge_noi_y1: Project B Year-1 NOI > Project A Year-1 NOI (higher rent base)', () => {
    expect(resultB.shortTerm.noi).toBeGreaterThan(resultA.shortTerm.noi);
  });

  it('diverge_caprate: higher-rent project B has different cap rate from A', () => {
    expect(resultB.shortTerm.capRate).not.toBeCloseTo(resultA.shortTerm.capRate, 1);
  });

  it('diverge_dscr_y1: DSCR differs between projects (different leverage & income scale)', () => {
    // Both DSCRs are near breakeven but must not be identical — different inputs → different values
    expect(resultA.longTerm.dscr[0]).not.toEqual(resultB.longTerm.dscr[0]);
    // Additionally, cash-on-cash returns must differ (different down payment ratios)
    expect(resultA.shortTerm.cashOnCash).not.toBeCloseTo(resultB.shortTerm.cashOnCash, 1);
  });

  it('diverge_y10_noi: Year-10 NOI array values diverge (growth compounds differently)', () => {
    const a10 = resultA.longTerm.noi[9];
    const b10 = resultB.longTerm.noi[9];
    expect(b10).toBeGreaterThan(a10);
    // The ratio should be roughly proportional to the income difference
    expect(b10 / a10).toBeGreaterThan(2);
  });

  // Hand-check for Project A: Year-1 baseline verification
  // EGI = 18000 * (1 - 0.05) = 17100
  // NOI = 17100 - 5000 = 12100
  // Cap Rate = 12100 / 200000 * 100 = 6.05%
  it('handcheck_a_y1_noi: Project A Year-1 NOI = $12,100 (hand-calculated)', () => {
    expect(resultA.shortTerm.noi).toBe(12_100);
  });

  it('handcheck_a_caprate: Project A cap rate = 6.05% (NOI÷Price×100)', () => {
    expect(resultA.shortTerm.capRate).toBe(6.05);
  });

  it('handcheck_a_grm: Project A GRM = 11.11 (200000÷18000)', () => {
    // 200000 / 18000 = 11.111... → rounded to 2dp = 11.11
    expect(resultA.shortTerm.grm).toBe(11.11);
  });

  it('handcheck_a_oer: Project A OER = 29.24% (5000÷17100×100)', () => {
    // 5000 / 17100 * 100 = 29.239...% → rounded to 2dp = 29.24
    expect(resultA.shortTerm.oer).toBe(29.24);
  });

  it('handcheck_a_y10_noi_growth: Project A Year-10 NOI grows at 3% compound', () => {
    // EGI grows at 3% income growth, OpEx at 2.5%
    // Year 10 EGI ≈ 17100 * 1.03^9 ≈ 22303; OpEx ≈ 5000 * 1.025^9 ≈ 6234
    // NOI ≈ 22303 - 6234 ≈ 16069 (rough; exact from engine)
    const y10noi = resultA.longTerm.noi[9];
    expect(y10noi).toBeGreaterThan(14_000); // conservative floor
    expect(y10noi).toBeLessThan(20_000);    // sanity ceiling
  });

});
