import type { Project } from '@/types/schema';
import {
  computeNOI,
  computeAnnualDebtService,
  computeTotalCashInvested,
  computeIRR,
} from '@/lib/metrics/reiMetrics';

export interface ScenarioAssumptions {
  rentGrowthPct: number;
  vacancyPct: number;
  exitCapRate: number;
  appreciationPct: number;
  holdYears: number;
}

export interface ScenarioResult {
  label: string;
  irr: string;
  holdYears: string;
  capExit: string;
  active: boolean;
  assumptions: ScenarioAssumptions;
  irrRaw: number | null;
}

function safeNum(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
}

/**
 * Projects year-by-year cash flows for a project under given scenario assumptions.
 *
 * Year 0: -totalCashInvested (down payment + acquisition costs)
 * Years 1..N-1: NOI(year) − annualDebtService
 * Year N: NOI(year) − annualDebtService + netSaleProceeds
 *
 * NOI grows as rent compounds at rentGrowthPct, vacancy is applied, and
 * operating expenses are escalated at a fixed 2%/year. Terminal value is
 * derived from the exit cap rate applied to the final year's NOI
 * (falling back to appreciation-based pricing when exitCapRate is zero).
 */
export function projectScenarioCashFlows(
  project: Project,
  assumptions: ScenarioAssumptions,
): number[] {
  const f = project.financials;
  if (!f) return [];

  const purchasePrice =
    safeNum(f.purchasePrice) ??
    safeNum((f as any).targetPurchasePrice) ??
    0;

  const baseMonthlyRent =
    safeNum(f.gross_rent_per_unit) ??
    safeNum(f.monthlyGrossRent) ??
    safeNum(f.projectedMonthlyRent) ??
    safeNum((f as any).projectedRent) ??
    0;

  if (purchasePrice <= 0 || baseMonthlyRent <= 0) return [];

  const loanAmount = safeNum(f.loanAmount) ?? 0;
  const loanRate = safeNum(f.loanInterestRate) ?? 6;
  const loanTermYears = safeNum(f.loanTermYears) ?? 30;

  const totalCashInvested = computeTotalCashInvested(f as any);
  if (totalCashInvested <= 0) return [];

  const annualDS = computeAnnualDebtService(loanAmount, loanRate, loanTermYears * 12);

  // Derive base-year operating expenses from the NOI computation so we
  // stay consistent with the rest of the engine.
  const baseNOI = computeNOI(f as any, project.dispositionType, project.currentPhase);
  const baseGrossRent = baseMonthlyRent * 12;
  // Vacancy already baked into NOI; strip it back out to get pure opex.
  const baseVacancyLoss = baseGrossRent * ((f.vacancy_pct ?? f.vacancyRatePercent ?? 5) / 100);
  const baseOperatingExpenses = Math.max(0, baseGrossRent - baseVacancyLoss - baseNOI);

  // Build year-by-year NOIs first so we know the final year's NOI for exit.
  const yearlyNOIs: number[] = [];
  for (let y = 1; y <= assumptions.holdYears; y++) {
    const grossRent = baseMonthlyRent * 12 * Math.pow(1 + assumptions.rentGrowthPct / 100, y);
    const effectiveIncome = grossRent * (1 - assumptions.vacancyPct / 100);
    // Escalate operating expenses at 2%/yr (wages, maintenance, insurance).
    const operatingExpenses = baseOperatingExpenses * Math.pow(1.02, y);
    yearlyNOIs.push(effectiveIncome - operatingExpenses);
  }

  // Terminal value —— exit cap rate takes precedence over appreciation.
  const lastNOI = yearlyNOIs[yearlyNOIs.length - 1];
  let exitValue: number;
  if (assumptions.exitCapRate > 0) {
    exitValue = lastNOI / (assumptions.exitCapRate / 100);
  } else {
    exitValue = purchasePrice * Math.pow(1 + assumptions.appreciationPct / 100, assumptions.holdYears);
  }

  // Remaining loan balance after holdYears of payments.
  let remainingBalance = loanAmount;
  const monthlyRate = loanRate / 100 / 12;
  const totalPayments = loanTermYears * 12;
  if (monthlyRate > 0 && totalPayments > 0 && loanAmount > 0) {
    const mp =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
    const paymentsMade = assumptions.holdYears * 12;
    remainingBalance = Math.max(
      0,
      loanAmount * Math.pow(1 + monthlyRate, paymentsMade) -
        mp * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate),
    );
  }

  const sellingCosts = exitValue * 0.08; // 8%: agent commissions + closing costs
  const netSaleProceeds = exitValue - remainingBalance - sellingCosts;

  const flows: number[] = [-totalCashInvested];
  for (let y = 0; y < assumptions.holdYears; y++) {
    const cashFlow = yearlyNOIs[y] - annualDS;
    flows.push(y < assumptions.holdYears - 1 ? cashFlow : cashFlow + netSaleProceeds);
  }

  return flows;
}

/**
 * Computes the IRR for a project under a specific scenario.
 * Returns null when inputs are missing or the solver does not converge.
 */
export function computeScenarioIRR(
  project: Project,
  assumptions: ScenarioAssumptions,
): number | null {
  const flows = projectScenarioCashFlows(project, assumptions);
  if (flows.length < 2) return null;
  return computeIRR(flows);
}

/**
 * Three preset scenarios spanning the realistic outcome distribution.
 * Each differs only in its assumption set — no multipliers are applied.
 */
export const PRESET_SCENARIOS: Array<{
  label: string;
  assumptions: ScenarioAssumptions;
  active: boolean;
}> = [
  {
    label: 'Conservative',
    active: false,
    assumptions: {
      rentGrowthPct: 1,
      vacancyPct: 8,
      exitCapRate: 7.5,
      appreciationPct: 2,
      holdYears: 10,
    },
  },
  {
    label: 'Base',
    active: true,
    assumptions: {
      rentGrowthPct: 3,
      vacancyPct: 5,
      exitCapRate: 6.5,
      appreciationPct: 3.5,
      holdYears: 7,
    },
  },
  {
    label: 'Aggressive',
    active: false,
    assumptions: {
      rentGrowthPct: 5,
      vacancyPct: 3,
      exitCapRate: 5.5,
      appreciationPct: 5,
      holdYears: 3,
    },
  },
];

/**
 * Computes all preset scenario IRRs for a project in one pass.
 * Returns an array of ScenarioResult ready for the IRR Scenarios widget.
 */
export function computeAllScenarioIRRs(project: Project): ScenarioResult[] {
  return PRESET_SCENARIOS.map(({ label, assumptions, active }) => {
    const raw = computeScenarioIRR(project, assumptions);
    const irrRaw = raw !== null ? Math.round(raw * 100 * 100) / 100 : null;
    return {
      label,
      irr: irrRaw !== null ? `${irrRaw.toFixed(1)}%` : '—',
      holdYears: `Hold ${assumptions.holdYears}y`,
      capExit: `Cap ${assumptions.exitCapRate}%`,
      active,
      assumptions,
      irrRaw,
    };
  });
}
