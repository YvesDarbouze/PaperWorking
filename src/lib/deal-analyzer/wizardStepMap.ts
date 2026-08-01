import { Strategy } from './fieldRegistry';

export interface WizardStepDefinition {
  id: string;
  title: string;
  subtitle: string;
  fieldKeys: string[];
  isConditional?: boolean;
}

export const RENTAL_WIZARD_STEPS: WizardStepDefinition[] = [
  {
    id: 'purchase',
    title: 'The Property',
    subtitle: 'Enter initial purchase price, expected monthly rent, and property address.',
    fieldKeys: ['address', 'purchasePrice', 'monthlyRent'],
  },
  {
    id: 'financing',
    title: 'Purchase & Loan',
    subtitle: 'Configure down payment, interest rate, term, and acquisition closing fees.',
    fieldKeys: ['downPaymentPercent', 'interestRate', 'loanTermYears', 'purchaseClosingCostsPercent'],
  },
  {
    id: 'expenses',
    title: 'Property Expenses',
    subtitle: 'Set annual property taxes, insurance, and operating expense stack.',
    fieldKeys: ['propertyTaxesAnnual', 'insuranceAnnual', 'rentalExpenseBlock'],
  },
  {
    id: 'rehab',
    title: 'Renovation & Rehab',
    subtitle: 'Enter upfront rehab budget and estimated post-renovation value.',
    fieldKeys: ['upfrontRehabCost', 'arv', 'rehabOverrunPercent'],
    isConditional: true,
  },
  {
    id: 'long-term',
    title: 'Long-Term Projections',
    subtitle: 'Configure annual rent/expense growth rates, appreciation, and hold duration.',
    fieldKeys: ['rentGrowthAnnual', 'expenseGrowthAnnual', 'appreciationAnnual', 'holdPeriodYears', 'sellingCostsPercent'],
  },
];

export const FLIP_WIZARD_STEPS: WizardStepDefinition[] = [
  {
    id: 'acquisition',
    title: 'The Deal',
    subtitle: 'Enter property address, purchase price, and after-repair value (ARV).',
    fieldKeys: ['address', 'purchasePrice', 'arv'],
  },
  {
    id: 'rehab',
    title: 'Rehab & Timeline',
    subtitle: 'Specify estimated rehab budget and project hold duration in months.',
    fieldKeys: ['rehabBudget', 'holdingMonths'],
  },
  {
    id: 'financing',
    title: 'Hard Money Financing',
    subtitle: 'Configure hard money LTC, interest rate, lender points, and loan terms.',
    fieldKeys: ['hardMoneyLTC', 'hardMoneyRate', 'hardMoneyPoints'],
  },
  {
    id: 'holding',
    title: 'Holding Costs & Purchase Fees',
    subtitle: 'Specify pre-filled monthly holding expense stack and purchase closing fees.',
    fieldKeys: ['monthlyHoldingCosts', 'purchaseClosingCostsPercent'],
  },
  {
    id: 'sale',
    title: 'Resale & Exit Costs',
    subtitle: 'Enter estimated selling costs percentage, agent fees, and disposition costs.',
    fieldKeys: ['sellingCostsPercent'],
  },
];

export const BRRRR_WIZARD_STEPS: WizardStepDefinition[] = [
  {
    id: 'acquisition',
    title: 'The Deal',
    subtitle: 'Enter property address, initial purchase price, and estimated ARV.',
    fieldKeys: ['address', 'purchasePrice', 'arv'],
  },
  {
    id: 'rehab',
    title: 'Rehab & Timeline',
    subtitle: 'Specify rehab budget and pre-refinance holding duration in months.',
    fieldKeys: ['rehabBudget', 'preRefiHoldMonths'],
  },
  {
    id: 'bridge-financing',
    title: 'Bridge Loan & Holding',
    subtitle: 'Configure initial bridge loan LTC, rate, points, closing fees, and holding stack.',
    fieldKeys: ['bridgeLTC', 'bridgeRate', 'bridgePoints', 'purchaseClosingCostsPercent', 'monthlyHoldingCosts'],
  },
  {
    id: 'post-refi-operations',
    title: 'Post-Rehab Rent & Expenses',
    subtitle: 'Enter post-rehab monthly rent, annual taxes, insurance, and operating expense stack.',
    fieldKeys: ['monthlyRentPostRehab', 'propertyTaxesAnnual', 'insuranceAnnual', 'rentalExpenseBlock'],
  },
  {
    id: 'refi-takeout',
    title: 'Takeout Refinancing',
    subtitle: 'Configure permanent 30-year refinancing LTV, interest rate, and closing fees.',
    fieldKeys: ['refiLTV', 'refiRate', 'refiTermYears', 'refiClosingCostsPercent'],
  },
  {
    id: 'long-term',
    title: 'Long-Term Projections',
    subtitle: 'Configure post-refinance rent/expense growth rates, appreciation, and hold duration.',
    fieldKeys: ['rentGrowthAnnual', 'expenseGrowthAnnual', 'appreciationAnnual', 'holdPeriodYears', 'sellingCostsPercent'],
  },
];

export const WIZARD_STEP_MAPS: Record<Strategy, WizardStepDefinition[]> = {
  rental: RENTAL_WIZARD_STEPS,
  flip: FLIP_WIZARD_STEPS,
  brrrr: BRRRR_WIZARD_STEPS,
};

export function getWizardStepsForStrategy(
  strategy: Strategy,
  options?: { needsRehab?: boolean }
): WizardStepDefinition[] {
  const steps = WIZARD_STEP_MAPS[strategy] ?? RENTAL_WIZARD_STEPS;
  if (strategy === 'rental' && !options?.needsRehab) {
    return steps.filter((step) => step.id !== 'rehab');
  }
  return steps;
}
