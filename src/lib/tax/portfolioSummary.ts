import { ProjectProfitAndLoss } from './profitAndLoss';
import { ScheduleEPreview } from './scheduleE';

export interface PortfolioTaxSummary {
  taxYear: number;
  activePropertiesCount: number;
  totalActiveMonths: number;
  
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
  
  // Totals
  netTaxableIncome: number;
  netCashFlow: number;
  
  // Exit Totals
  propertiesSold: number;
  totalSalePrice: number;
  totalSellingCosts: number;
  totalNetProceeds: number;
  totalRealizedGainLoss: number;
}

/**
 * Aggregates P&L results across multiple projects.
 */
export function aggregatePortfolioProfitAndLoss(
  results: ProjectProfitAndLoss[],
  taxYear: number
): PortfolioTaxSummary {
  const summary: PortfolioTaxSummary = {
    taxYear,
    activePropertiesCount: results.filter(r => r.activeMonths > 0).length,
    totalActiveMonths: 0,
    rentalIncome: 0,
    otherIncome: 0,
    grossRevenue: 0,
    propertyTaxes: 0,
    insurance: 0,
    utilities: 0,
    managementFees: 0,
    repairsMaintenance: 0,
    hoaFees: 0,
    otherExpenses: 0,
    totalOperatingExpenses: 0,
    netOperatingIncome: 0,
    mortgageInterest: 0,
    mortgagePrincipal: 0,
    capitalizedImprovements: 0,
    depreciation: 0,
    netTaxableIncome: 0,
    netCashFlow: 0,
    propertiesSold: results.filter(r => r.isSold).length,
    totalSalePrice: 0,
    totalSellingCosts: 0,
    totalNetProceeds: 0,
    totalRealizedGainLoss: 0,
  };
  
  results.forEach(r => {
    summary.totalActiveMonths += r.activeMonths;
    summary.rentalIncome += r.rentalIncome;
    summary.otherIncome += r.otherIncome;
    summary.grossRevenue += r.grossRevenue;
    summary.propertyTaxes += r.propertyTaxes;
    summary.insurance += r.insurance;
    summary.utilities += r.utilities;
    summary.managementFees += r.managementFees;
    summary.repairsMaintenance += r.repairsMaintenance;
    summary.hoaFees += r.hoaFees;
    summary.otherExpenses += r.otherExpenses;
    summary.totalOperatingExpenses += r.totalOperatingExpenses;
    summary.netOperatingIncome += r.netOperatingIncome;
    summary.mortgageInterest += r.mortgageInterest;
    summary.mortgagePrincipal += r.mortgagePrincipal;
    summary.capitalizedImprovements += r.capitalizedImprovements;
    summary.depreciation += r.depreciation;
    summary.netTaxableIncome += r.netTaxableIncome;
    summary.netCashFlow += r.netCashFlow;
    
    if (r.isSold) {
      summary.totalSalePrice += r.salePrice;
      summary.totalSellingCosts += r.sellingCosts;
      summary.totalNetProceeds += r.netProceeds;
      summary.totalRealizedGainLoss += r.realizedGainLoss;
    }
  });
  
  // Round all aggregated values
  const round = (val: number) => Math.round(val * 100) / 100;
  summary.totalActiveMonths = round(summary.totalActiveMonths);
  summary.rentalIncome = round(summary.rentalIncome);
  summary.otherIncome = round(summary.otherIncome);
  summary.grossRevenue = round(summary.grossRevenue);
  summary.propertyTaxes = round(summary.propertyTaxes);
  summary.insurance = round(summary.insurance);
  summary.utilities = round(summary.utilities);
  summary.managementFees = round(summary.managementFees);
  summary.repairsMaintenance = round(summary.repairsMaintenance);
  summary.hoaFees = round(summary.hoaFees);
  summary.otherExpenses = round(summary.otherExpenses);
  summary.totalOperatingExpenses = round(summary.totalOperatingExpenses);
  summary.netOperatingIncome = round(summary.netOperatingIncome);
  summary.mortgageInterest = round(summary.mortgageInterest);
  summary.mortgagePrincipal = round(summary.mortgagePrincipal);
  summary.capitalizedImprovements = round(summary.capitalizedImprovements);
  summary.depreciation = round(summary.depreciation);
  summary.netTaxableIncome = round(summary.netTaxableIncome);
  summary.netCashFlow = round(summary.netCashFlow);
  summary.totalSalePrice = round(summary.totalSalePrice);
  summary.totalSellingCosts = round(summary.totalSellingCosts);
  summary.totalNetProceeds = round(summary.totalNetProceeds);
  summary.totalRealizedGainLoss = round(summary.totalRealizedGainLoss);
  
  return summary;
}

/**
 * Aggregates Schedule E Preview reports across multiple properties.
 */
export function aggregateScheduleE(
  previews: ScheduleEPreview[],
  taxYear: number
): Omit<ScheduleEPreview, 'projectId' | 'propertyName' | 'physicalAddress' | 'propertyType'> {
  const agg: Omit<ScheduleEPreview, 'projectId' | 'propertyName' | 'physicalAddress' | 'propertyType'> = {
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
  
  previews.forEach(p => {
    agg.activeMonths += p.activeMonths;
    agg.grossRents += p.grossRents;
    agg.advertising += p.advertising;
    agg.autoTravel += p.autoTravel;
    agg.cleaning += p.cleaning;
    agg.commissions += p.commissions;
    agg.insurance += p.insurance;
    agg.legalProfessional += p.legalProfessional;
    agg.managementFees += p.managementFees;
    agg.mortgageInterest += p.mortgageInterest;
    agg.otherInterest += p.otherInterest;
    agg.repairs += p.repairs;
    agg.supplies += p.supplies;
    agg.taxes += p.taxes;
    agg.utilities += p.utilities;
    agg.depreciation += p.depreciation;
    agg.other += p.other;
    agg.totalExpenses += p.totalExpenses;
    agg.netIncome += p.netIncome;
  });
  
  const round = (val: number) => Math.round(val * 100) / 100;
  agg.activeMonths = round(agg.activeMonths);
  agg.grossRents = round(agg.grossRents);
  agg.advertising = round(agg.advertising);
  agg.autoTravel = round(agg.autoTravel);
  agg.cleaning = round(agg.cleaning);
  agg.commissions = round(agg.commissions);
  agg.insurance = round(agg.insurance);
  agg.legalProfessional = round(agg.legalProfessional);
  agg.managementFees = round(agg.managementFees);
  agg.mortgageInterest = round(agg.mortgageInterest);
  agg.otherInterest = round(agg.otherInterest);
  agg.repairs = round(agg.repairs);
  agg.supplies = round(agg.supplies);
  agg.taxes = round(agg.taxes);
  agg.utilities = round(agg.utilities);
  agg.depreciation = round(agg.depreciation);
  agg.other = round(agg.other);
  agg.totalExpenses = round(agg.totalExpenses);
  agg.netIncome = round(agg.netIncome);
  
  return agg;
}
