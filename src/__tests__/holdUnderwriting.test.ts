jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import { computeNOIComponents, deriveAllMetrics } from '../lib/metrics/reiMetrics';
import { Project } from '../types/schema';

describe('Phase 3 Hold Underwriting, Metrics & Gating', () => {
  
  describe('Hold Phase Metrics Integration', () => {
    it('uses actualRentalIncome for Rental/BRRRR strategy in Phase 3', () => {
      const financials = {
        projectedRent: 2000,
        actualRentalIncome: 2400,
        holdingCostTaxes: 150,
        holdingCostInsurance: 50,
        costs: [],
      };

      // In Sourcing phase (Phase 1)
      const resPhase1 = computeNOIComponents(financials as any, 'Buy & Hold', 1);
      // grossRentalIncome = 2000 * 12 = 24000
      expect(resPhase1.grossRentalIncome).toBe(24000);

      // In Hold phase (Phase 3)
      const resPhase3 = computeNOIComponents(financials as any, 'Buy & Hold', 3);
      // grossRentalIncome = 2400 * 12 = 28800
      expect(resPhase3.grossRentalIncome).toBe(28800);
    });

    it('calculates occupancy rate using daysOccupied and totalHoldDays', () => {
      const financials = {
        daysOccupied: 15,
        totalHoldDays: 30,
        costs: [],
      };

      const res = deriveAllMetrics(financials as any, undefined, 'Buy & Hold', 3);
      // occupancyRate = (15 / 30) * 100 = 50%
      expect(res.occupancyRate).toBe(50);
    });

    it('correctly defaults occupancyRate to 100 when occupiedUnits is positive and daysOccupied/totalHoldDays are not set', () => {
      const financials = {
        occupiedUnits: 1,
        numberOfUnits: 1,
        vacancyRatePercent: 5,
        costs: [],
      };

      const res = deriveAllMetrics(financials as any, undefined, 'RENT', 3);
      // 100 - vacancyRatePercent = 95
      expect(res.occupancyRate).toBe(95);
    });
  });

  describe('Hold to Exit Gating Rules', () => {
    const checkHoldGating = (deal: Partial<Project>) => {
      const isFlip = deal.dispositionType === 'SALE';
      const isRental = deal.dispositionType === 'RENT' && deal.subStrategy !== 'BRRRR';
      const isBRRRR = deal.dispositionType === 'RENT' && deal.subStrategy === 'BRRRR';

      const missingHold: string[] = [];

      const hasRehabDone = deal.financials?.rehabDoneDate != null;
      const hasCurrentValue = (deal.financials?.estimatedCurrentValue || 0) > 0;
      const hasTenantPlaced = (deal.financials?.daysOccupied || 0) > 0 || (deal.financials?.occupiedUnits || 0) > 0;
      const hasOpex = (deal.financials?.holdingCostTaxes || 0) > 0 ||
                       (deal.financials?.holdingCostInsurance || 0) > 0 ||
                       (deal.financials?.holdingCostUtilities || 0) > 0 ||
                       (deal.financials?.propertyManagementFee || 0) > 0 ||
                       (deal.financials?.monthlyMaintenanceReserve || 0) > 0 ||
                       (deal.financials?.monthlyHOA || 0) > 0;

      if (isBRRRR) {
         if (!hasRehabDone) missingHold.push("Rehab Completion Date");
         if (!hasCurrentValue) missingHold.push("Current Estimated Value (> $0)");
         if (!hasTenantPlaced) missingHold.push("Tenant Placement (Days Occupied or Occupied Units > 0)");
         if (!hasOpex) missingHold.push("Captured Monthly Operating Expenses (at least one category > $0)");
      } else if (isFlip) {
         if (!hasRehabDone) missingHold.push("Rehab Completion Date");
         if (!hasCurrentValue) missingHold.push("Current Estimated Value (> $0)");
      } else if (isRental) {
         if (!hasTenantPlaced) missingHold.push("Tenant Placement (Days Occupied or Occupied Units > 0)");
         if (!hasOpex) missingHold.push("Captured Monthly Operating Expenses (at least one category > $0)");
      }

      return missingHold;
    };

    it('enforces rehab completion and estimated value for Flip strategy', () => {
      const flipDeal: Partial<Project> = {
        dispositionType: 'SALE',
        subStrategy: 'FLIP',
        currentPhase: 3,
        financials: {
          rehabDoneDate: null,
          estimatedCurrentValue: 0,
        } as any
      };

      const missing = checkHoldGating(flipDeal);
      expect(missing).toContain("Rehab Completion Date");
      expect(missing).toContain("Current Estimated Value (> $0)");
      expect(missing).not.toContain("Tenant Placement (Days Occupied or Occupied Units > 0)");

      // fulfill conditions
      flipDeal.financials!.rehabDoneDate = new Date();
      flipDeal.financials!.estimatedCurrentValue = 350000;
      const missingAfter = checkHoldGating(flipDeal);
      expect(missingAfter.length).toBe(0);
    });

    it('enforces tenant placement and opex for Rental strategy', () => {
      const rentalDeal: Partial<Project> = {
        dispositionType: 'RENT',
        subStrategy: 'LONG_TERM',
        currentPhase: 3,
        financials: {
          daysOccupied: 0,
          occupiedUnits: 0,
          holdingCostTaxes: 0,
          holdingCostInsurance: 0,
        } as any
      };

      const missing = checkHoldGating(rentalDeal);
      expect(missing).toContain("Tenant Placement (Days Occupied or Occupied Units > 0)");
      expect(missing).toContain("Captured Monthly Operating Expenses (at least one category > $0)");
      expect(missing).not.toContain("Rehab Completion Date");

      // fulfill conditions
      rentalDeal.financials!.daysOccupied = 30;
      rentalDeal.financials!.holdingCostInsurance = 100;
      const missingAfter = checkHoldGating(rentalDeal);
      expect(missingAfter.length).toBe(0);
    });

    it('enforces all conditions for BRRRR strategy', () => {
      const brrrrDeal: Partial<Project> = {
        dispositionType: 'RENT',
        subStrategy: 'BRRRR',
        currentPhase: 3,
        financials: {
          rehabDoneDate: null,
          estimatedCurrentValue: 0,
          daysOccupied: 0,
          occupiedUnits: 0,
          holdingCostTaxes: 0,
        } as any
      };

      const missing = checkHoldGating(brrrrDeal);
      expect(missing).toContain("Rehab Completion Date");
      expect(missing).toContain("Current Estimated Value (> $0)");
      expect(missing).toContain("Tenant Placement (Days Occupied or Occupied Units > 0)");
      expect(missing).toContain("Captured Monthly Operating Expenses (at least one category > $0)");

      // partially fulfill
      brrrrDeal.financials!.rehabDoneDate = new Date();
      brrrrDeal.financials!.estimatedCurrentValue = 200000;
      const missingPartial = checkHoldGating(brrrrDeal);
      expect(missingPartial).not.toContain("Rehab Completion Date");
      expect(missingPartial).not.toContain("Current Estimated Value (> $0)");
      expect(missingPartial).toContain("Tenant Placement (Days Occupied or Occupied Units > 0)");

      // fully fulfill
      brrrrDeal.financials!.daysOccupied = 15;
      brrrrDeal.financials!.holdingCostTaxes = 200;
      const missingAfter = checkHoldGating(brrrrDeal);
      expect(missingAfter.length).toBe(0);
    });
  });
});
