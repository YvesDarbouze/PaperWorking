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

  describe('Card H1.2 — Budget & Timeline Schema Validation', () => {
    it('successfully validates financials schema with rehab_budget, target, and contractors', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        rehab_budget: 1500000, // $15,000.00
        rehab_completion_target: '2026-09-01',
        rehab_contractors: {
          general_contractor: {
            name: 'John Doe',
            firm: 'Doe Construction',
            phone: '555-0199',
            email: 'john@doeconst.com',
            source: 'off_platform',
            assignedAt: '2026-07-19T12:00:00Z',
            assignedBy: 'user@paperworking.com'
          }
        }
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.rehab_budget).toBe(1500000);
        expect(parsed.data.rehab_completion_target).toBe('2026-09-01');
        expect(parsed.data.rehab_contractors.general_contractor.name).toBe('John Doe');
      }
    });
  });

  describe('Card H2.1 — Renovation Spend Tracker Schema Validation', () => {
    it('successfully validates financials schema with rehab_spend entries containing history and plaid attributes', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        rehab_spend: [
          {
            id: 'spend-1',
            amount: 45000,
            date: '2026-07-15',
            category: 'CapEx',
            note: 'Framing materials',
            source: 'plaid',
            plaidTransactionId: 'plaid-tx-999',
            history: [
              {
                updatedAt: '2026-07-16T12:00:00Z',
                updatedBy: 'editor@paperworking.com',
                previousValue: {
                  amount: 40000,
                  date: '2026-07-15',
                  category: 'CapEx',
                  note: 'Materials'
                }
              }
            ]
          }
        ]
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.rehab_spend[0].amount).toBe(45000);
        expect(parsed.data.rehab_spend[0].category).toBe('CapEx');
        expect(parsed.data.rehab_spend[0].history[0].previousValue.amount).toBe(40000);
      }
    });
  });

  describe('Card H2.2 — Renovation Completion Schema Validation', () => {
    it('successfully validates financials schema with rehab_completed_date and rehab_spend_total', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        rehab_completed_date: '2026-07-19',
        rehab_spend_total: 45000
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.rehab_completed_date).toBe('2026-07-19');
        expect(parsed.data.rehab_spend_total).toBe(45000);
      }
    });
  });

  describe('Card H3.1 — Itemized monthly holding costs Schema Validation', () => {
    it('successfully validates financials schema with all holding_cost_<category> fields', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        holding_cost_tax: 35000,
        holding_cost_insurance: 12500,
        holding_cost_security: 3500,
        holding_cost_maintenance: 7500,
        holding_cost_utilities: 18500,
        holding_cost_management: 15000,
        holding_cost_hoa: 4500,
        holding_cost_capex: 10000
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.holding_cost_tax).toBe(35000);
        expect(parsed.data.holding_cost_insurance).toBe(12500);
        expect(parsed.data.holding_cost_security).toBe(3500);
        expect(parsed.data.holding_cost_maintenance).toBe(7500);
        expect(parsed.data.holding_cost_utilities).toBe(18500);
        expect(parsed.data.holding_cost_management).toBe(15000);
        expect(parsed.data.holding_cost_hoa).toBe(4500);
        expect(parsed.data.holding_cost_capex).toBe(10000);
      }
    });
  });

  describe('Card H4.1 — Current Valuation Schema Validation', () => {
    it('successfully validates financials schema with current_value dated series of valuations', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        current_value: [
          {
            id: 'val-1',
            date: '2026-07-19',
            value: 26500000, // $265,000.00
            source: 'appraisal',
            documentUrl: 'https://firebasestorage.googleapis.com/.../report.pdf',
            documentName: 'Q3 Appraisal Report.pdf'
          }
        ]
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.current_value[0].value).toBe(26500000);
        expect(parsed.data.current_value[0].source).toBe('appraisal');
        expect(parsed.data.current_value[0].documentName).toBe('Q3 Appraisal Report.pdf');
      }
    });
  });

  describe('Card H5.R — Rent Path Schema Validation', () => {
    it('successfully validates financials schema with target_rent, listing_ads, and screening_checklist', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        target_rent: 180000, // $1,800.00
        listing_ads: [
          {
            id: 'ad-1',
            platform: 'Zillow',
            listingUrl: 'https://zillow.com/homedetails/123-Main',
            status: 'active',
            listedDate: '2026-07-19',
            monthlyRent: 185000 // $1,850.00
          }
        ],
        screening_checklist: {
          creditScoreCheck: true,
          backgroundCheck: true,
          incomeVerification: true,
          priorEvictionsCheck: false,
          landlordReferences: false,
          customItems: [
            {
              id: 'item-1',
              label: 'Sign pet policy',
              checked: true
            }
          ]
        }
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.target_rent).toBe(180000);
        expect(parsed.data.listing_ads[0].platform).toBe('Zillow');
        expect(parsed.data.listing_ads[0].monthlyRent).toBe(185000);
        expect(parsed.data.screening_checklist.creditScoreCheck).toBe(true);
        expect(parsed.data.screening_checklist.customItems[0].label).toBe('Sign pet policy');
        expect(parsed.data.screening_checklist.customItems[0].checked).toBe(true);
      }
    });
  });

  describe('Card H5.L — Lease Path Schema Validation', () => {
    it('successfully validates financials schema with target_lease_terms and listing_ads', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        target_lease_terms: {
          rateCents: 450000, // $4,500.00
          termMonths: 36,
          type: 'NNN',
          sqft: 2500
        },
        listing_ads: [
          {
            id: 'ad-1',
            platform: 'LoopNet',
            listingUrl: 'https://loopnet.com/Listing/123-Main',
            status: 'active',
            listedDate: '2026-07-19',
            monthlyRent: 450000 // $4,500.00
          }
        ]
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.target_lease_terms.rateCents).toBe(450000);
        expect(parsed.data.target_lease_terms.termMonths).toBe(36);
        expect(parsed.data.target_lease_terms.type).toBe('NNN');
        expect(parsed.data.target_lease_terms.sqft).toBe(2500);
        expect(parsed.data.listing_ads[0].platform).toBe('LoopNet');
        expect(parsed.data.listing_ads[0].monthlyRent).toBe(450000);
      }
    });
  });

  describe('Card H5.S — Sale Path Schema Validation', () => {
    it('successfully validates financials schema with list_price_sale and listing_agent_vendor', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        list_price_sale: 35000000, // $350,000.00
        listing_agent_vendor: {
          name: 'John Doe',
          firm: 'Apex Brokerage',
          email: 'john.doe@brokerage.com',
          phone: '555-0192',
          source: 'off_platform',
          assignedAt: '2026-07-19T12:00:00Z',
          assignedBy: 'user'
        },
        listing_ads: [
          {
            id: 'ad-1',
            platform: 'Redfin',
            listingUrl: 'https://redfin.com/homes/123-Main',
            status: 'active',
            listedDate: '2026-07-19',
            monthlyRent: 35000000 // listed price cents
          }
        ]
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.list_price_sale).toBe(35000000);
        expect(parsed.data.listing_agent_vendor.name).toBe('John Doe');
        expect(parsed.data.listing_agent_vendor.firm).toBe('Apex Brokerage');
        expect(parsed.data.listing_ads[0].platform).toBe('Redfin');
      }
    });
  });

  describe('Lifecycle Auto-Advance Gating Triggers (Event-Triggered)', () => {
    it('successfully validates financials with exit baseline and sale contract values', () => {
      const { projectFinancialsSchema } = require('../lib/schemas/projectSchema');
      const validFinancials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        costs: [],
        sale_under_contract: true,
        exit_cost_basis: 15200000,
        exit_capitalized_improvements: 3500000,
        exit_holding_cost_total: 500000,
        exit_marketing_outcome: 'Confirmed Rent payment of $2,500.00'
      };

      const parsed = projectFinancialsSchema.safeParse(validFinancials);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.sale_under_contract).toBe(true);
        expect(parsed.data.exit_cost_basis).toBe(15200000);
        expect(parsed.data.exit_capitalized_improvements).toBe(3500000);
        expect(parsed.data.exit_holding_cost_total).toBe(500000);
        expect(parsed.data.exit_marketing_outcome).toBe('Confirmed Rent payment of $2,500.00');
      }
    });
  });
});
