import { prisma } from '@/lib/prisma';
import {
  ACQUISITION_VARIABLE_REGISTRY,
  getRegistryField,
  getDualSlotFields,
} from '@/lib/metrics/acquisitionVariableRegistry';

// We mock Prisma to avoid requiring a live database connection during tests
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      reilFundingPlan: {},
      reilCapitalSource: {},
      reilEquityParty: {},
      reilLoanRecord: {},
      reilContributionEntry: {},
      reilTitleHolding: {},
      reilClosingMilestone: {},
      reilClosingRecord: {},
    },
  };
});

describe('FD-3: Fund Data Plane Migration Verification', () => {
  describe('Prisma Model Verification', () => {
    it('should have all 8 Fund phase relational models defined on the Prisma client', () => {
      expect(prisma.reilFundingPlan).toBeDefined();
      expect(prisma.reilCapitalSource).toBeDefined();
      expect(prisma.reilEquityParty).toBeDefined();
      expect(prisma.reilLoanRecord).toBeDefined();
      expect(prisma.reilContributionEntry).toBeDefined();
      expect(prisma.reilTitleHolding).toBeDefined();
      expect(prisma.reilClosingMilestone).toBeDefined();
      expect(prisma.reilClosingRecord).toBeDefined();
    });
  });

  describe('Variable Registry & Slot Verification', () => {
    const requiredFundFields = [
      'purchase_price',
      'loan_amount',
      'loan_interest_rate',
      'loan_term',
      'loanOriginationPoints',
      'closing_costs',
      'cash_to_close',
      'earnest_money',
      'down_payment_pct',
      'acquisition_date',
      'commissions',
    ];

    it('should contain all required Fund-owned deal capital variables', () => {
      for (const fieldId of requiredFundFields) {
        const def = getRegistryField(fieldId);
        expect(def).toBeDefined();
        expect(def?.group).toBe('deal_capital');
      }
    });

    it('should verify A->U dual-slot mappings exist and are distinct for critical loan/closing fields', () => {
      const dualSlotFields = [
        'purchase_price',
        'loan_amount',
        'loan_interest_rate',
        'loan_term',
        'loanOriginationPoints',
        'closing_costs',
        'cash_to_close',
        'down_payment_pct',
      ];

      for (const fieldId of dualSlotFields) {
        const def = getRegistryField(fieldId);
        expect(def?.dualSlot).toBeDefined();
        expect(def?.dualSlot?.projectedField).toBeTruthy();
        expect(def?.dualSlot?.actualField).toBeTruthy();
        expect(def?.dualSlot?.projectedField).not.toBe(def?.dualSlot?.actualField);
      }
    });

    it('should verify that single-slot variables for Fund close events have correct paths', () => {
      const acquisitionDate = getRegistryField('acquisition_date');
      expect(acquisitionDate).toBeDefined();
      expect(acquisitionDate?.dualSlot).toBeUndefined();
      expect(acquisitionDate?.fieldPath).toBe('financials.acquisitionDate');

      const commissions = getRegistryField('commissions');
      expect(commissions).toBeDefined();
      expect(commissions?.dualSlot).toBeUndefined();
      expect(commissions?.fieldPath).toBe('financials.actualCommissions');
    });
  });
});
