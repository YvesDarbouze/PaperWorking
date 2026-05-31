import { Project, LedgerItem } from '@/types/schema';
import { parseDateSafe } from '@/lib/utils/taxService';
import { computeScheduleE, ScheduleEPreview } from './scheduleE';

export interface ProjectProfitAndLoss {
  projectId: string;
  propertyName: string;
  taxYear: number;
  activeMonths: number;
  
  // Income
  rentalIncome: number;
  otherIncome: number;
  grossRevenue: number;
  
  // Operating Expenses
  propertyTaxes: number;
  insurance: number;
  utilities: number;
  managementFees: number;
  repairsMaintenance: number;
  hoaFees: number;
  otherExpenses: number;
  totalOperatingExpenses: number;
  
  // NOI
  netOperatingIncome: number;
  
  // Financing & CapEx
  mortgageInterest: number;
  mortgagePrincipal: number;
  capitalizedImprovements: number;
  depreciation: number;
  
  // Net Taxable & Net Cash Flow
  netTaxableIncome: number; // NOI - mortgageInterest - depreciation
  netCashFlow: number; // NOI - mortgageInterest - mortgagePrincipal - capitalizedImprovements
  
  // Exit (if sold in year)
  isSold: boolean;
  salePrice: number;
  sellingCosts: number;
  netProceeds: number;
  realizedGainLoss: number;
}

/**
 * Computes the itemized P&L statement for a single project for a tax year.
 */
export function computeProjectProfitAndLoss(
  project: Project,
  ledgerItems: LedgerItem[],
  taxYear: number
): ProjectProfitAndLoss {
  // Leverage the Schedule E computation for aligned base numbers
  const schedE = computeScheduleE(project, ledgerItems, taxYear);
  const f = project.financials || {};
  const acqDate = parseDateSafe(f.acquisitionDate);
  const soldDate = project.status === 'Sold' ? parseDateSafe(f.soldDate) : null;
  
  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59, 999);
  
  const isSold = !!(soldDate && soldDate >= yearStart && soldDate <= yearEnd);
  
  // Base P&L Structure
  const pl: ProjectProfitAndLoss = {
    projectId: project.id,
    propertyName: schedE.propertyName,
    taxYear,
    activeMonths: schedE.activeMonths,
    rentalIncome: 0,
    otherIncome: 0,
    grossRevenue: schedE.grossRents,
    propertyTaxes: schedE.taxes,
    insurance: schedE.insurance,
    utilities: schedE.utilities,
    managementFees: schedE.managementFees,
    repairsMaintenance: schedE.repairs,
    hoaFees: 0, // Split out below
    otherExpenses: schedE.other,
    totalOperatingExpenses: schedE.totalExpenses - schedE.depreciation - schedE.mortgageInterest - schedE.otherInterest,
    netOperatingIncome: 0,
    mortgageInterest: schedE.mortgageInterest + schedE.otherInterest,
    mortgagePrincipal: 0,
    capitalizedImprovements: 0,
    depreciation: schedE.depreciation,
    netTaxableIncome: 0,
    netCashFlow: 0,
    isSold,
    salePrice: isSold ? (f.actualSalePrice ?? 0) : 0,
    sellingCosts: 0,
    netProceeds: 0,
    realizedGainLoss: 0,
  };
  
  if (pl.activeMonths === 0) {
    return pl;
  }
  
  // Split HOAs out of 'other' (Schedule E Maps HOA to other)
  const hoaMonthly = f.monthlyHOA ?? 0;
  pl.hoaFees = hoaMonthly * pl.activeMonths;
  pl.otherExpenses = Math.max(0, pl.otherExpenses - pl.hoaFees);
  
  // Re-split rental vs other income
  const monthlyGrossRent = f.actualRentalIncome ?? f.monthlyGrossRent ?? f.projectedMonthlyRent ?? 0;
  pl.rentalIncome = monthlyGrossRent * pl.activeMonths;
  pl.otherIncome = Math.max(0, pl.grossRevenue - pl.rentalIncome);
  
  // Calculate mortgage principal paydown for the period
  if (f.loanAmount && f.loanInterestRate && f.loanTermYears && acqDate) {
    const monthlyRate = (f.loanInterestRate / 100) / 12;
    const totalPayments = f.loanTermYears * 12;
    const monthlyPayment = f.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
    if (!isNaN(monthlyPayment) && isFinite(monthlyPayment)) {
      let principalTotal = 0;
      let current = new Date(yearStart.getFullYear(), yearStart.getMonth(), 1);
      const end = new Date(yearEnd.getFullYear(), yearEnd.getMonth(), 1);
      const holdEnd = soldDate ? new Date(Math.min(soldDate.getTime(), yearEnd.getTime())) : new Date(Math.min(Date.now(), yearEnd.getTime()));
      
      while (current <= end) {
        const currentMonthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        const overlapStart = new Date(Math.max(acqDate.getTime(), current.getTime()));
        const overlapEnd = new Date(Math.min(holdEnd.getTime(), currentMonthEnd.getTime()));
        
        if (overlapStart <= overlapEnd) {
          const elapsedMonths = (current.getFullYear() - acqDate.getFullYear()) * 12 + (current.getMonth() - acqDate.getMonth());
          if (elapsedMonths >= 0 && elapsedMonths < totalPayments) {
            let balance = f.loanAmount;
            let principalPayment = 0;
            for (let payNum = 0; payNum <= elapsedMonths; payNum++) {
              const interestPayment = balance * monthlyRate;
              principalPayment = monthlyPayment - interestPayment;
              balance = Math.max(0, balance - principalPayment);
            }
            
            const daysInMonth = currentMonthEnd.getDate();
            const activeDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const activeFraction = Math.min(1, activeDays / daysInMonth);
            principalTotal += principalPayment * activeFraction;
          }
        }
        current.setMonth(current.getMonth() + 1);
      }
      pl.mortgagePrincipal = principalTotal;
    }
  }
  
  // Calculate Capitalized Improvements (approved ledger items matching rehab category or capEx keywords)
  const yearRangeStart = yearStart.getTime();
  const yearRangeEnd = yearEnd.getTime();
  
  const targetItems = ledgerItems.filter(item => {
    if (item.status !== 'Approved') return false;
    const itemDate = parseDateSafe(item.createdAt);
    if (!itemDate) return false;
    const time = itemDate.getTime();
    return time >= yearRangeStart && time <= yearRangeEnd;
  });
  
  let capitalizedRehab = 0;
  // If the user has f.costs, check them too as fallback
  const costs = f.costs || [];
  for (const c of costs) {
    if (c.approved) {
      const cDate = parseDateSafe(c.createdAt);
      if (cDate && cDate.getTime() >= yearRangeStart && cDate.getTime() <= yearRangeEnd) {
        capitalizedRehab += c.amount;
      }
    }
  }
  
  pl.capitalizedImprovements = capitalizedRehab;
  
  // Calculate Net Operating Income (NOI)
  pl.netOperatingIncome = pl.grossRevenue - pl.totalOperatingExpenses;
  
  // Calculate Net Taxable Income
  pl.netTaxableIncome = pl.netOperatingIncome - pl.mortgageInterest - pl.depreciation;
  
  // Calculate Net Cash Flow
  pl.netCashFlow = pl.netOperatingIncome - pl.mortgageInterest - pl.mortgagePrincipal - pl.capitalizedImprovements;
  
  // Exit / Gain calculations
  if (isSold) {
    if (f.sellingCosts != null) {
      pl.sellingCosts = f.sellingCosts;
    } else {
      const finalClosingCosts = f.finalClosingCosts ?? 0;
      const commissionsPct = (f.buyersAgentCommission ?? 0) + (f.sellersAgentCommission ?? 0);
      const commissionsVal = pl.salePrice * (commissionsPct / 100);
      const extraSelling = (f.stagingCosts ?? 0) + (f.photographyAndMedia ?? 0) + (f.mlsListingFees ?? 0);
      pl.sellingCosts = finalClosingCosts + commissionsVal + extraSelling;
    }
    
    pl.netProceeds = pl.salePrice - pl.sellingCosts;
    
    // Capital Gains Basis: purchasePrice + fixedAcquisitionCosts + lifetimeCapitalizedRehab
    const acquisitionBasis = (f.purchasePrice ?? 0) + (f.fixedAcquisitionCosts ?? 0);
    
    let lifetimeCapitalizedRehab = 0;
    const allApprovedLedger = ledgerItems.filter(item => item.status === 'Approved');
    allApprovedLedger.forEach(item => {
      lifetimeCapitalizedRehab += item.amount;
    });
    // Fallback to legacy costs
    if (allApprovedLedger.length === 0) {
      costs.forEach(c => {
        if (c.approved) lifetimeCapitalizedRehab += c.amount;
      });
    }
    
    const totalBasis = acquisitionBasis + lifetimeCapitalizedRehab;
    pl.realizedGainLoss = pl.salePrice - totalBasis - pl.sellingCosts;
  }
  
  // Round all values
  const round = (val: number) => Math.round(val * 100) / 100;
  pl.rentalIncome = round(pl.rentalIncome);
  pl.otherIncome = round(pl.otherIncome);
  pl.grossRevenue = round(pl.grossRevenue);
  pl.propertyTaxes = round(pl.propertyTaxes);
  pl.insurance = round(pl.insurance);
  pl.utilities = round(pl.utilities);
  pl.managementFees = round(pl.managementFees);
  pl.repairsMaintenance = round(pl.repairsMaintenance);
  pl.hoaFees = round(pl.hoaFees);
  pl.otherExpenses = round(pl.otherExpenses);
  pl.totalOperatingExpenses = round(pl.totalOperatingExpenses);
  pl.netOperatingIncome = round(pl.netOperatingIncome);
  pl.mortgageInterest = round(pl.mortgageInterest);
  pl.mortgagePrincipal = round(pl.mortgagePrincipal);
  pl.capitalizedImprovements = round(pl.capitalizedImprovements);
  pl.depreciation = round(pl.depreciation);
  pl.netTaxableIncome = round(pl.netTaxableIncome);
  pl.netCashFlow = round(pl.netCashFlow);
  pl.salePrice = round(pl.salePrice);
  pl.sellingCosts = round(pl.sellingCosts);
  pl.netProceeds = round(pl.netProceeds);
  pl.realizedGainLoss = round(pl.realizedGainLoss);
  
  return pl;
}
