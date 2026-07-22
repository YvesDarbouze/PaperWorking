import type { Project } from '@/types/schema';
import type { InsightsEngineInputs } from '@/lib/services/insightsEngine';
import { computeNOIComponents } from '@/lib/metrics/reiMetrics';

/**
 * Human-readable labels for the fields required to compute a projection.
 * Used by the missing-data gate UI.
 */
export const REQUIRED_INSIGHTS_FIELDS = ['Purchase Price', 'Monthly Gross Rent'];

/**
 * Maps a single Project's financials to InsightsEngineInputs.
 *
 * Returns null when either required input is absent — callers must show
 * the missing-data gate rather than rendering any projection charts.
 *
 * Never throws; always returns InsightsEngineInputs | null.
 */
export function projectToInsightsInputs(project: Project): InsightsEngineInputs | null {
  const f = project.financials;
  if (!f) return null;

  const purchasePrice =
    f.purchasePrice || f.targetPurchasePrice || (f as any).targetPrice || 0;

  const monthlyGrossRent =
    f.monthlyGrossRent ?? f.projectedMonthlyRent ?? f.projectedRent ?? 0;

  // Gate: both required inputs must be non-zero
  if (purchasePrice <= 0 || monthlyGrossRent <= 0) return null;

  const rehabBudget = f.rehabBudget || f.projectedRehabCost || f.rehabActual || 0;
  const loanAmount = f.loanAmount ?? 0;
  const downPayment = Math.max(0, purchasePrice - loanAmount);
  const interestRate = f.loanInterestRate ?? 6.0;
  const amortizationTerm = f.loanTermYears ?? f.amortizationYears ?? 30;
  const otherMonthlyIncome =
    f.otherMonthlyIncome ??
    ((f.grossIncomeParking ?? 0) + (f.grossIncomeLaundry ?? 0));
  const grossScheduledIncome = (monthlyGrossRent + otherMonthlyIncome) * 12;
  const vacancyRate = f.vacancyRatePercent ?? (f.vacancyRate ?? 5);

  const noiComponents = computeNOIComponents(f, project.dispositionType, project.currentPhase);
  const operatingExpenses = noiComponents.totalOperatingExpenses;

  const medianHomePrice =
    f.estimatedCurrentValue ||
    f.estimatedARV ||
    purchasePrice * 1.05;

  return {
    purchasePrice,
    rehabBudget,
    downPayment,
    interestRate,
    amortizationTerm,
    grossScheduledIncome,
    operatingExpenses,
    vacancyRate,
    marketData: {
      daysOnMarket: 45,
      medianHomePrice,
      averageRent: monthlyGrossRent,
    },
  };
}
