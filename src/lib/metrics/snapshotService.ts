import { db } from '../firebase/config';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { Project, PropertyMetricSnapshot } from '@/types/schema';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows, computeInvestorMetrics } from './reiMetrics';

// Parse dates that might be Firebase Timestamps, ISO strings, or Date objects
export function parseFirestoreDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function getProjectStartDate(project: Project): Date {
  const acqDateRaw = project.financials?.acquisitionDate;
  if (acqDateRaw) {
    const d = parseFirestoreDate(acqDateRaw);
    return d;
  }
  const createdDateRaw = project.createdAt;
  if (createdDateRaw) {
    const d = parseFirestoreDate(createdDateRaw);
    return d;
  }
  return new Date();
}

export function generatePeriods(startDate: Date, endDate: Date, periodType: 'monthly' | 'quarterly' | 'annual') {
  const periods: { period: string; date: Date }[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  if (periodType === 'monthly') {
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      periods.push({
        period: `${year}-${month}`,
        date: new Date(year, current.getMonth(), 1)
      });
      current.setMonth(current.getMonth() + 1);
    }
  } else if (periodType === 'quarterly') {
    const startQMonth = Math.floor(current.getMonth() / 3) * 3;
    current.setMonth(startQMonth);
    
    while (current <= end) {
      const year = current.getFullYear();
      const quarter = Math.floor(current.getMonth() / 3) + 1;
      periods.push({
        period: `${year}-Q${quarter}`,
        date: new Date(year, current.getMonth(), 1)
      });
      current.setMonth(current.getMonth() + 3);
    }
  } else { // annual
    current.setMonth(0);
    while (current.getFullYear() <= end.getFullYear()) {
      const year = current.getFullYear();
      periods.push({
        period: `${year}`,
        date: new Date(year, 0, 1)
      });
      current.setFullYear(current.getFullYear() + 1);
    }
  }
  return periods;
}

export function sanitizeNumber(val: any): number | null {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    return null;
  }
  return val;
}

export function calculateIRRPercent(financials: any, totalCashInvested: number, annualCashFlow: number): number | null {
  const purchasePrice = financials.purchasePrice ?? 0;
  if (totalCashInvested <= 0 || purchasePrice <= 0) return null;
  const annualAppreciation = financials.annualAppreciationPercent ?? 3;
  const loanAmount = financials.loanAmount ?? 0;
  const loanRate = financials.loanInterestRate ?? 0;
  const loanTerm = financials.loanTermYears ?? 30;
  const holdMonths = financials.projectedHoldTimeMonths ?? 60;
  const baseHoldYears = Math.max(1, Math.round(holdMonths / 12));

  const cashFlows = buildIRRCashFlows(
    totalCashInvested,
    annualCashFlow,
    baseHoldYears,
    purchasePrice,
    annualAppreciation,
    loanAmount,
    loanRate,
    loanTerm
  );
  const irr = computeIRR(cashFlows);
  return irr !== null ? irr * 100 : null;
}

export function computeProjectSnapshotData(
  project: Project,
  period: string,
  periodType: 'monthly' | 'quarterly' | 'annual',
  date: Date
): Omit<PropertyMetricSnapshot, 'createdAt'> {
  const financials = project.financials || { purchasePrice: 0, costs: [] };
  
  // Property value resolution
  const propertyValue = financials.estimatedCurrentValue ?? financials.estimatedARV ?? financials.purchasePrice ?? 0;
  
  const metrics = deriveAllMetrics(financials, financials.estimatedCurrentValue, project.strategyType, project.currentPhase);
  
  const irrRaw = calculateIRRPercent(financials, metrics.totalCashInvested, metrics.annualCashFlow);
  
  const getSanitized = (val: any, hasInputs: boolean): number | null => {
    if (!hasInputs) return null;
    return sanitizeNumber(val);
  };

  const hasRentInput =
    financials.monthlyGrossRent != null ||
    financials.projectedMonthlyRent != null ||
    financials.projectedRent != null;
  const hasValue = !!(financials.estimatedCurrentValue || financials.estimatedARV || financials.purchasePrice);
  const hasInvested = metrics.totalCashInvested > 0;
  const hasDebt = !!financials.loanAmount;

  const noiVal = (financials.netOperatingIncome != null || hasRentInput) ? metrics.noi : null;
  const annualCashFlowVal = noiVal !== null ? getSanitized(metrics.annualCashFlow, true) : null;
  const monthlyCashFlowVal = noiVal !== null ? getSanitized(metrics.monthlyCashFlow, true) : null;
  
  const capRateVal = hasValue && noiVal !== null ? getSanitized(metrics.capRate, true) : null;
  const arvCapRateVal = hasValue && noiVal !== null ? getSanitized(metrics.arvCapRate, true) : null;
  const cashOnCashReturnVal = hasInvested && annualCashFlowVal !== null ? getSanitized(metrics.cashOnCashReturn, true) : null;
  
  const grossRentalIncomeVal = financials.monthlyGrossRent || financials.projectedMonthlyRent ? (financials.monthlyGrossRent ?? financials.projectedMonthlyRent ?? 0) * 12 : 0;
  const grossRentMultiplierVal = hasValue && grossRentalIncomeVal > 0 ? getSanitized(metrics.grossRentMultiplier, true) : null;
  
  const dscrVal = hasDebt && noiVal !== null ? getSanitized(metrics.dscr, true) : null;
  const ltvVal = hasValue ? getSanitized(metrics.ltv, true) : null;
  
  const grossOperatingIncomeVal = metrics.noiComponents.grossRentalIncome + metrics.noiComponents.otherIncome;
  const oerVal = metrics.noiComponents.grossRentalIncome > 0 ? getSanitized(metrics.oer, true) : null;
  
  const occupancyRateVal = financials.numberOfUnits !== undefined || financials.occupiedUnits !== undefined 
    ? getSanitized(metrics.occupancyRate, true) 
    : 100;

  const appreciationVal = getSanitized(metrics.annualizedAppreciation, true);
  const isAppreciationRealizedVal = metrics.isAppreciationRealized;

  // R0 — Compute investor-scope metrics once
  const investorSnapshot = computeInvestorMetrics(
    metrics,
    financials.ownershipPercentage ?? 100,
    financials.ownerCashInvested
  );

  return {
    id: `${project.id}_${period}`,
    projectId: project.id,
    organizationId: project.organizationId,
    period,
    periodType,
    date,
    
    noi: noiVal !== null ? sanitizeNumber(noiVal) : null,
    annualCashFlow: annualCashFlowVal,
    monthlyCashFlow: monthlyCashFlowVal,
    capRate: capRateVal,
    arvCapRate: arvCapRateVal,
    cashOnCashReturn: cashOnCashReturnVal,
    grossRentMultiplier: grossRentMultiplierVal,
    dscr: dscrVal,
    ltv: ltvVal,
    oer: oerVal,
    occupancyRate: occupancyRateVal,
    irr: irrRaw !== null ? sanitizeNumber(irrRaw) : null,
    appreciation: appreciationVal,
    isAppreciationRealized: isAppreciationRealizedVal,
    
    propertyValue: hasValue ? sanitizeNumber(propertyValue) : null,
    totalCashInvested: hasInvested ? sanitizeNumber(metrics.totalCashInvested) : null,
    grossRentalIncome: grossRentalIncomeVal > 0 ? sanitizeNumber(grossRentalIncomeVal) : null,
    annualDebtService: hasDebt ? sanitizeNumber(metrics.annualDebtService) : null,
    loanAmount: hasDebt ? sanitizeNumber(financials.loanAmount) : null,
    totalOperatingExpenses: metrics.noiComponents.totalOperatingExpenses > 0 ? sanitizeNumber(metrics.noiComponents.totalOperatingExpenses) : null,
    grossOperatingIncome: grossOperatingIncomeVal > 0 ? sanitizeNumber(grossOperatingIncomeVal) : null,
    occupiedUnits: financials.occupiedUnits !== undefined ? sanitizeNumber(financials.occupiedUnits) : null,
    numberOfUnits: financials.numberOfUnits !== undefined ? sanitizeNumber(financials.numberOfUnits) : null,

    // R0 — Investor-scope fields
    ownershipPercentage: sanitizeNumber(investorSnapshot.ownershipPercentage),
    investorNOI: noiVal !== null ? sanitizeNumber(investorSnapshot.investorNOI) : null,
    investorCashFlow: annualCashFlowVal !== null ? sanitizeNumber(investorSnapshot.investorAnnualCashFlow) : null,
    investorCoCReturn: cashOnCashReturnVal !== null ? sanitizeNumber(investorSnapshot.investorCoCReturn) : null,
  };
}

export async function reconstructHistoryForProject(project: Project): Promise<void> {
  const minStartDate = new Date(2020, 0, 1);
  let startDate = getProjectStartDate(project);
  if (startDate < minStartDate) {
    startDate = minStartDate;
  }
  const today = new Date();
  if (startDate > today) {
    startDate = today;
  }
  
  // Cap at 120 months of history
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const monthsDiff = (todayYear - startYear) * 12 + (todayMonth - startMonth);
  if (monthsDiff > 120) {
    const adjustedDate = new Date(todayYear, todayMonth - 120, 1);
    startDate = adjustedDate < minStartDate ? minStartDate : adjustedDate;
  }
  
  const monthlyPeriods = generatePeriods(startDate, today, 'monthly');
  const quarterlyPeriods = generatePeriods(startDate, today, 'quarterly');
  const annualPeriods = generatePeriods(startDate, today, 'annual');
  
  const allPeriods = [
    ...monthlyPeriods.map(p => ({ ...p, type: 'monthly' as const })),
    ...quarterlyPeriods.map(p => ({ ...p, type: 'quarterly' as const })),
    ...annualPeriods.map(p => ({ ...p, type: 'annual' as const })),
  ];
  
  const batchLimit = 400; // Safe Firestore batch size (limit is 500)
  let batch = writeBatch(db);
  let count = 0;
  
  for (const item of allPeriods) {
    const snapshotData = computeProjectSnapshotData(project, item.period, item.type, item.date);
    const docRef = doc(collection(db, 'propertyMetricSnapshots'), snapshotData.id);
    
    batch.set(docRef, {
      ...snapshotData,
      createdAt: new Date(),
    }, { merge: true });
    
    count++;
    if (count >= batchLimit) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  
  if (count > 0) {
    await batch.commit();
  }
}
