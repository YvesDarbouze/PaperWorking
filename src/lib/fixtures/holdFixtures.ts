/**
 * Hold Fixture Projects Generator & Engine Runner (HX-1…HX-5)
 *
 * Implements deterministic fixture configurations defined in docs/spec/hd-hold-fixtures-v1.md.
 *
 * NAMESPACE RULE: Fixture Projects seed strictly under the fixture namespace (`fixture:hx-N`),
 * completely isolated from DEMO_FINANCIALS or production user records.
 */

import { HoldRegistry, createEmptyHoldRegistry } from '../types/hold-registry';
import { deriveHoldOperations, HoldOperationsInput, HoldOperationsResult } from '../engine/deriveHoldOperations';

export interface HXFixtureConfig {
  fixtureId: string;
  name: string;
  input: HoldOperationsInput;
}

/**
 * Creates the deterministic inputs for HX-1…HX-5 per §1 of docs/spec/hd-hold-fixtures-v1.md.
 */
export function getHXFixtureConfigs(seedDate: string = '2026-01-01T00:00:00.000Z'): HXFixtureConfig[] {
  // Base DEMO_FINANCIALS property basis:
  // Purchase Price: $279,000, Loan Amount: $223,200 (80% LTV), Rate: 6.5%, Term: 30yr (Debt Service $16,930/yr → $1,410.83/mo)
  // Rent: $1,950/mo, Vacancy: 7%
  const baseDebtService = 16930;
  const baseRent = 1950;
  const basePurchasePrice = 279000;
  const baseLoanAmount = 223200;
  const baseRate = 6.5;
  const baseTermYears = 30;

  // ── HX-1: Baseline Carry (Rental) ──────────────────────────────────────────
  const hx1Registry: HoldRegistry = {
    ...createEmptyHoldRegistry(),
    holdingCosts: {
      tax:         { category: 'tax',         monthlyAmount: 200, sourceTag: 'user_actual', updatedAt: seedDate },
      insurance:   { category: 'insurance',   monthlyAmount: 58,  sourceTag: 'user_actual', updatedAt: seedDate, carriedFromFund: true },
      security:    { category: 'security',    monthlyAmount: 0,   sourceTag: 'user_actual', updatedAt: seedDate },
      maintenance: { category: 'maintenance', monthlyAmount: 195, sourceTag: 'user_actual', updatedAt: seedDate },
      utilities:   { category: 'utilities',   monthlyAmount: 125, sourceTag: 'user_actual', updatedAt: seedDate },
      management:  { category: 'management',  monthlyAmount: 195, sourceTag: 'user_actual', updatedAt: seedDate }, // 10% of $1,950
      HOA:         { category: 'HOA',         monthlyAmount: 0,   sourceTag: 'user_actual', updatedAt: seedDate },
      capex:       { category: 'capex',       monthlyAmount: 0,   sourceTag: 'user_actual', updatedAt: seedDate },
    },
  };

  const hx1Config: HXFixtureConfig = {
    fixtureId: 'fixture:hx-1',
    name: 'HX-1 Baseline carry (rental)',
    input: {
      projectId: 'fixture:hx-1',
      isFixture: true,
      dispositionType: 'RENT',
      purchasePrice: basePurchasePrice,
      loanAmount: baseLoanAmount,
      loanInterestRate: baseRate,
      loanTermYears: baseTermYears,
      annualDebtService: baseDebtService,
      grossScheduledRent: baseRent,
      vacancyRatePercent: 7,
      registry: hx1Registry,
      seedDate,
    },
  };

  // ── HX-2: Flip Runway (Sale) ───────────────────────────────────────────────
  const hx2Registry: HoldRegistry = {
    ...hx1Registry,
    rehabBudget: { projected: 40000, sourceTag: 'user_assumption', updatedAt: seedDate },
    rehabSpend: [
      { id: 'sp-1', amount: 9500, date: '2026-01-10T00:00:00.000Z', category: 'capex', note: 'Demo & framing', editHistory: [], sourceTag: 'user_actual', createdAt: seedDate },
      { id: 'sp-2', amount: 8200, date: '2026-02-01T00:00:00.000Z', category: 'capex', note: 'Plumbing rough-in', editHistory: [], sourceTag: 'user_actual', createdAt: seedDate },
      { id: 'sp-3', amount: 5800, date: '2026-02-24T00:00:00.000Z', category: 'capex', note: 'Electrical rough-in', editHistory: [], sourceTag: 'user_actual', createdAt: seedDate },
    ],
    listPriceSale: 365000,
  };

  const hx2Config: HXFixtureConfig = {
    fixtureId: 'fixture:hx-2',
    name: 'HX-2 Flip runway (sale)',
    input: {
      projectId: 'fixture:hx-2',
      isFixture: true,
      dispositionType: 'SALE',
      purchasePrice: basePurchasePrice,
      loanAmount: baseLoanAmount,
      loanInterestRate: baseRate,
      loanTermYears: baseTermYears,
      annualDebtService: baseDebtService,
      grossScheduledRent: baseRent,
      vacancyRatePercent: 7,
      listPriceSale: 365000,
      rehabBudget: 40000,
      rehabCompletionTargetDays: 120,
      registry: hx2Registry,
      seedDate,
      holdStartDate: seedDate,
    },
  };

  // ── HX-3: Budget Alert Threshold ───────────────────────────────────────────
  const hx3Registry: HoldRegistry = {
    ...hx2Registry,
    rehabSpend: [
      ...hx2Registry.rehabSpend,
      { id: 'sp-4', amount: 8600, date: '2026-03-11T00:00:00.000Z', category: 'capex', note: 'Drywall & paint', editHistory: [], sourceTag: 'user_actual', createdAt: seedDate },
    ],
  };

  const hx3Config: HXFixtureConfig = {
    fixtureId: 'fixture:hx-3',
    name: 'HX-3 Budget alert threshold',
    input: {
      ...hx2Config.input,
      projectId: 'fixture:hx-3',
      registry: hx3Registry,
    },
  };

  // ── HX-4: Buffered Rent Projection ─────────────────────────────────────────
  const hx4Registry: HoldRegistry = {
    ...hx1Registry,
    reservePolicies: {
      vacancyBufferPct: 8,
      maintenanceReservePolicy: '10% of gross scheduled rent',
      capexReservePolicy: '10% of rent',
    },
    listingAdLog: [
      { id: 'ad-1', date: '2026-01-15T00:00:00.000Z', channel: 'Zillow Rental Manager', spend: 450, note: 'Featured listing ad package', createdAt: seedDate },
    ],
  };

  const hx4Config: HXFixtureConfig = {
    fixtureId: 'fixture:hx-4',
    name: 'HX-4 Buffered rent projection',
    input: {
      ...hx1Config.input,
      projectId: 'fixture:hx-4',
      vacancyRatePercent: 8,
      registry: hx4Registry,
    },
  };

  // ── HX-5: Approval Threshold ───────────────────────────────────────────────
  const hx5Registry: HoldRegistry = {
    ...hx1Registry,
    rehabSpend: [
      { id: 'sp-5', amount: 1850, date: '2026-01-20T00:00:00.000Z', category: 'maintenance', note: 'Water heater repair', editHistory: [], sourceTag: 'user_actual', createdAt: seedDate },
      { id: 'sp-6', amount: 2400, date: '2026-01-22T00:00:00.000Z', category: 'maintenance', note: 'HVAC unit replacement', editHistory: [], sourceTag: 'user_actual', createdAt: seedDate, isPendingApproval: true } as any,
    ],
  };

  const hx5Config: HXFixtureConfig = {
    fixtureId: 'fixture:hx-5',
    name: 'HX-5 Approval threshold',
    input: {
      ...hx1Config.input,
      projectId: 'fixture:hx-5',
      registry: hx5Registry,
    },
  };

  return [hx1Config, hx2Config, hx3Config, hx4Config, hx5Config];
}

/**
 * Runs deriveHoldOperations against all five HX fixtures and returns the results.
 */
export function runHXFixtures(): { config: HXFixtureConfig; result: HoldOperationsResult }[] {
  const configs = getHXFixtureConfigs();
  return configs.map((config) => ({
    config,
    result: deriveHoldOperations(config.input),
  }));
}
