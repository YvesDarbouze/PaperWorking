import { Project, CostEntry } from '@/types/schema';

export interface TaxReportPeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface TaxPLResult {
  projectId: string;
  propertyName: string;
  activeMonths: number;
  
  // Income
  rentalIncome: number;
  otherIncome: number;
  saleProceeds: number; // Realized at sale
  totalGrossIncome: number;

  // Deductible Operating Expenses
  advertising: number;       // Schedule E Line 5
  propertyTaxes: number;
  insurance: number;
  utilities: number;
  propertyManagement: number;
  repairsMaintenance: number;
  hoaFees: number;
  mortgageInterest: number; // Amortized interest
  totalDeductibleExpenses: number;

  // Net Operating Result
  netOperatingResult: number; // Income - Deductible Operating Expenses (excluding mortgage interest)
  netTaxableResult: number; // Net Operating Result - Mortgage Interest

  // Capitalized Items (Added to Basis)
  mortgagePrincipal: number; // Non-deductible principal paydown
  capitalizedRehab: number; // Approved costs in this period

  // Depreciation
  depreciationEstimate: number; // Straight-line depreciation portion

  // Exit / Disposition
  sellingCosts: number; // Realized commissions + closing costs
  realizedGainLoss: number; // Sale price - basis - lifetime rehab - selling costs
  isSoldInPeriod: boolean;

  // Lifetime values for sale calculation
  acquisitionBasis: number;
  lifetimeCapitalizedRehab: number;
}

export function parseDateSafe(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'string') {
    const cleanStr = dateVal.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Audit project financials to identify missing inputs required for a complete tax export.
 */
export function auditTaxFields(project: Project): string[] {
  const missing: string[] = [];
  const f = project.financials;
  if (!f) {
    return ['Financial records missing'];
  }

  if (!f.purchasePrice || f.purchasePrice <= 0) {
    missing.push('Purchase Price');
  }
  if (!f.acquisitionDate) {
    missing.push('Acquisition Date');
  }

  const isRental = project.dispositionType === 'RENT';
  if (isRental) {
    if (!f.monthlyGrossRent && !f.projectedMonthlyRent) {
      missing.push('Monthly Gross/Projected Rent');
    }
  }

  if (f.loanAmount && f.loanAmount > 0) {
    if (!f.loanInterestRate) missing.push('Loan Interest Rate');
    if (!f.loanTermYears) missing.push('Loan Term (Years)');
  }

  if (project.status === 'exit' && project.dispositionType === 'SALE') {
    if (!f.soldDate) missing.push('Sold Date');
    if (!f.actualSalePrice || f.actualSalePrice <= 0) missing.push('Actual Sale Price');
  }

  return missing;
}

/**
 * Returns the fractional months a project was held within a target date range.
 */
export function getActiveMonthsInPeriod(
  acquisitionDate: Date,
  soldDate: Date | null,
  periodStart: Date,
  periodEnd: Date
): number {
  const holdStart = new Date(acquisitionDate.getFullYear(), acquisitionDate.getMonth(), acquisitionDate.getDate());
  const holdEnd = soldDate 
    ? new Date(soldDate.getFullYear(), soldDate.getMonth(), soldDate.getDate())
    : new Date();

  // Find the overlapping date range
  const overlapStart = new Date(Math.max(holdStart.getTime(), periodStart.getTime()));
  const overlapEnd = new Date(Math.min(holdEnd.getTime(), periodEnd.getTime()));

  if (overlapStart > overlapEnd) {
    return 0;
  }

  let totalMonths = 0;
  
  // Set current date to 1st of month of overlapStart
  let current = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), 1);
  const end = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), 1);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59, 999);

    const activeStart = new Date(Math.max(overlapStart.getTime(), monthStart.getTime()));
    const activeEnd = new Date(Math.min(overlapEnd.getTime(), monthEnd.getTime()));

    if (activeStart <= activeEnd) {
      const activeStartDay = new Date(activeStart.getFullYear(), activeStart.getMonth(), activeStart.getDate());
      const activeEndDay = new Date(activeEnd.getFullYear(), activeEnd.getMonth(), activeEnd.getDate());
      const activeDays = Math.round((activeEndDay.getTime() - activeStartDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalMonths += activeDays / daysInMonth;
    }
    
    current.setMonth(current.getMonth() + 1);
  }

  return Math.max(0, totalMonths);
}

/**
 * Computes exact mortgage interest paid (deductible) vs principal paid (capitalized) in the date range.
 */
export function calculateMortgageAmortization(
  loanAmount: number,
  interestRate: number,
  termYears: number,
  acquisitionDate: Date,
  periodStart: Date,
  periodEnd: Date,
  soldDate: Date | null
): { interest: number; principal: number } {
  if (loanAmount <= 0 || interestRate <= 0 || termYears <= 0) {
    return { interest: 0, principal: 0 };
  }

  const monthlyRate = (interestRate / 100) / 12;
  const totalPayments = termYears * 12;
  
  // Monthly payment amount
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);

  if (isNaN(monthlyPayment) || !isFinite(monthlyPayment)) {
    return { interest: 0, principal: 0 };
  }

  const holdStart = acquisitionDate;
  const holdEnd = soldDate || new Date();

  let totalInterest = 0;
  let totalPrincipal = 0;

  // Iterate calendar month-by-calendar-month
  let current = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
  const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

  while (current <= end) {
    // Check if current calendar month overlaps with hold period
    const currentMonthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const overlapStart = new Date(Math.max(holdStart.getTime(), current.getTime()));
    const overlapEnd = new Date(Math.min(holdEnd.getTime(), currentMonthEnd.getTime()));

    if (overlapStart <= overlapEnd) {
      // Find the 1-indexed payment number since acquisition
      const elapsedMonths = (current.getFullYear() - holdStart.getFullYear()) * 12 + (current.getMonth() - holdStart.getMonth());
      if (elapsedMonths >= 0 && elapsedMonths < totalPayments) {
        // Amortize up to this payment number to find interest and principal splits
        let balance = loanAmount;
        let pInterest = 0;
        let pPrincipal = 0;

        for (let payNum = 0; payNum <= elapsedMonths; payNum++) {
          pInterest = balance * monthlyRate;
          pPrincipal = monthlyPayment - pInterest;
          balance = Math.max(0, balance - pPrincipal);
        }

        // Adjust for partial months if necessary
        const daysInMonth = currentMonthEnd.getDate();
        const activeStartDay = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), overlapStart.getDate());
        const activeEndDay = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), overlapEnd.getDate());
        const activeDays = Math.round((activeEndDay.getTime() - activeStartDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const activeFraction = Math.min(1, activeDays / daysInMonth);

        totalInterest += pInterest * activeFraction;
        totalPrincipal += pPrincipal * activeFraction;
      }
    }
    current.setMonth(current.getMonth() + 1);
  }

  return {
    interest: Math.round(totalInterest * 100) / 100,
    principal: Math.round(totalPrincipal * 100) / 100
  };
}

/**
 * Computes exact depreciation months allowed in the period under IRS mid-month convention.
 * Total recovery period is 27.5 years (330 months).
 */
export function getDepreciationMonthsInPeriod(
  placedInServiceDate: Date,
  soldDate: Date | null,
  periodStart: Date,
  periodEnd: Date
): number {
  const startYear = placedInServiceDate.getFullYear();
  const startMonth = placedInServiceDate.getMonth(); // 0-11
  
  const soldYear = soldDate ? soldDate.getFullYear() : null;
  const soldMonth = soldDate ? soldDate.getMonth() : null;

  // IRS rule: if placed in service and sold in the same tax year, no depreciation is allowed
  if (soldYear !== null && soldYear === startYear) {
    return 0;
  }

  let totalDepreciationMonths = 0;

  // Iterate month-by-month over the target periodStart to periodEnd
  let current = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
  const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

  while (current <= end) {
    const curYear = current.getFullYear();
    const curMonth = current.getMonth();

    // Compute calendar months since placed in service
    const m = (curYear - startYear) * 12 + (curMonth - startMonth);

    if (m >= 0 && m <= 330) {
      // Determine if this month is active for depreciation
      if (soldYear !== null && soldMonth !== null) {
        const s = (soldYear - startYear) * 12 + (soldMonth - startMonth);
        if (m > s) {
          current.setMonth(current.getMonth() + 1);
          continue;
        }
        if (m === s) {
          // Month of sale gets 0.5 months of depreciation
          totalDepreciationMonths += 0.5;
          current.setMonth(current.getMonth() + 1);
          continue;
        }
      }

      // Regular month logic
      if (m === 0) {
        // Placed in service month gets 0.5 months of depreciation
        totalDepreciationMonths += 0.5;
      } else if (m === 330) {
        // Last month gets 0.5 months of depreciation
        totalDepreciationMonths += 0.5;
      } else {
        totalDepreciationMonths += 1.0;
      }
    }

    current.setMonth(current.getMonth() + 1);
  }

  return totalDepreciationMonths;
}

/**
 * Calculates a complete Tax PL Result for a single Project in a target date range.
 */
export function calculateProjectTaxReport(
  project: Project,
  periodStart: Date,
  periodEnd: Date
): TaxPLResult {
  const f = project.financials || { purchasePrice: 0, costs: [] };
  const propertyName = project.propertyName || project.address || 'Unnamed Project';
  
  const acqDate = parseDateSafe(f.acquisitionDate);
  const soldDate = (project.status === 'exit') ? parseDateSafe(f.soldDate) : null;

  const isSoldInPeriod = !!(soldDate && soldDate >= periodStart && soldDate <= periodEnd);

  // If not acquired yet, or acquired after the period range, return empty result
  if (!acqDate || acqDate > periodEnd || (soldDate && soldDate < periodStart)) {
    return {
      projectId: project.id,
      propertyName,
      activeMonths: 0,
      rentalIncome: 0,
      otherIncome: 0,
      saleProceeds: 0,
      totalGrossIncome: 0,
      advertising: 0,
      propertyTaxes: 0,
      insurance: 0,
      utilities: 0,
      propertyManagement: 0,
      repairsMaintenance: 0,
      hoaFees: 0,
      mortgageInterest: 0,
      totalDeductibleExpenses: 0,
      netOperatingResult: 0,
      netTaxableResult: 0,
      mortgagePrincipal: 0,
      capitalizedRehab: 0,
      depreciationEstimate: 0,
      sellingCosts: 0,
      realizedGainLoss: 0,
      isSoldInPeriod,
      acquisitionBasis: 0,
      lifetimeCapitalizedRehab: 0,
    };
  }

  const activeMonths = getActiveMonthsInPeriod(acqDate, soldDate, periodStart, periodEnd);

  // 1. Income Allocation
  const monthlyGrossRent = project.dispositionType === 'RENT' && (project.currentPhase === 3 || project.currentPhase === 4)
    ? (f.actualRentalIncome ?? f.monthlyGrossRent ?? f.projectedMonthlyRent ?? 0)
    : (f.monthlyGrossRent ?? f.projectedMonthlyRent ?? 0);

  const rentalIncome = monthlyGrossRent * activeMonths;

  const otherMonthlyIncome = f.otherMonthlyIncome ?? ((f.grossIncomeParking ?? 0) + (f.grossIncomeLaundry ?? 0));
  const otherIncome = otherMonthlyIncome * activeMonths;

  const saleProceeds = isSoldInPeriod ? (f.actualSalePrice ?? 0) : 0;
  const totalGrossIncome = rentalIncome + otherIncome + saleProceeds;

  // 2. Deductible Operating Expenses Allocation
  // Advertising: prorated from annualAdvertisingExpense; fall back to rentalMarketingCost (one-time)
  const advertising = Math.round(((f.annualAdvertisingExpense ?? f.rentalMarketingCost ?? 0) * (activeMonths / 12)) * 100) / 100;
  const propertyTaxes = (f.holdingCostTaxes ?? f.operatingExpenseTaxes ?? 0) * activeMonths;
  const insurance = (f.holdingCostInsurance ?? f.operatingExpenseInsurance ?? 0) * activeMonths;
  const utilities = (f.holdingCostUtilities ?? 0) * activeMonths;

  let propertyManagement = 0;
  if (f.propertyManagementFeePercent != null) {
    propertyManagement = rentalIncome * (f.propertyManagementFeePercent / 100);
  } else {
    propertyManagement = (f.propertyManagementFee ?? 0) * activeMonths;
  }

  const repairsMaintenance = (f.monthlyMaintenanceReserve ?? f.maintenanceReserves ?? 0) * activeMonths;
  const hoaFees = (f.monthlyHOA ?? 0) * activeMonths;

  // Amortized mortgage interest
  const loanAmount = f.loanAmount ?? 0;
  const interestRate = f.loanInterestRate ?? 0;
  const termYears = f.loanTermYears ?? 30;
  
  const amortization = calculateMortgageAmortization(
    loanAmount,
    interestRate,
    termYears,
    acqDate,
    periodStart,
    periodEnd,
    soldDate
  );

  const mortgageInterest = amortization.interest;
  const mortgagePrincipal = amortization.principal;

  const totalDeductibleExpenses = advertising + propertyTaxes + insurance + utilities + propertyManagement + repairsMaintenance + hoaFees + mortgageInterest;

  const netOperatingResult = rentalIncome + otherIncome - (advertising + propertyTaxes + insurance + utilities + propertyManagement + repairsMaintenance + hoaFees);
  const netTaxableResult = netOperatingResult - mortgageInterest;

  // 3. Capitalized Rehab Allocation
  // Approved rehab costs falling within the period range
  let capitalizedRehab = 0;
  const costs = f.costs || [];
  for (const c of costs) {
    if (c.approved) {
      const cDate = parseDateSafe(c.createdAt);
      if (cDate && cDate >= periodStart && cDate <= periodEnd) {
        capitalizedRehab += c.amount;
      }
    }
  }

  // 4. Straight-line Depreciation Estimate (27.5-Yr)
  // Depreciate building basis only using straight-line 27.5-year method.
  // Derives split from assessed land/improvement values, falling back to 80/20 building/land split.
  const acquisitionBasis = (f.purchasePrice ?? 0) + (f.fixedAcquisitionCosts ?? 0);
  let buildingRatio = 0.8;
  if (f.taxAssessedLandValue && f.taxAssessedImprovementValue) {
    const totalAssessed = f.taxAssessedLandValue + f.taxAssessedImprovementValue;
    if (totalAssessed > 0) {
      buildingRatio = f.taxAssessedImprovementValue / totalAssessed;
    }
  }
  const depreciableBasis = acquisitionBasis * buildingRatio;
  const annualDepreciation = depreciableBasis / 27.5;
  const monthlyDepreciation = annualDepreciation / 12;

  const placedInServiceDate = parseDateSafe(f.placedInServiceDate) || acqDate || parseDateSafe(project.createdAt) || new Date();
  const depMonths = getDepreciationMonthsInPeriod(placedInServiceDate, soldDate, periodStart, periodEnd);
  const depreciationEstimate = project.dispositionType === 'RENT'
    ? monthlyDepreciation * depMonths
    : 0;

  // 5. Realized Gain/Loss on Sale (Exit Phase)
  let sellingCosts = 0;
  let realizedGainLoss = 0;
  let lifetimeCapitalizedRehab = 0;

  for (const c of costs) {
    if (c.approved) {
      lifetimeCapitalizedRehab += c.amount;
    }
  }

  if (isSoldInPeriod) {
    if (f.sellingCosts != null) {
      sellingCosts = f.sellingCosts;
    } else {
      const finalClosingCosts = f.finalClosingCosts ?? 0;
      const commissionsPct = (f.buyersAgentCommission ?? 0) + (f.sellersAgentCommission ?? 0);
      const commissionsVal = saleProceeds * (commissionsPct / 100);
      
      const extraSelling = (f.stagingCosts ?? 0) + (f.photographyAndMedia ?? 0) + (f.mlsListingFees ?? 0);
      
      sellingCosts = finalClosingCosts + commissionsVal + extraSelling;
    }

    // Capital Gains Basis: acquisitionBasis + lifetimeCapitalizedRehab
    const totalBasis = acquisitionBasis + lifetimeCapitalizedRehab;
    realizedGainLoss = saleProceeds - totalBasis - sellingCosts;
  }

  return {
    projectId: project.id,
    propertyName,
    activeMonths: Math.round(activeMonths * 100) / 100,
    rentalIncome: Math.round(rentalIncome * 100) / 100,
    otherIncome: Math.round(otherIncome * 100) / 100,
    saleProceeds: Math.round(saleProceeds * 100) / 100,
    totalGrossIncome: Math.round(totalGrossIncome * 100) / 100,
    advertising: Math.round(advertising * 100) / 100,
    propertyTaxes: Math.round(propertyTaxes * 100) / 100,
    insurance: Math.round(insurance * 100) / 100,
    utilities: Math.round(utilities * 100) / 100,
    propertyManagement: Math.round(propertyManagement * 100) / 100,
    repairsMaintenance: Math.round(repairsMaintenance * 100) / 100,
    hoaFees: Math.round(hoaFees * 100) / 100,
    mortgageInterest,
    totalDeductibleExpenses: Math.round(totalDeductibleExpenses * 100) / 100,
    netOperatingResult: Math.round(netOperatingResult * 100) / 100,
    netTaxableResult: Math.round(netTaxableResult * 100) / 100,
    mortgagePrincipal,
    capitalizedRehab: Math.round(capitalizedRehab * 100) / 100,
    depreciationEstimate: Math.round(depreciationEstimate * 100) / 100,
    sellingCosts: Math.round(sellingCosts * 100) / 100,
    realizedGainLoss: Math.round(realizedGainLoss * 100) / 100,
    isSoldInPeriod,
    acquisitionBasis: Math.round(acquisitionBasis * 100) / 100,
    lifetimeCapitalizedRehab: Math.round(lifetimeCapitalizedRehab * 100) / 100,
  };
}

/**
 * Aggregates Tax PL Results across all projects for a given period.
 */
export function aggregatePortfolioTaxReport(results: TaxPLResult[]): Omit<TaxPLResult, 'projectId' | 'propertyName'> {
  const sumField = (key: keyof Omit<TaxPLResult, 'projectId' | 'propertyName' | 'isSoldInPeriod'>): number => {
    return results.reduce((acc, r) => acc + (r[key] as number), 0);
  };

  return {
    activeMonths: Math.round(sumField('activeMonths') * 100) / 100,
    rentalIncome: Math.round(sumField('rentalIncome') * 100) / 100,
    otherIncome: Math.round(sumField('otherIncome') * 100) / 100,
    saleProceeds: Math.round(sumField('saleProceeds') * 100) / 100,
    totalGrossIncome: Math.round(sumField('totalGrossIncome') * 100) / 100,
    advertising: Math.round(sumField('advertising') * 100) / 100,
    propertyTaxes: Math.round(sumField('propertyTaxes') * 100) / 100,
    insurance: Math.round(sumField('insurance') * 100) / 100,
    utilities: Math.round(sumField('utilities') * 100) / 100,
    propertyManagement: Math.round(sumField('propertyManagement') * 100) / 100,
    repairsMaintenance: Math.round(sumField('repairsMaintenance') * 100) / 100,
    hoaFees: Math.round(sumField('hoaFees') * 100) / 100,
    mortgageInterest: Math.round(sumField('mortgageInterest') * 100) / 100,
    totalDeductibleExpenses: Math.round(sumField('totalDeductibleExpenses') * 100) / 100,
    netOperatingResult: Math.round(sumField('netOperatingResult') * 100) / 100,
    netTaxableResult: Math.round(sumField('netTaxableResult') * 100) / 100,
    mortgagePrincipal: Math.round(sumField('mortgagePrincipal') * 100) / 100,
    capitalizedRehab: Math.round(sumField('capitalizedRehab') * 100) / 100,
    depreciationEstimate: Math.round(sumField('depreciationEstimate') * 100) / 100,
    sellingCosts: Math.round(sumField('sellingCosts') * 100) / 100,
    realizedGainLoss: Math.round(sumField('realizedGainLoss') * 100) / 100,
    isSoldInPeriod: results.some(r => r.isSoldInPeriod),
    acquisitionBasis: Math.round(sumField('acquisitionBasis') * 100) / 100,
    lifetimeCapitalizedRehab: Math.round(sumField('lifetimeCapitalizedRehab') * 100) / 100,
  };
}
