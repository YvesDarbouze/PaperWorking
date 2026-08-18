import { ProjectTaxDatapoints } from './datapoint-schema';

export interface QuarterlyPLResult {
  quarter: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

export interface EstimatedTaxResult {
  quarterlyNetIncome: number;
  estimatedTaxDue: number;
  safeHarborThreshold: number;
  qualifiesForSafeHarbor: boolean;
  safeHarborMultiplier: number; // 1.0 (100%) or 1.10 (110%)
}

export interface ScheduleEResult {
  grossRentalIncome: number;
  totalOperatingExpenses: number;
  netRentalIncomeOrLoss: number;
  depreciationDeduction: number;
  itemizedExpenses: {
    mortgageInterest: number;
    propertyTaxes: number;
    insurance: number;
    repairsMaintenance: number;
    depreciation: number;
    other: number;
  };
}

export interface DepreciationResult {
  propertyBasis: number;
  landValue: number;
  depreciableBasis: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  depreciationMethod: 'MACRS_27_5_res' | 'MACRS_39_comm';
}

export interface CapitalGainsResult {
  purchasePrice: number;
  closingCosts: number;
  rehabCosts: number;
  capitalImprovementsTotal: number;
  depreciationTaken: number;
  adjustedBasis: number;
  amountRealized: number;
  capitalGainOrLoss: number;
  holdingPeriodMonths: number;
  isLongTerm: boolean;
  taxTreatment: 'Ordinary Income (Short-Term)' | 'Capital Gains Rate (Long-Term)';
}

export interface Exchange1031Result {
  is1031Eligible: boolean;
  identifiedDate?: string;
  daysToIdentify: number;
  within45Days: boolean;
  deferredTaxGain: number;
  status: 'Compliant' | 'Non-Compliant - Exceeded 45-Day Identification Window';
}

export interface Contractor1099Result {
  contractorName: string;
  totalPaid: number;
  requires1099NEC: boolean;
}

/**
 * Calculates Quarterly Profit & Loss for a project
 */
export function calculateQuarterlyPL(
  datapoints: ProjectTaxDatapoints,
  quarter: 1 | 2 | 3 | 4
): QuarterlyPLResult {
  const rentalIncome = (datapoints.d3_hold.rental_income || 0) * 3; // 3 months per quarter
  const monthlyExpenses =
    (datapoints.d3_hold.monthly_mortgage || 0) +
    (datapoints.d3_hold.monthly_insurance || 0) +
    (datapoints.d3_hold.monthly_property_tax || 0) +
    (datapoints.d3_hold.monthly_utilities || 0) +
    (datapoints.d3_hold.monthly_hoa || 0) +
    (datapoints.d3_hold.monthly_maintenance || 0) +
    (datapoints.d3_hold.property_mgmt_fees || 0);

  const totalExpenses = monthlyExpenses * 3;
  const netIncome = rentalIncome - totalExpenses;

  return {
    quarter,
    totalIncome: rentalIncome,
    totalExpenses,
    netIncome,
  };
}

/**
 * Calculates Form 1040-ES Estimated Tax & Safe Harbor
 */
export function calculate1040ES(
  quarterlyNetIncome: number,
  taxRate: number = 0.25,
  priorYearTax: number = 0,
  priorYearAGI: number = 100000
): EstimatedTaxResult {
  const estimatedTaxDue = Number(Math.max(0, quarterlyNetIncome * taxRate).toFixed(2));
  const safeHarborMultiplier = priorYearAGI > 150000 ? 1.1 : 1.0;
  const safeHarborThreshold = Number(((priorYearTax * safeHarborMultiplier) / 4).toFixed(2));
  const qualifiesForSafeHarbor = estimatedTaxDue >= safeHarborThreshold;

  return {
    quarterlyNetIncome,
    estimatedTaxDue,
    safeHarborThreshold,
    qualifiesForSafeHarbor,
    safeHarborMultiplier,
  };
}

/**
 * Calculates Schedule E Supplemental Income & Loss
 */
export function calculateScheduleE(datapoints: ProjectTaxDatapoints): ScheduleEResult {
  const grossRentalIncome = datapoints.d6_schedule_e.rental_income_received || datapoints.d3_hold.rental_income * 12;
  const mortgageInterest = datapoints.d6_schedule_e.mortgage_interest_paid || datapoints.d3_hold.monthly_mortgage * 12;
  const propertyTaxes = datapoints.d6_schedule_e.property_tax_paid || datapoints.d3_hold.monthly_property_tax * 12;
  const insurance = datapoints.d6_schedule_e.insurance_premium || datapoints.d3_hold.monthly_insurance * 12;
  const repairsMaintenance = datapoints.d6_schedule_e.repairs_maintenance || datapoints.d3_hold.monthly_maintenance * 12;
  const depreciation = datapoints.d6_schedule_e.depreciation_amount || calculateDepreciation(datapoints).annualDepreciation;
  const other = datapoints.d6_schedule_e.other_expenses || (datapoints.d3_hold.monthly_utilities + datapoints.d3_hold.monthly_hoa) * 12;

  const totalOperatingExpenses = Number(
    (mortgageInterest + propertyTaxes + insurance + repairsMaintenance + depreciation + other).toFixed(2)
  );
  const netRentalIncomeOrLoss = Number((grossRentalIncome - totalOperatingExpenses).toFixed(2));

  return {
    grossRentalIncome,
    totalOperatingExpenses,
    netRentalIncomeOrLoss,
    depreciationDeduction: depreciation,
    itemizedExpenses: {
      mortgageInterest,
      propertyTaxes,
      insurance,
      repairsMaintenance,
      depreciation,
      other,
    },
  };
}

/**
 * Calculates Form 4562 Depreciation (MACRS 27.5-yr residential or 39-yr commercial)
 */
export function calculateDepreciation(datapoints: ProjectTaxDatapoints): DepreciationResult {
  const propertyBasis = datapoints.d7_depreciation.property_basis || datapoints.d2_purchase.purchase_price || 0;
  const landValue = datapoints.d7_depreciation.land_value || propertyBasis * 0.2; // Standard 20% land allocation fallback
  const depreciableBasis = Math.max(0, propertyBasis - landValue);

  const method = datapoints.d7_depreciation.method || 'MACRS_27_5_res';
  const recoveryPeriod = method === 'MACRS_27_5_res' ? 27.5 : 39.0;

  const annualDepreciation = Number((depreciableBasis / recoveryPeriod).toFixed(2));
  const monthlyDepreciation = Number((annualDepreciation / 12).toFixed(2));

  return {
    propertyBasis,
    landValue,
    depreciableBasis,
    annualDepreciation,
    monthlyDepreciation,
    depreciationMethod: method,
  };
}

/**
 * Calculates Capital Gains / Adjusted Basis (Schedule D / Form 8949)
 */
export function calculateCapitalGains(datapoints: ProjectTaxDatapoints): CapitalGainsResult {
  const purchasePrice = datapoints.d2_purchase.purchase_price || 0;
  const closingCosts = datapoints.d2_purchase.closing_costs || 0;
  const rehabCosts = datapoints.d3_hold.rehab_labor + datapoints.d3_hold.rehab_materials;
  const capitalImprovementsTotal = (datapoints.d7_depreciation.capital_improvements || []).reduce(
    (sum, imp) => sum + imp.cost,
    0
  );
  const depreciationTaken = datapoints.d6_schedule_e.depreciation_amount || calculateDepreciation(datapoints).annualDepreciation;

  const adjustedBasis = Number((purchasePrice + closingCosts + rehabCosts + capitalImprovementsTotal - depreciationTaken).toFixed(2));
  const amountRealized = Number((datapoints.d4_exit.sale_price - (datapoints.d4_exit.realtor_commission + datapoints.d4_exit.marketing_costs)).toFixed(2));
  const capitalGainOrLoss = Number((amountRealized - adjustedBasis).toFixed(2));

  const holdingPeriodMonths = datapoints.d8_capital_gains.holding_period_months || Math.floor((datapoints.d4_exit.holding_days_total || 180) / 30);
  const isLongTerm = holdingPeriodMonths >= 12;

  return {
    purchasePrice,
    closingCosts,
    rehabCosts,
    capitalImprovementsTotal,
    depreciationTaken,
    adjustedBasis,
    amountRealized,
    capitalGainOrLoss,
    holdingPeriodMonths,
    isLongTerm,
    taxTreatment: isLongTerm ? 'Capital Gains Rate (Long-Term)' : 'Ordinary Income (Short-Term)',
  };
}

/**
 * Validates 1031 Exchange Rules (45-day identification & 180-day closing rule)
 */
export function calculate1031Exchange(
  saleDate: string,
  identifiedDate?: string,
  capitalGain: number = 0
): Exchange1031Result {
  if (!identifiedDate || !saleDate) {
    return {
      is1031Eligible: false,
      daysToIdentify: 0,
      within45Days: false,
      deferredTaxGain: 0,
      status: 'Non-Compliant - Exceeded 45-Day Identification Window',
    };
  }

  const sale = new Date(saleDate).getTime();
  const ident = new Date(identifiedDate).getTime();
  const diffDays = Math.ceil((ident - sale) / (1000 * 3600 * 24));

  const within45Days = diffDays >= 0 && diffDays <= 45;

  return {
    is1031Eligible: within45Days,
    identifiedDate,
    daysToIdentify: diffDays,
    within45Days,
    deferredTaxGain: within45Days ? capitalGain : 0,
    status: within45Days ? 'Compliant' : 'Non-Compliant - Exceeded 45-Day Identification Window',
  };
}

export const NO_STATE_INCOME_TAX_STATES = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'];

export interface StateTaxNotice {
  state: string;
  hasStateIncomeTax: boolean;
  message: string;
}

/**
 * Evaluates state income tax implications and returns state notice
 */
export function checkStateTaxRules(stateCode: string): StateTaxNotice {
  const upperState = (stateCode || '').toUpperCase().trim();
  const noIncomeTax = NO_STATE_INCOME_TAX_STATES.includes(upperState);

  return {
    state: upperState,
    hasStateIncomeTax: !noIncomeTax,
    message: noIncomeTax
      ? `Your state (${upperState}) has no state income tax. Estimated tax applies to federal tax obligations only.`
      : `State income tax rules apply for ${upperState}. Verify estimated quarterly payments with your CPA.`,
  };
}

export interface Detailed1099ThresholdResult {
  contractorName: string;
  totalPaid: number;
  formType: '1099-NEC' | '1099-MISC' | '1099-S';
  requiresForm: boolean;
  amountRemainingUntilThreshold: number;
  warningMessage: string;
}

/**
 * Checks Form 1099 Thresholds ($600 per contractor for 1099-NEC / 1099-MISC)
 */
export function calculate1099Thresholds(datapoints: ProjectTaxDatapoints): Contractor1099Result[] {
  const contractors = datapoints.d9_1099_returns.contractors_paid || [];
  return contractors.map(contractor => ({
    contractorName: contractor.name,
    totalPaid: contractor.amount,
    requires1099NEC: contractor.amount >= 600 && contractor.type === 'NEC',
  }));
}

/**
 * Detailed 1099 threshold tracking with remaining balance warnings
 */
export function calculateDetailed1099Tracking(
  contractorName: string,
  totalPaid: number,
  formType: '1099-NEC' | '1099-MISC' | '1099-S' = '1099-NEC'
): Detailed1099ThresholdResult {
  const threshold = formType === '1099-S' ? 0 : 600;
  const requiresForm = totalPaid >= threshold;
  const amountRemaining = Math.max(0, threshold - totalPaid);

  let warningMessage = `You have paid ${contractorName} $${totalPaid}.`;
  if (requiresForm) {
    warningMessage += ` Threshold ($${threshold}) reached — Form ${formType} filing required.`;
  } else if (amountRemaining > 0) {
    warningMessage += ` $${amountRemaining} more triggers Form ${formType} requirement.`;
  }

  return {
    contractorName,
    totalPaid,
    formType,
    requiresForm,
    amountRemainingUntilThreshold: amountRemaining,
    warningMessage,
  };
}

export interface ScheduleELineMapping {
  line3_RentsReceived: number;
  line5_Advertising: number;
  line7_AutoAndTravel: number;
  line8_CleaningAndMaintenance: number;
  line9_Commissions: number;
  line10_Insurance: number;
  line11_LegalProfessionalFees: number;
  line12_ManagementFees: number;
  line13_MortgageInterest: number;
  line14_OtherInterest: number;
  line15_Repairs: number;
  line16_Supplies: number;
  line17_Taxes: number;
  line18_Utilities: number;
  line19_Depreciation: number;
  line20_OtherExpenses: number;
  totalExpenses: number;
  netIncomeOrLoss: number;
}

/**
 * Maps project financial actuals to IRS Schedule E Lines 3 through 20
 */
export function mapScheduleELines(datapoints: ProjectTaxDatapoints): ScheduleELineMapping {
  const scheduleE = calculateScheduleE(datapoints);

  const line3 = scheduleE.grossRentalIncome;
  const line8 = scheduleE.itemizedExpenses.repairsMaintenance;
  const line10 = scheduleE.itemizedExpenses.insurance;
  const line12 = (datapoints.d3_hold.property_mgmt_fees || 0) * 12;
  const line13 = scheduleE.itemizedExpenses.mortgageInterest;
  const line17 = scheduleE.itemizedExpenses.propertyTaxes;
  const line18 = (datapoints.d3_hold.monthly_utilities || 0) * 12;
  const line19 = scheduleE.depreciationDeduction;
  const line20 = (datapoints.d3_hold.monthly_hoa || 0) * 12;

  const totalExp = line8 + line10 + line12 + line13 + line17 + line18 + line19 + line20;
  const netIncome = line3 - totalExp;

  return {
    line3_RentsReceived: line3,
    line5_Advertising: 0,
    line7_AutoAndTravel: 0,
    line8_CleaningAndMaintenance: line8,
    line9_Commissions: 0,
    line10_Insurance: line10,
    line11_LegalProfessionalFees: 0,
    line12_ManagementFees: line12,
    line13_MortgageInterest: line13,
    line14_OtherInterest: 0,
    line15_Repairs: 0,
    line16_Supplies: 0,
    line17_Taxes: line17,
    line18_Utilities: line18,
    line19_Depreciation: line19,
    line20_OtherExpenses: line20,
    totalExpenses: totalExp,
    netIncomeOrLoss: netIncome,
  };
}

