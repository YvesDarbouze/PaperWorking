import {
  FIELD_REGISTRY,
  getFieldsForStrategy,
  getFieldDefinition,
  getFieldDefaultValue,
  validateField,
  deriveFields,
  formatFullName,
} from '@/lib/deal-analyzer/fieldRegistry';

describe('Prompt 3 — Deal Analyzer Defaults & Calculation Rules', () => {

  describe('Registry Defaults Integrity', () => {
    it('ships industry-standard defaults for all core operating parameters', () => {
      expect(getFieldDefaultValue('vacancyRate', 'rental')).toBe(5);
      expect(getFieldDefaultValue('repairsPercent', 'rental')).toBe(5);
      expect(getFieldDefaultValue('capexPercent', 'rental')).toBe(5);
      expect(getFieldDefaultValue('propertyMgmtPercent', 'rental')).toBe(10);
      expect(getFieldDefaultValue('insuranceAnnual', 'rental')).toBe(1200);

      expect(getFieldDefaultValue('rentGrowthAnnual', 'rental')).toBe(3);
      expect(getFieldDefaultValue('expenseGrowthAnnual', 'rental')).toBe(3);
      expect(getFieldDefaultValue('appreciationAnnual', 'rental')).toBe(3);
      expect(getFieldDefaultValue('holdPeriodYears', 'rental')).toBe(10);
      expect(getFieldDefaultValue('sellingCostsPercent', 'rental')).toBe(8);
    });

    it('ships hard money and bridge loan defaults correctly', () => {
      expect(getFieldDefaultValue('hardMoneyLTC', 'flip')).toBe(85);
      expect(getFieldDefaultValue('hardMoneyRate', 'flip')).toBe(11.5);
      expect(getFieldDefaultValue('hardMoneyPoints', 'flip')).toBe(2);

      expect(getFieldDefaultValue('bridgeLTC', 'brrrr')).toBe(85);
      expect(getFieldDefaultValue('bridgeRate', 'brrrr')).toBe(11.5);
      expect(getFieldDefaultValue('bridgePoints', 'brrrr')).toBe(2);
    });

    it('ships takeout refi defaults correctly', () => {
      expect(getFieldDefaultValue('refiLTV', 'brrrr')).toBe(75);
      expect(getFieldDefaultValue('refiRate', 'brrrr')).toBe(8.5);
      expect(getFieldDefaultValue('refiTermYears', 'brrrr')).toBe(30);
      expect(getFieldDefaultValue('refiClosingCostsPercent', 'brrrr')).toBe(2);
    });
  });

  describe('Purchase & Selling Closing Costs Defaults', () => {
    it('returns 3% closing default for rental, 2% for flip and BRRRR', () => {
      expect(getFieldDefaultValue('purchaseClosingCostsPercent', 'rental')).toBe(3);
      expect(getFieldDefaultValue('purchaseClosingCostsPercent', 'flip')).toBe(2);
      expect(getFieldDefaultValue('purchaseClosingCostsPercent', 'brrrr')).toBe(2);
      expect(getFieldDefaultValue('sellingCostsPercent', 'flip')).toBe(8);
    });
  });

  describe('Holding Costs Stack Pre-Fill Calculation', () => {
    it('returns $475 base holding stack default for flip and $325 for BRRRR', () => {
      expect(getFieldDefaultValue('monthlyHoldingCosts', 'flip')).toBe(475);
      expect(getFieldDefaultValue('monthlyHoldingCosts', 'brrrr')).toBe(325);
    });

    it('derives holding costs stack dynamically: taxes/12 + insurance ($250 flip / $100 BRRRR) + $225 utilities', () => {
      // Flip: $2,400 taxes/yr ($200/mo) + $250 vacant insurance + $225 utilities = $675/mo
      const flipDerived = deriveFields({ propertyTaxesAnnual: 2400 }, 'flip');
      expect(flipDerived.monthlyHoldingCosts).toBe(675);

      // BRRRR: $1,800 taxes/yr ($150/mo) + $100 landlord insurance + $225 utilities = $475/mo
      const brrrrDerived = deriveFields({ propertyTaxesAnnual: 1800 }, 'brrrr');
      expect(brrrrDerived.monthlyHoldingCosts).toBe(475);
    });
  });

  describe('Derive & Format Utility Logic', () => {
    it('derives loanAmount, downPaymentAmount, and totalProjectCost accurately', () => {
      const inputs = {
        purchasePrice: 400000,
        downPaymentPercent: 20,
        rehabBudget: 50000,
      };

      const derived = deriveFields(inputs);
      expect(derived.downPaymentAmount).toBe(80000);
      expect(derived.loanAmount).toBe(320000);
      expect(derived.totalProjectCost).toBe(450000);
    });

    it('combines first and last name into full name', () => {
      expect(formatFullName('Jane', 'Doe')).toBe('Jane Doe');
      expect(formatFullName('Jane', '')).toBe('Jane');
    });
  });

});
