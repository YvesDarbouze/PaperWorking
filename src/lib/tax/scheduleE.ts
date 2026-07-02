import { Project, LedgerItem } from '@/types/schema';
import { parseDateSafe } from '@/lib/utils/taxService';

export interface ScheduleEPreview {
  projectId: string;
  propertyName: string;
  physicalAddress: string;
  propertyType: number; // 1 = Single-Family, 2 = Multi-Family, etc.
  activeMonths: number;
  
  // Income
  grossRents: number;
  
  // Expenses
  advertising: number;
  autoTravel: number;
  cleaning: number; // Cleaning and Maintenance
  commissions: number;
  insurance: number;
  legalProfessional: number;
  managementFees: number;
  mortgageInterest: number;
  otherInterest: number;
  repairs: number;
  supplies: number;
  taxes: number;
  utilities: number;
  depreciation: number;
  other: number;
  
  totalExpenses: number;
  netIncome: number;
}

/**
 * Maps a project's strategy / asset class to IRS property type codes:
 * 1: Single Family Residence
 * 2: Multi-Family Residence
 * 3: Vacation/Short-Term Rental
 * 4: Commercial
 * 5: Land
 * 8: Other
 */
export function getPropertyTypeCode(project: Project): number {
  const asset = (project.assetClass || '').toLowerCase();
  const strategy = (project.strategyType || '').toLowerCase();
  
  if (asset === 'multi-family') return 2;
  if (asset === 'commercial') return 4;
  if (asset === 'land') return 5;
  if (strategy === 'vacation' || strategy === 'airbnb') return 3;
  if (asset === 'residential' || asset === 'single-family') return 1;
  return 8; // Other
}

/**
 * Formulates the Schedule E structure for a given project in a tax year.
 */
export function computeScheduleE(
  project: Project,
  ledgerItems: LedgerItem[],
  taxYear: number
): ScheduleEPreview {
  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59, 999);
  
  const f = project.financials || {};
  const acqDate = parseDateSafe(f.acquisitionDate);
  const soldDate = project.status === 'Sold' ? parseDateSafe(f.soldDate) : null;
  
  // Basic info
  const propertyName = project.propertyName || project.address || 'Unnamed Property';
  const physicalAddress = project.address || '';
  const propertyType = getPropertyTypeCode(project);
  
  // Initialize result
  const result: ScheduleEPreview = {
    projectId: project.id,
    propertyName,
    physicalAddress,
    propertyType,
    activeMonths: 0,
    grossRents: 0,
    advertising: 0,
    autoTravel: 0,
    cleaning: 0,
    commissions: 0,
    insurance: 0,
    legalProfessional: 0,
    managementFees: 0,
    mortgageInterest: 0,
    otherInterest: 0,
    repairs: 0,
    supplies: 0,
    taxes: 0,
    utilities: 0,
    depreciation: 0,
    other: 0,
    totalExpenses: 0,
    netIncome: 0,
  };
  
  // Verify hold overlap in the tax year
  if (!acqDate || acqDate > yearEnd || (soldDate && soldDate < yearStart)) {
    return result;
  }
  
  // Calculate active months inside the target year
  const holdStart = new Date(Math.max(acqDate.getTime(), yearStart.getTime()));
  const holdEnd = soldDate ? new Date(Math.min(soldDate.getTime(), yearEnd.getTime())) : new Date(Math.min(Date.now(), yearEnd.getTime()));
  
  let activeMonths = 0;
  if (holdStart <= holdEnd) {
    const timeDiff = holdEnd.getTime() - holdStart.getTime();
    activeMonths = Math.max(0.1, timeDiff / (1000 * 60 * 60 * 24 * 30.4375));
  }
  result.activeMonths = Math.round(activeMonths * 100) / 100;
  
  // 1. Base Income
  const monthlyGrossRent = f.actualRentalIncome ?? f.monthlyGrossRent ?? f.projectedMonthlyRent ?? 0;
  const otherMonthlyIncome = f.otherMonthlyIncome ?? ((f.grossIncomeParking ?? 0) + (f.grossIncomeLaundry ?? 0));
  result.grossRents = (monthlyGrossRent + otherMonthlyIncome) * activeMonths;
  
  // 2. Base Operating Expenses from flat financials (multiplied by active months)
  result.taxes = (f.holdingCostTaxes ?? f.operatingExpenseTaxes ?? 0) * activeMonths;
  result.insurance = (f.holdingCostInsurance ?? f.operatingExpenseInsurance ?? 0) * activeMonths;
  result.utilities = (f.holdingCostUtilities ?? 0) * activeMonths;
  
  if (f.propertyManagementFeePercent != null) {
    result.managementFees = (result.grossRents * (f.propertyManagementFeePercent / 100));
  } else {
    result.managementFees = (f.propertyManagementFee ?? 0) * activeMonths;
  }
  
  result.repairs = (f.monthlyMaintenanceReserve ?? f.maintenanceReserves ?? 0) * activeMonths;
  result.other = (f.monthlyHOA ?? 0) * activeMonths;
  
  // 3. Mortgage Interest
  if (f.loanAmount && f.loanInterestRate && f.loanTermYears) {
    const monthlyRate = (f.loanInterestRate / 100) / 12;
    const totalPayments = f.loanTermYears * 12;
    const monthlyPayment = f.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
    if (!isNaN(monthlyPayment) && isFinite(monthlyPayment)) {
      let interestTotal = 0;
      let current = new Date(yearStart.getFullYear(), yearStart.getMonth(), 1);
      const end = new Date(yearEnd.getFullYear(), yearEnd.getMonth(), 1);
      
      while (current <= end) {
        const currentMonthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        const overlapStart = new Date(Math.max(acqDate.getTime(), current.getTime()));
        const overlapEnd = new Date(Math.min(holdEnd.getTime(), currentMonthEnd.getTime()));
        
        if (overlapStart <= overlapEnd) {
          const elapsedMonths = (current.getFullYear() - acqDate.getFullYear()) * 12 + (current.getMonth() - acqDate.getMonth());
          if (elapsedMonths >= 0 && elapsedMonths < totalPayments) {
            let balance = f.loanAmount;
            let interestPayment = 0;
            for (let payNum = 0; payNum <= elapsedMonths; payNum++) {
              interestPayment = balance * monthlyRate;
              const principalPayment = monthlyPayment - interestPayment;
              balance = Math.max(0, balance - principalPayment);
            }
            
            // Adjust for active fraction of the month
            const daysInMonth = currentMonthEnd.getDate();
            const activeDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const activeFraction = Math.min(1, activeDays / daysInMonth);
            interestTotal += interestPayment * activeFraction;
          }
        }
        current.setMonth(current.getMonth() + 1);
      }
      result.mortgageInterest = interestTotal;
    }
  }
  
  // 4. Straight-line Depreciation Estimate (27.5-Yr Residential)
  // Improvement value is estimated at 80% of total acquisition cost
  const acquisitionBasis = (f.purchasePrice ?? 0) + (f.fixedAcquisitionCosts ?? 0);
  const depreciableBasis = acquisitionBasis * 0.8;
  const annualDepreciation = depreciableBasis / 27.5;
  const monthlyDepreciation = annualDepreciation / 12;
  
  if (project.strategyType === 'Rent' || project.strategyType === 'Buy & Hold') {
    result.depreciation = monthlyDepreciation * activeMonths;
  }
  
  // 5. Integrate actual LedgerItem transactions for the year
  const yearRangeStart = yearStart.getTime();
  const yearRangeEnd = yearEnd.getTime();
  
  const targetItems = ledgerItems.filter(item => {
    if (item.status !== 'Approved') return false;
    const itemDate = parseDateSafe(item.createdAt);
    if (!itemDate) return false;
    const time = itemDate.getTime();
    return time >= yearRangeStart && time <= yearRangeEnd;
  });
  
  targetItems.forEach(item => {
    const desc = (item.description || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const amount = item.amount ?? 0;
    
    // Auto-map based on keywords and categories
    if (desc.includes('advertis') || desc.includes('marketing') || desc.includes('promo')) {
      result.advertising += amount;
    } else if (desc.includes('travel') || desc.includes('mileage') || desc.includes('gas') || desc.includes('car') || desc.includes('auto')) {
      result.autoTravel += amount;
    } else if (desc.includes('clean') || desc.includes('pest') || desc.includes('yard') || desc.includes('lawn') || desc.includes('landscap') || cat === 'landscaping') {
      result.cleaning += amount;
    } else if (desc.includes('commission') || desc.includes('broker') || desc.includes('agent')) {
      result.commissions += amount;
    } else if (desc.includes('insur')) {
      result.insurance += amount;
    } else if (desc.includes('legal') || desc.includes('attorney') || desc.includes('professional') || desc.includes('cpa') || desc.includes('account')) {
      result.legalProfessional += amount;
    } else if (desc.includes('manage') || desc.includes('property manager') || desc.includes('pm fee')) {
      result.managementFees += amount;
    } else if (desc.includes('mortgage interest') || desc.includes('loan interest')) {
      result.mortgageInterest += amount;
    } else if (desc.includes('interest')) {
      result.otherInterest += amount;
    } else if (
      cat === 'plumbing' || cat === 'electrical' || cat === 'framing' || 
      cat === 'hvac' || cat === 'foundation' || desc.includes('repair') || 
      desc.includes('fix') || desc.includes('maintenance') || desc.includes('plumb') ||
      desc.includes('electric') || desc.includes('paint') || desc.includes('roof')
    ) {
      result.repairs += amount;
    } else if (desc.includes('suppl')) {
      result.supplies += amount;
    } else if (desc.includes('tax') || desc.includes('property tax') || desc.includes('assessment')) {
      result.taxes += amount;
    } else if (desc.includes('utilit') || desc.includes('water') || desc.includes('sewer') || desc.includes('trash') || desc.includes('power')) {
      result.utilities += amount;
    } else if (desc.includes('deprec')) {
      result.depreciation += amount;
    } else if (desc.includes('hoa') || desc.includes('association') || desc.includes('dues') || desc.includes('fee')) {
      result.other += amount;
    } else {
      // Default fallback
      result.other += amount;
    }
  });
  
  // Sum up totals
  result.totalExpenses = 
    result.advertising +
    result.autoTravel +
    result.cleaning +
    result.commissions +
    result.insurance +
    result.legalProfessional +
    result.managementFees +
    result.mortgageInterest +
    result.otherInterest +
    result.repairs +
    result.supplies +
    result.taxes +
    result.utilities +
    result.depreciation +
    result.other;
    
  result.netIncome = result.grossRents - result.totalExpenses;
  
  // Format to standard 2-decimal numbers — NaN/Infinity → 0 so nulls in source data never crash callers
  const round = (val: number) => (isNaN(val) || !isFinite(val)) ? 0 : Math.round(val * 100) / 100;
  result.grossRents = round(result.grossRents);
  result.advertising = round(result.advertising);
  result.autoTravel = round(result.autoTravel);
  result.cleaning = round(result.cleaning);
  result.commissions = round(result.commissions);
  result.insurance = round(result.insurance);
  result.legalProfessional = round(result.legalProfessional);
  result.managementFees = round(result.managementFees);
  result.mortgageInterest = round(result.mortgageInterest);
  result.otherInterest = round(result.otherInterest);
  result.repairs = round(result.repairs);
  result.supplies = round(result.supplies);
  result.taxes = round(result.taxes);
  result.utilities = round(result.utilities);
  result.depreciation = round(result.depreciation);
  result.other = round(result.other);
  result.totalExpenses = round(result.totalExpenses);
  result.netIncome = round(result.netIncome);
  
  return result;
}
