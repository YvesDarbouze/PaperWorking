/**
 * Single Named Hold-Operations Engine: deriveHoldOperations
 *
 * PaperWorking REIL Phase 3 (Hold) Operational Derivations
 * Single-function law (SKILL.md Rule 5): All Hold operational derivations
 * (monthly carry, rehab spend variance, reserve policies, flip runway)
 * live strictly within this named engine.
 *
 * No inline math in components, routes, reports, or seeds.
 */

import { HoldRegistry, HoldingCostCategory, HOLDING_COST_CATEGORIES } from '../types/hold-registry';
import { calculateAmortization } from '../utils/reiCalculators';

// ── Types for Engine Input & Output ──────────────────────────────────────────

export interface HoldOperationsInput {
  projectId: string;
  isFixture?: boolean;
  dispositionType: 'RENT' | 'LEASE' | 'SALE';
  
  // Property & Acquisition / Fund Basis
  purchasePrice: number;
  loanAmount: number;
  loanInterestRate: number;
  loanTermYears: number;
  annualDebtService?: number; // Sourced from Fund actuals / shared amortization
  grossScheduledRent: number; // Monthly gross scheduled rent
  vacancyRatePercent: number;

  // Hold Registry State
  registry: HoldRegistry;

  // Sale Path Specifics (HX-2, HX-3, SALE contexts)
  listPriceSale?: number;
  rehabBudget?: number;
  rehabCompletionTargetDays?: number; // Offsets from seed/start date
  seedDate?: string;                  // ISO 8601 seed/start date
  holdStartDate?: string;             // ISO 8601 date
}

export interface MonthlyCategoryBreakdown {
  category: HoldingCostCategory;
  monthlyAmount: number;
  isProjected: boolean;
  sourceTag: string;
}

export interface HoldOperationsResult {
  // 1. Monthly Carry
  loanCarryMonthly: number;
  categoryMonthlies: Record<HoldingCostCategory, MonthlyCategoryBreakdown>;
  totalCategoryMonthly: number;
  monthlyCarry: number; // loanCarryMonthly + totalCategoryMonthly

  // 2. Rehab Spend & Budget Variance
  rehabBudget: number;
  spendToDate: number;       // Sum of actual rehabSpend entries (excluding pending_approval)
  pendingApprovalSpend: number; // Pending approval entries (excluded from actuals boundary per HX-5)
  budgetVariance: number;    // rehabBudget - spendToDate
  budgetVariancePct: number; // (spendToDate / rehabBudget) * 100
  is80PercentBudgetCrossed: boolean; // True if spendToDate / rehabBudget >= 0.80 (HX-3)

  // 3. Reserve Policy Monthlies (Decision H-3)
  projectedReserveMonthlies: {
    vacancyCreditLossMonthly: number;
    repairsMaintenanceReserveMonthly: number;
    replacementReservesCapExMonthly: number;
  };
  reserveStatuses: {
    type: 'vacancy' | 'maintenance' | 'capex';
    status: 'unfunded' | 'partially_funded' | 'funded';
  }[];

  // 4. Marketing Spend Exclusion (Decision H-4)
  marketingSpendToDate: number; // Sum of listingAdLog spend (proven ABSENT from monthlyCarry and opex)

  // 5. Flip Runway (SALE path contexts only - HX-2, HX-3)
  runway?: {
    listPriceSale: number;
    projectedMargin: number;       // listPriceSale - (purchasePrice + rehabBudget)
    cumulativeCarryToDate: number;
    cumulativeCostToDate: number;  // cumulativeCarryToDate + spendToDate
    remainingMargin: number;       // projectedMargin - cumulativeCostToDate
    daysRemainingUntilErosion: number;
    marginErosionDate: string;     // ISO 8601 date when margin reaches $0
  };
}

// ── The Single Named Engine ──────────────────────────────────────────────────

export function deriveHoldOperations(input: HoldOperationsInput): HoldOperationsResult {
  const {
    loanAmount,
    loanInterestRate,
    loanTermYears,
    annualDebtService: providedDebtService,
    grossScheduledRent,
    vacancyRatePercent,
    registry,
    dispositionType,
    purchasePrice,
    listPriceSale = registry.listPriceSale || 0,
    rehabBudget: providedRehabBudget = registry.rehabBudget?.actual ?? registry.rehabBudget?.projected ?? 0,
    seedDate = new Date().toISOString(),
    holdStartDate = seedDate,
  } = input;

  // 1. Loan Carry (Sourced from shared amortization utility / Fund debt service)
  let annualDebtService = providedDebtService || 0;
  if (!annualDebtService && loanAmount > 0 && loanInterestRate > 0 && loanTermYears > 0) {
    const amort = calculateAmortization(loanAmount, loanInterestRate, loanTermYears * 12);
    annualDebtService = amort.annualDebtService;
  }
  const loanCarryMonthly = Math.round((annualDebtService / 12) * 100) / 100;

  // 2. Category Monthlies (Canonical 8 categories)
  const categoryMonthlies = {} as Record<HoldingCostCategory, MonthlyCategoryBreakdown>;
  let totalCategoryMonthly = 0;

  for (const cat of HOLDING_COST_CATEGORIES) {
    const rec = registry.holdingCosts[cat];
    let monthlyAmount = rec?.monthlyAmount || 0;

    // Management fee rule (BUG-8): 10% of gross scheduled rent if percentage policy, else direct monthly
    if (cat === 'management' && monthlyAmount === 0 && grossScheduledRent > 0) {
      monthlyAmount = Math.round(grossScheduledRent * 0.10 * 100) / 100; // 10% default
    }

    const isProjected = rec?.sourceTag === 'user_assumption';
    categoryMonthlies[cat] = {
      category: cat,
      monthlyAmount,
      isProjected,
      sourceTag: rec?.sourceTag || 'user_actual',
    };
    totalCategoryMonthly += monthlyAmount;
  }

  totalCategoryMonthly = Math.round(totalCategoryMonthly * 100) / 100;
  const monthlyCarry = Math.round((loanCarryMonthly + totalCategoryMonthly) * 100) / 100;

  // 3. Rehab Spend & Budget Variance (Pending approval excluded per HX-5 boundary rule)
  const rehabBudget = providedRehabBudget;
  let spendToDate = 0;
  let pendingApprovalSpend = 0;

  for (const entry of registry.rehabSpend) {
    // Check pending approval condition
    const isPending = (entry as any).status === 'pending_approval' || (entry as any).isPendingApproval;
    if (isPending) {
      pendingApprovalSpend += entry.amount;
    } else {
      spendToDate += entry.amount;
    }
  }

  spendToDate = Math.round(spendToDate * 100) / 100;
  pendingApprovalSpend = Math.round(pendingApprovalSpend * 100) / 100;
  const budgetVariance = Math.round((rehabBudget - spendToDate) * 100) / 100;
  const budgetVariancePct = rehabBudget > 0 ? Math.round((spendToDate / rehabBudget) * 10000) / 100 : 0;
  const is80PercentBudgetCrossed = rehabBudget > 0 && (spendToDate / rehabBudget) >= 0.80;

  // 4. Reserve Policy Monthlies (Decision H-3)
  const vacancyBufferPct = registry.reservePolicies?.vacancyBufferPct ?? vacancyRatePercent ?? 7;
  const vacancyCreditLossMonthly = Math.round((grossScheduledRent * (vacancyBufferPct / 100)) * 100) / 100;
  const repairsMaintenanceReserveMonthly = Math.round((grossScheduledRent * 0.10) * 100) / 100; // 10% R&M policy
  const replacementReservesCapExMonthly = Math.round((grossScheduledRent * 0.10) * 100) / 100;   // 10% CapEx policy

  const reserveStatuses = registry.reserveFundingStatus.map((r) => ({
    type: r.type,
    status: r.status,
  }));

  // 5. Marketing Spend (Decision H-4: Excluded from monthlyCarry/NOI, feeds Marketing & Sales metrics)
  let marketingSpendToDate = 0;
  for (const ad of registry.listingAdLog) {
    marketingSpendToDate += ad.spend;
  }
  marketingSpendToDate = Math.round(marketingSpendToDate * 100) / 100;

  // 6. Flip Runway Derivation (SALE path flip contexts)
  let runway: HoldOperationsResult['runway'] | undefined = undefined;

  if (dispositionType === 'SALE' && listPriceSale > 0) {
    const projectedMargin = Math.round((listPriceSale - (purchasePrice + rehabBudget)) * 100) / 100;
    
    // Calculate days elapsed since start
    const startMs = new Date(holdStartDate).getTime();
    const nowMs = new Date().getTime();
    const daysElapsed = Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)));
    const monthsElapsed = daysElapsed / 30.44;

    const cumulativeCarryToDate = Math.round((monthlyCarry * monthsElapsed) * 100) / 100;
    const cumulativeCostToDate = Math.round((cumulativeCarryToDate + spendToDate) * 100) / 100;
    const remainingMargin = Math.round((projectedMargin - (spendToDate + cumulativeCarryToDate)) * 100) / 100;

    const dailyCarry = monthlyCarry / 30.44;
    const daysRemainingUntilErosion = dailyCarry > 0 ? Math.floor(Math.max(0, remainingMargin / dailyCarry)) : 0;
    
    const erosionTargetMs = startMs + ((daysElapsed + daysRemainingUntilErosion) * 24 * 60 * 60 * 1000);
    const marginErosionDate = new Date(erosionTargetMs).toISOString().split('T')[0];

    runway = {
      listPriceSale,
      projectedMargin,
      cumulativeCarryToDate,
      cumulativeCostToDate,
      remainingMargin,
      daysRemainingUntilErosion,
      marginErosionDate,
    };
  }

  return {
    loanCarryMonthly,
    categoryMonthlies,
    totalCategoryMonthly,
    monthlyCarry,
    rehabBudget,
    spendToDate,
    pendingApprovalSpend,
    budgetVariance,
    budgetVariancePct,
    is80PercentBudgetCrossed,
    projectedReserveMonthlies: {
      vacancyCreditLossMonthly,
      repairsMaintenanceReserveMonthly,
      replacementReservesCapExMonthly,
    },
    reserveStatuses,
    marketingSpendToDate,
    runway,
  };
}
