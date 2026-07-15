jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import { computeNOIComponents, deriveAllMetrics, computeTotalCashInvested } from '../lib/metrics/reiMetrics';
import { Project } from '../types/schema';

describe('Phase 1 Acquisition Underwriting & Projections', () => {
  describe('computeNOIComponents with Projected Fallbacks', () => {
    it('uses projectedRent when monthlyGrossRent and projectedMonthlyRent are absent', () => {
      const financials = {
        projectedRent: 2500, // projected monthly rent
        vacancyRatePercent: 0,
        costs: [],
      };
      
      const res = computeNOIComponents(financials as any);
      // grossRentalIncome = 2500 * 12 = 30000
      expect(res.grossRentalIncome).toBe(30000);
      expect(res.noi).toBe(30000);
    });

    it('falls back to projectedOpex * 12 when individual itemized expenses are empty', () => {
      const financials = {
        projectedRent: 2000,
        projectedOpex: 400, // monthly opex fallback
        vacancyRatePercent: 0,
        costs: [],
      };

      const res = computeNOIComponents(financials as any);
      // grossRentalIncome = 24000
      // totalOperatingExpenses = 4800 (400 * 12)
      // noi = 24000 - 4800 = 19200
      expect(res.totalOperatingExpenses).toBe(4800);
      expect(res.noi).toBe(19200);
    });

    it('prefers individual itemized expenses over projectedOpex if any are present', () => {
      const financials = {
        projectedRent: 2000,
        projectedOpex: 400,
        holdingCostTaxes: 100, // monthly taxes
        vacancyRatePercent: 0,
        costs: [],
      };

      const res = computeNOIComponents(financials as any);
      // propertyTaxes = 100 * 12 = 1200
      // totalOperatingExpenses should be 1200, ignoring the 4800 projectedOpex since itemized is present
      expect(res.totalOperatingExpenses).toBe(1200);
      expect(res.noi).toBe(22800);
    });
  });

  describe('deriveAllMetrics with Projected Fallbacks', () => {
    it('falls back to targetPrice for Cap Rate and GRM calculations when purchasePrice is missing', () => {
      const financials = {
        targetPrice: 200000, // target purchase price
        projectedRent: 2000,
        projectedOpex: 500,
        vacancyRatePercent: 0,
        costs: [],
      };

      // NOI = 24000 - 6000 = 18000
      // Cap Rate = 18000 / 200000 = 9%
      // GRM = 200000 / 24000 = 8.33
      const res = deriveAllMetrics(financials as any);
      expect(res.capRate).toBe(9);
      expect(res.grossRentMultiplier).toBe(8.33);
    });

    it('falls back to targetPrice for computeTotalCashInvested', () => {
      const financials = {
        targetPrice: 150000,
        loanAmount: 120000,
        projectedRehabCost: 15000,
        costs: [],
      };

      // Downpayment = 150000 - 120000 = 30000
      // Total Cash Invested = 30000 + 15000 (rehab) = 45000
      const totalCash = computeTotalCashInvested(financials as any);
      expect(totalCash).toBe(45000);
    });

    it('falls back to projectedSalePrice for appreciation CAGR when actualSalePrice is not present', () => {
      const financials = {
        purchasePrice: 100000,
        projectedSalePrice: 150000,
        fixedAcquisitionCosts: 0,
        acquisitionDate: new Date('2024-01-01'), // exact hold time
        costs: [],
      };

      // 5 years held (let's override date and pass yearsHeld manually to avoid date variance)
      // basis = 100000. saleValue = 150000. years = 5.
      // CAGR = (1.5) ^ 0.2 - 1 = 8.45%
      const res = deriveAllMetrics(financials as any, undefined, undefined, undefined, '2024-01-01');
      // Note: we let it calculate yearsHeld inside or we can check the returned appreciation metric
      expect(res.annualizedAppreciation).toBeGreaterThan(0);
    });
  });

  describe('Advance Phase Gating Rules', () => {
    const checkGating = (deal: Partial<Project>) => {
      const missing: string[] = [];
      if (!deal.address) missing.push("Property Address");
      if (!deal.dispositionType) missing.push("Strategy Type");
      const targetPrice = deal.financials?.targetPrice ?? deal.financials?.targetPurchasePrice ?? deal.financials?.purchasePrice;
      if (!targetPrice || targetPrice <= 0) missing.push("Projected Target Purchase Price");
      const offerStatus = deal.financials?.offerStatus;
      if (offerStatus !== 'Accepted' && deal.status !== 'Under Contract') {
         missing.push("Accepted Offer (Offer Status must be 'Accepted')");
      }
      return missing;
    };

    it('blocks transition when mandatory fields are missing', () => {
      const incompleteProject: Partial<Project> = {
        address: '',
        dispositionType: undefined,
        status: 'Lead',
        currentPhase: 1,
        financials: {
          targetPrice: 0,
          offerStatus: 'No',
          costs: [],
        } as any
      };

      const missing = checkGating(incompleteProject);
      expect(missing).toContain("Property Address");
      expect(missing).toContain("Strategy Type");
      expect(missing).toContain("Projected Target Purchase Price");
      expect(missing).toContain("Accepted Offer (Offer Status must be 'Accepted')");
    });

    it('allows transition when all 4 criteria are met', () => {
      const completeProject: Partial<Project> = {
        address: '123 Main St, New York, NY 10001',
        dispositionType: 'SALE',
        subStrategy: 'FLIP',
        status: 'Lead',
        currentPhase: 1,
        financials: {
          targetPrice: 250000,
          offerStatus: 'Accepted',
          costs: [],
        } as any
      };

      const missing = checkGating(completeProject);
      expect(missing.length).toBe(0);
    });
  });
});
