jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import { calculateProjectTaxReport } from '../lib/utils/taxService';
import { deriveAllMetrics } from '../lib/metrics/reiMetrics';
import { computeAutopsyMetrics } from '../lib/math/calculatorUtils';
import { Project } from '../types/schema';

describe('Phase 4 Exit Underwriting, Metrics & Gating', () => {
  
  describe('Exit Realized vs Projected Metrics Guardrails', () => {
    it('only marks appreciation as realized when actualSalePrice and soldDate are defined', () => {
      const financials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        actualSalePrice: 260000,
        soldDate: new Date('2026-05-20'),
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any, undefined, 'Fix & Flip', 4);
      expect(metrics.isAppreciationRealized).toBe(true);

      const deal: Partial<Project> = {
        financials: financials as any
      };
      const autopsy = computeAutopsyMetrics(deal as any);
      expect(autopsy.grossSalePrice).toBe(260000);
    });

    it('does not mark appreciation as realized if soldDate or actualSalePrice is missing', () => {
      const financials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        actualSalePrice: undefined,
        soldDate: undefined,
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any, undefined, 'Fix & Flip', 4);
      expect(metrics.isAppreciationRealized).toBe(false);

      const deal: Partial<Project> = {
        financials: financials as any
      };
      const autopsy = computeAutopsyMetrics(deal as any);
      expect(autopsy.grossSalePrice).toBe(250000); // Falls back to estimatedARV
    });
  });

  describe('Tax Service Realized Gain/Loss with sellingCosts override', () => {
    it('calculates realized gain correctly using explicit sellingCosts override', () => {
      const deal: Project = {
        id: 'project-exit-1',
        organizationId: 'org-1',
        propertyName: 'Exit House',
        address: '123 Exit Lane',
        status: 'exit',
        currentPhase: 4,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2026-05-22'),
        ownerUid: 'user-1',
        members: {},
        financials: {
          purchasePrice: 150000,
          estimatedARV: 150000,
          acquisitionDate: new Date('2025-01-10'),
          soldDate: new Date('2025-06-15'),
          actualSalePrice: 220000,
          sellingCosts: 15000, // explicit override
          costs: [
            {
              id: 'c1',
              description: 'HVAC Rehab',
              amount: 10000,
              approved: true,
              addedBy: 'user-1',
              createdAt: new Date('2025-02-15')
            }
          ]
        }
      };

      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');

      const report = calculateProjectTaxReport(deal, start, end);
      expect(report.isSoldInPeriod).toBe(true);
      expect(report.sellingCosts).toBe(15000);
      // realizedGainLoss = saleProceeds (220000) - acquisitionBasis (150000) - lifetimeCapitalizedRehab (10000) - sellingCosts (15000) = 45000
      expect(report.realizedGainLoss).toBe(45000);
    });

    it('falls back to default calculated sellingCosts if no override is provided', () => {
      const deal: Project = {
        id: 'project-exit-2',
        organizationId: 'org-1',
        propertyName: 'Exit House 2',
        address: '456 Exit Lane',
        status: 'exit',
        currentPhase: 4,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2026-05-22'),
        ownerUid: 'user-1',
        members: {},
        financials: {
          purchasePrice: 150000,
          estimatedARV: 150000,
          acquisitionDate: new Date('2025-01-10'),
          soldDate: new Date('2025-06-15'),
          actualSalePrice: 220000,
          finalClosingCosts: 5000,
          buyersAgentCommission: 3, // 3% of 220,000 = 6600
          sellersAgentCommission: 3, // 3% of 220,000 = 6600
          stagingCosts: 1000,
          photographyAndMedia: 500,
          mlsListingFees: 300,
          costs: []
        }
      };

      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');

      const report = calculateProjectTaxReport(deal, start, end);
      // calculated sellingCosts = 5000 + 6600 + 6600 + 1000 + 500 + 300 = 20000
      expect(report.sellingCosts).toBe(20000);
      // realizedGainLoss = 220000 - 150000 - 0 - 20000 = 50000
      expect(report.realizedGainLoss).toBe(50000);
    });
  });

  describe('Exit to Hold Gating/Reversion Simulation', () => {
    it('properly validates exit pathway inputs before closing/reverting', () => {
      const validateSaleExit = (f: any) => {
        const errors: string[] = [];
        if (!f.actualSalePrice || f.actualSalePrice <= 0) errors.push("Sale Price is required");
        if (!f.sellingCosts || f.sellingCosts < 0) errors.push("Selling costs is required");
        if (!f.soldDate) errors.push("Sold date is required");
        return errors;
      };

      const validateRefiExit = (f: any) => {
        const errors: string[] = [];
        if (!f.refiLoanAmount || f.refiLoanAmount <= 0) errors.push("Refi loan amount is required");
        if (f.refiInterestRate === undefined || f.refiInterestRate < 0) errors.push("Refi interest rate is required");
        if (!f.refiLoanTermYears) errors.push("Refi term is required");
        if (!f.refiDate) errors.push("Refi date is required");
        return errors;
      };

      const validSale = {
        actualSalePrice: 250000,
        sellingCosts: 12000,
        soldDate: '2026-05-22',
      };
      const invalidSale = {
        actualSalePrice: 0,
        sellingCosts: -5,
        soldDate: '',
      };

      expect(validateSaleExit(validSale).length).toBe(0);
      expect(validateSaleExit(invalidSale)).toContain("Sale Price is required");

      const validRefi = {
        refiLoanAmount: 180000,
        refiInterestRate: 6.2,
        refiLoanTermYears: 30,
        refiDate: '2026-05-22',
      };
      const invalidRefi = {
        refiLoanAmount: 0,
        refiInterestRate: undefined,
        refiLoanTermYears: null,
        refiDate: '',
      };

      expect(validateRefiExit(validRefi).length).toBe(0);
      expect(validateRefiExit(invalidRefi)).toContain("Refi loan amount is required");
    });
  });
});
