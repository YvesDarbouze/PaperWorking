/**
 * Phase 3 Operations & Asset Management Variance Engine
 * Single source of truth for budget baselines, actuals NOI, variance grading,
 * live rent roll occupancy, and consecutive period alert tracking.
 * All canonical metric values (NOI, Occupancy Rate) are sourced via deriveAllProjectMetrics.
 */

import { deriveAllProjectMetrics } from '@/lib/metrics/reiMetrics';
import type { Project } from '@/types/schema';
import type { UnderwritingAssumptions } from '@/lib/finance/metrics';

export interface PropertyActualEntry {
  id: string;
  projectId: string;
  period: string; // YYYY-MM
  grossRent: number;
  operatingExpenses: number;
  noi: number;
  capex?: number;
  notes?: string;
  createdAt?: string;
}

export interface RentRollItem {
  id: string;
  projectId: string;
  unit: string;
  tenantName?: string;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent: number;
  status: 'occupied' | 'vacant' | 'notice';
  createdAt?: string;
}

export interface BudgetBaselineData {
  snapshottedAt: string;
  monthlyGrossRent: number;
  monthlyExpenses: number;
  monthlyNoi: number;
  underwritingAssumptions?: UnderwritingAssumptions;
}

export type VarianceStatus = 'green' | 'amber' | 'red';

export interface VarianceResult {
  actual: number;
  baseline: number;
  varianceAmount: number;
  variancePercent: number; // Signed percentage (e.g. +3.5 or -12.4)
  absPercent: number;
  status: VarianceStatus; // green: <= ±5%, amber: <= ±10%, red: > ±10%
}

/**
 * Calculate Variance between Actual and Baseline value
 * For Revenue/NOI: Actual > Baseline is positive variance (good).
 * For Expenses: Actual > Baseline is positive expense overage (higher cost).
 * Status Grading:
 * - Green: |variancePercent| <= 5%
 * - Amber: 5% < |variancePercent| <= 10%
 * - Red: |variancePercent| > 10%
 */
export function calculateVariance(actual: number, baseline: number): VarianceResult {
  const varianceAmount = actual - baseline;
  if (baseline === 0) {
    const status: VarianceStatus = actual === 0 ? 'green' : 'red';
    return {
      actual,
      baseline,
      varianceAmount,
      variancePercent: 0,
      absPercent: 0,
      status,
    };
  }

  const variancePercent = Number(((varianceAmount / baseline) * 100).toFixed(2));
  const absPercent = Math.abs(variancePercent);

  let status: VarianceStatus = 'green';
  if (absPercent > 10) {
    status = 'red';
  } else if (absPercent > 5) {
    status = 'amber';
  }

  return {
    actual,
    baseline,
    varianceAmount,
    variancePercent,
    absPercent,
    status,
  };
}

/**
 * Calculate Cumulative Variance across all entered periods
 */
export function calculateCumulativeVariance(
  actuals: PropertyActualEntry[],
  monthlyBaseline: BudgetBaselineData
) {
  const periodCount = actuals.length;
  if (periodCount === 0) {
    return {
      grossRent: calculateVariance(0, 0),
      operatingExpenses: calculateVariance(0, 0),
      noi: calculateVariance(0, 0),
      totalCapex: 0,
      periodCount: 0,
    };
  }

  const totalActualGrossRent = actuals.reduce((sum, a) => sum + a.grossRent, 0);
  const totalActualExpenses = actuals.reduce((sum, a) => sum + a.operatingExpenses, 0);
  const totalActualNoi = actuals.reduce((sum, a) => sum + (a.noi ?? (a.grossRent - a.operatingExpenses)), 0);
  const totalCapex = actuals.reduce((sum, a) => sum + (a.capex || 0), 0);

  const cumBaselineGrossRent = monthlyBaseline.monthlyGrossRent * periodCount;
  const cumBaselineExpenses = monthlyBaseline.monthlyExpenses * periodCount;
  const cumBaselineNoi = monthlyBaseline.monthlyNoi * periodCount;

  return {
    grossRent: calculateVariance(totalActualGrossRent, cumBaselineGrossRent),
    operatingExpenses: calculateVariance(totalActualExpenses, cumBaselineExpenses),
    noi: calculateVariance(totalActualNoi, cumBaselineNoi),
    totalCapex,
    periodCount,
  };
}

/**
 * Check if 2+ consecutive periods have significant variance (> ±10% on NOI or Gross Rent)
 */
export function checkConsecutiveVarianceAlert(
  actuals: PropertyActualEntry[],
  baseline: BudgetBaselineData
): boolean {
  if (actuals.length < 2) return false;

  const sorted = [...actuals].sort((a, b) => a.period.localeCompare(b.period));

  let consecutiveCount = 0;

  for (const act of sorted) {
    const noiVar = calculateVariance(act.noi ?? (act.grossRent - act.operatingExpenses), baseline.monthlyNoi);
    const rentVar = calculateVariance(act.grossRent, baseline.monthlyGrossRent);

    if (noiVar.absPercent > 10 || rentVar.absPercent > 10) {
      consecutiveCount++;
      if (consecutiveCount >= 2) return true;
    } else {
      consecutiveCount = 0;
    }
  }

  return false;
}

/**
 * Freeze and snapshot budget baseline from project underwriting / financials
 * Sourced via deriveAllProjectMetrics.
 */
export function snapshotBudgetBaseline(project: Project): BudgetBaselineData {
  const existing = (project.financials as any)?.budgetBaseline;
  if (existing && existing.monthlyGrossRent > 0) {
    return existing; // Return frozen baseline
  }

  const derived = deriveAllProjectMetrics(project);
  const f: any = project.financials || {};
  const monthlyGrossRent = f.monthlyGrossRent ?? (f.purchasePrice ? (f.purchasePrice * 0.01) / 12 : 2500);
  const monthlyExpenses = f.monthlyExpenses ?? 800;
  const monthlyNoi = Math.round(((derived.noi ?? 0) / 12) * 100) / 100;

  return {
    snapshottedAt: new Date().toISOString(),
    monthlyGrossRent,
    monthlyExpenses,
    monthlyNoi,
    underwritingAssumptions: {
      purchasePrice: f.purchasePrice || 250000,
      rehabCost: f.projectedRehabCost ?? f.rehabBudget ?? 30000,
      monthlyGrossRent,
      monthlyExpenses,
      rentGrowthRate: f.rentGrowthRate ?? 3.0,
      expenseGrowthRate: f.expenseGrowthRate ?? 2.5,
      vacancyRate: f.vacancyRate ?? 5.0,
      capexReservePct: f.capexReservePct ?? 5.0,
      loanAmount: f.loanAmount || 200000,
      interestRate: f.loanInterestRate ?? 6.5,
      amortizationYears: 30,
      exitCapRate: f.exitCapRate ?? 6.0,
      holdingPeriodYears: 5,
    },
  };
}
