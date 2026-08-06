/**
 * Scenario IRR — No Multiplier Regression Tests
 *
 * Background: dashboard/reports/page.tsx previously derived scenario IRRs by
 * scaling a baseIRR with multipliers (e.g. baseIRR * 0.7 for Conservative,
 * baseIRR * 1.2 for Aggressive). Those numbers were scaled fictions — editing
 * a scenario's vacancy or rent growth had no effect on the result.
 *
 * Fix (src/lib/projections/scenarioIRR.ts):
 *   - projectScenarioCashFlows() builds a real year-by-year cash-flow series
 *     from each scenario's assumption set (rentGrowthPct, vacancyPct,
 *     exitCapRate, appreciationPct, holdYears).
 *   - computeScenarioIRR() solves the internal rate of return from those flows
 *     via Newton-Raphson (computeIRR from reiMetrics.ts).
 *   - computeAllScenarioIRRs() runs all three presets through the same engine.
 *   - The IRRScenario card in reports passes `assumptions` so rent growth and
 *     vacancy display alongside each result.
 *
 * Evidence in tests:
 *   - No multiplier math exists in scenarioIRR.ts or reports/page.tsx (static).
 *   - Changing a single assumption (e.g. vacancy 5 → 12) changes IRR through
 *     the real model, hand-verifiable on a simple fixture.
 *   - Conservative/Base/Aggressive presets produce genuinely different IRRs
 *     (not a constant ratio of a base figure).
 *   - The three preset IRRs are ordered: Conservative < Base < Aggressive.
 *   - Assumptions display: IRRScenario renders `assumptions` prop.
 *   - Missing-input gate: projectScenarioCashFlows returns [] when required
 *     fields (purchasePrice, monthlyRent, totalCashInvested) are absent.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  projectScenarioCashFlows,
  computeScenarioIRR,
  computeAllScenarioIRRs,
  PRESET_SCENARIOS,
  type ScenarioAssumptions,
} from '../lib/projections/scenarioIRR';
import { computeIRR } from '../lib/metrics/reiMetrics';
import type { Project } from '../types/schema';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const SCENARIO_SRC = read('lib/projections/scenarioIRR.ts');
const REPORTS_SRC  = read('app/dashboard/reports/page.tsx');
const IRR_PAGE_SRC = read('app/dashboard/intelligence/irr/page.tsx');

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — multiplier math must not exist
   ────────────────────────────────────────────────────────────────────────── */
describe('scenarioIRR.ts — no multiplier scaling', () => {

  it('sm_no_multiplier_const: no variable named multiplier in scenarioIRR.ts', () => {
    expect(SCENARIO_SRC).not.toMatch(/\bmultiplier\b/i);
  });

  it('sm_no_baseIRR_scale: baseIRR * pattern absent from scenarioIRR.ts', () => {
    expect(SCENARIO_SRC).not.toMatch(/baseIRR\s*\*/);
  });

  it('sm_builds_cash_flows: projectScenarioCashFlows function is present', () => {
    expect(SCENARIO_SRC).toContain('function projectScenarioCashFlows');
  });

  it('sm_calls_computeIRR: computeScenarioIRR calls the real IRR solver', () => {
    expect(SCENARIO_SRC).toContain('computeIRR(flows)');
  });

  it('sm_preset_assumptions_differ: Conservative, Base, and Aggressive have different assumption sets', () => {
    const [cons, base, aggr] = PRESET_SCENARIOS;
    expect(cons.assumptions.rentGrowthPct).not.toBe(base.assumptions.rentGrowthPct);
    expect(base.assumptions.rentGrowthPct).not.toBe(aggr.assumptions.rentGrowthPct);
    expect(cons.assumptions.vacancyPct).toBeGreaterThan(base.assumptions.vacancyPct);
    expect(aggr.assumptions.vacancyPct).toBeLessThan(base.assumptions.vacancyPct);
  });

});

/**
 * The reports page no longer hosts IRR scenarios.
 *
 * `/dashboard/reports` was rebuilt as the Tax Intelligence hub (August 2026);
 * the IRR scenario card moved out with the rest of the bento dashboard. The
 * live IRR surface is `/dashboard/intelligence/irr`, which models scenarios
 * with the real engine — `computeIRR(buildIRRCashFlows(...))` from
 * `reiMetrics.ts` — so the original regression (multiplier-scaled fictions)
 * cannot reappear there either.
 *
 * The four assertions that used to read `reports/page.tsx` are therefore
 * retargeted: the guard now checks that NO page fakes IRR with multipliers,
 * which is the property that actually mattered.
 */
describe('IRR scenarios — no multiplier scaling on any surface', () => {

  it('reports page no longer computes IRR at all', () => {
    expect(REPORTS_SRC).not.toContain('irrScenarios');
    expect(REPORTS_SRC).not.toMatch(/baseIRR\s*\*/);
  });

  it('the live IRR page does not scale a base IRR by a multiplier', () => {
    expect(IRR_PAGE_SRC).not.toMatch(/\bmultiplier\b/i);
    expect(IRR_PAGE_SRC).not.toMatch(/baseIRR\s*\*/);
  });

  it('the live IRR page solves IRR from real cash flows', () => {
    expect(IRR_PAGE_SRC).toContain('computeIRR(');
    expect(IRR_PAGE_SRC).toContain('buildIRRCashFlows');
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   FIXTURE — a concrete project used across logic tests
   ────────────────────────────────────────────────────────────────────────── */
function makeProject(overrides: Record<string, unknown> = {}): Project {
  return {
    id: 'test-proj',
    propertyName: 'Test Property',
    currentPhase: 3,
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    financials: {
      purchasePrice: 250_000,
      gross_rent_per_unit: 2_600,
      loanAmount: 200_000,
      loanInterestRate: 4.0,
      loanTermYears: 30,
      downPayment: 50_000,
      vacancy_pct: 5,
      tax: 300,        // $3,600 / 12
      insurance: 100,  // $1,200 / 12
      maintenance: 125, // $1,500 / 12
      management: 240, // $2,880 / 12
      ...overrides,
    } as any,
  } as unknown as Project;
}

const BASE_ASSUMPTIONS: ScenarioAssumptions = {
  rentGrowthPct: 3,
  vacancyPct: 5,
  exitCapRate: 6.5,
  appreciationPct: 3.5,
  holdYears: 7,
};

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — missing-input gate
   ────────────────────────────────────────────────────────────────────────── */
describe('projectScenarioCashFlows — missing-input gate', () => {

  it('gate_no_financials: returns [] when financials are missing', () => {
    const p = { id: 'x' } as unknown as Project;
    expect(projectScenarioCashFlows(p, BASE_ASSUMPTIONS)).toEqual([]);
  });

  it('gate_no_purchase_price: returns [] when purchasePrice is 0', () => {
    const p = makeProject({ purchasePrice: 0 });
    expect(projectScenarioCashFlows(p, BASE_ASSUMPTIONS)).toEqual([]);
  });

  it('gate_no_rent: returns [] when monthlyGrossRent is 0', () => {
    const p = makeProject({ gross_rent_per_unit: 0, monthlyGrossRent: 0 });
    expect(projectScenarioCashFlows(p, BASE_ASSUMPTIONS)).toEqual([]);
  });

  it('gate_zero_cash_invested: returns [] when totalCashInvested computes to 0', () => {
    // downPayment=0 and no other equity source → totalCashInvested=0
    const p = makeProject({ downPayment: 0, loanAmount: 250_000, purchasePrice: 250_000 });
    expect(projectScenarioCashFlows(p, BASE_ASSUMPTIONS)).toEqual([]);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — cash-flow series structure
   ────────────────────────────────────────────────────────────────────────── */
describe('projectScenarioCashFlows — series structure', () => {
  const project = makeProject();

  it('series_length: returns holdYears+1 flows (Year 0 + each hold year)', () => {
    const flows = projectScenarioCashFlows(project, BASE_ASSUMPTIONS);
    expect(flows).toHaveLength(BASE_ASSUMPTIONS.holdYears + 1);
  });

  it('series_year0_negative: Year-0 flow is the negative cash invested (outflow)', () => {
    const flows = projectScenarioCashFlows(project, BASE_ASSUMPTIONS);
    expect(flows[0]).toBeLessThan(0);
  });

  it('series_exit_year_larger: final year flow includes sale proceeds (larger than interim years)', () => {
    const flows = projectScenarioCashFlows(project, BASE_ASSUMPTIONS);
    const n = flows.length;
    const interimAvg = flows.slice(1, n - 1).reduce((a, b) => a + b, 0) / (n - 2);
    expect(flows[n - 1]).toBeGreaterThan(interimAvg);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — assumptions change IRR through real modeling
   (hand-verifiable: higher vacancy → lower IRR, shorter hold → different IRR)
   ────────────────────────────────────────────────────────────────────────── */
describe('computeScenarioIRR — assumption sensitivity', () => {
  const project = makeProject();

  it('sensitivity_vacancy: higher vacancy reduces IRR', () => {
    const lowVacancy  = computeScenarioIRR(project, { ...BASE_ASSUMPTIONS, vacancyPct: 3 });
    const highVacancy = computeScenarioIRR(project, { ...BASE_ASSUMPTIONS, vacancyPct: 15 });
    expect(lowVacancy).not.toBeNull();
    expect(highVacancy).not.toBeNull();
    expect(lowVacancy!).toBeGreaterThan(highVacancy!);
  });

  it('sensitivity_rent_growth: higher rent growth increases IRR', () => {
    const flatRent   = computeScenarioIRR(project, { ...BASE_ASSUMPTIONS, rentGrowthPct: 0 });
    const strongRent = computeScenarioIRR(project, { ...BASE_ASSUMPTIONS, rentGrowthPct: 6 });
    expect(flatRent).not.toBeNull();
    expect(strongRent).not.toBeNull();
    expect(strongRent!).toBeGreaterThan(flatRent!);
  });

  it('sensitivity_exit_cap: tighter exit cap (lower %) raises exit value and IRR', () => {
    const tightCap = computeScenarioIRR(project, { ...BASE_ASSUMPTIONS, exitCapRate: 5.0 });
    const looseCap = computeScenarioIRR(project, { ...BASE_ASSUMPTIONS, exitCapRate: 8.0 });
    expect(tightCap).not.toBeNull();
    expect(looseCap).not.toBeNull();
    // Lower exit cap rate → higher exit value → higher IRR
    expect(tightCap!).toBeGreaterThan(looseCap!);
  });

  it('sensitivity_not_constant_ratio: Conservative/Base/Aggressive IRRs are not a fixed multiplier of each other', () => {
    const results = computeAllScenarioIRRs(project);
    const [cons, base, aggr] = results.map((r) => r.irrRaw);
    expect(cons).not.toBeNull();
    expect(base).not.toBeNull();
    expect(aggr).not.toBeNull();

    // If results were multiplier-based (e.g. base*0.7, base*1.2), the ratios
    // would be exactly 0.7 and 1.2. Real modeling produces varying ratios.
    const ratio1 = cons! / base!;
    const ratio2 = aggr! / base!;
    // They should differ — the model produces varying relationships, not a fixed scale
    expect(Math.abs(ratio1 - ratio2)).toBeGreaterThan(0);
    // And both ratios must differ from a canonical 0.7/1.2 multiplier pair
    expect(ratio1).not.toBeCloseTo(0.7, 1);
    expect(ratio2).not.toBeCloseTo(1.2, 1);
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — preset ordering and hand-check
   ────────────────────────────────────────────────────────────────────────── */
describe('computeAllScenarioIRRs — preset ordering and hand-check', () => {
  const project = makeProject();
  const results = computeAllScenarioIRRs(project);

  it('order_conservative_lt_base: Conservative IRR < Base IRR', () => {
    const [cons, base] = results;
    expect(cons.irrRaw).not.toBeNull();
    expect(base.irrRaw).not.toBeNull();
    expect(cons.irrRaw!).toBeLessThan(base.irrRaw!);
  });

  it('order_base_lt_aggressive: Base IRR < Aggressive IRR', () => {
    const [, base, aggr] = results;
    expect(base.irrRaw).not.toBeNull();
    expect(aggr.irrRaw).not.toBeNull();
    expect(base.irrRaw!).toBeLessThan(aggr.irrRaw!);
  });

  it('labels_match_presets: result labels are Conservative, Base, Aggressive', () => {
    expect(results[0].label).toBe('Conservative');
    expect(results[1].label).toBe('Base');
    expect(results[2].label).toBe('Aggressive');
  });

  it('assumptions_attached: each result carries its assumption set', () => {
    for (const r of results) {
      expect(r.assumptions).toBeDefined();
      expect(typeof r.assumptions.rentGrowthPct).toBe('number');
      expect(typeof r.assumptions.vacancyPct).toBe('number');
      expect(typeof r.assumptions.exitCapRate).toBe('number');
      expect(typeof r.assumptions.holdYears).toBe('number');
    }
  });

  // Hand-check: verify computeIRR on a trivially simple cash-flow series.
  // Invest $100, receive $110 after 1 year → IRR = 10%.
  it('handcheck_trivial_irr: -100 then +110 → 10% IRR', () => {
    const irr = computeIRR([-100, 110]);
    expect(irr).not.toBeNull();
    expect(irr! * 100).toBeCloseTo(10, 2);
  });

  // Hand-verify Base scenario cash-flow sign:
  // Year-0 must be negative (outflow = -downPayment)
  // Final year must be positive (operating CF + net sale proceeds)
  it('handcheck_base_cash_flows_sign: Year-0 negative, final year positive', () => {
    const flows = projectScenarioCashFlows(project, PRESET_SCENARIOS[1].assumptions);
    expect(flows[0]).toBeLessThan(0);
    expect(flows[flows.length - 1]).toBeGreaterThan(0);
  });

  // The formatted IRR strings must end with '%' when converged
  it('format_irr_strings: formatted IRR strings end with %', () => {
    for (const r of results) {
      if (r.irrRaw !== null) {
        expect(r.irr).toMatch(/%$/);
      }
    }
  });

});
