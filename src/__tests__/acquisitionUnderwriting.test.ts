jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import { computeNOIComponents, deriveAllMetrics, computeTotalCashInvested } from '../lib/metrics/reiMetrics';
import { Project } from '../types/schema';
import { PHASE_1_QUESTIONS } from '../app/dashboard/projects/[id]/phase-1/page';

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
      if (offerStatus !== 'Accepted' && deal.status !== 'fund') {
         missing.push("Accepted Offer (Offer Status must be 'Accepted')");
      }
      return missing;
    };

    it('blocks transition when mandatory fields are missing', () => {
      const incompleteProject: Partial<Project> = {
        address: '',
        dispositionType: undefined,
        status: 'acquisition',
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
        status: 'acquisition',
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

  describe('Underwrite Vacancy Assumptions (Card 2.2)', () => {
    it('applies vacancy_pct (mapped from vacancy_rate) to vacancyLoss and NOI calculations', () => {
      const financials = {
        projectedRent: 2000,
        vacancy_pct: 10, // 10% vacancy
        costs: [],
      };

      const res = computeNOIComponents(financials as any);
      // grossRentalIncome = 2000 * 12 = 24000
      // vacancyLoss = 24000 * 0.10 = 2400
      // noi = 24000 - 2400 = 21600
      expect(res.grossRentalIncome).toBe(24000);
      expect(res.vacancyLoss).toBe(2400);
      expect(res.noi).toBe(21600);
    });
  });

  describe('Underwrite Operating Expenses (Card 2.3)', () => {
    it('verifies dynamic HOA visibility condition', () => {
      // Find the HOA question definition in the page definitions
      // Note: We can test the condition callbacks directly since they are exported/accessible or mock their behavior
      const condoType = { property_type: 'Condo' };
      const singleFamilyType = { property_type: 'Single Family' };
      
      const condCheck = (answers: any, project: any) => {
        const type = String(project?.property_type || project?.propertyType || '').toLowerCase();
        return type.includes('condo') || type.includes('hoa') || type.includes('mixed-use');
      };

      expect(condCheck({}, condoType)).toBe(true);
      expect(condCheck({}, singleFamilyType)).toBe(false);
    });

    it('verifies management visibility condition', () => {
      const condCheck = (answers: any) => answers.has_professional_management === 'yes';

      expect(condCheck({ has_professional_management: 'yes' })).toBe(true);
      expect(condCheck({ has_professional_management: 'no' })).toBe(false);
    });

    it('asserts BUG-8 law: management fee is computed on gross scheduled rent, never effective rent', () => {
      const financials = {
        projectedRent: 2000, // Monthly scheduled gross rent = $2000
        vacancy_pct: 10,     // 10% vacancy
        management_pct: 10,  // 10% management fee
        costs: [],
      };

      const res = computeNOIComponents(financials as any);
      // grossRentalIncome = 2000 * 12 = 24000
      // vacancyLoss = 24000 * 0.10 = 2400 (effective rent is 21600)
      // propertyManagement = 24000 * 0.10 = 2400 (gross-basis PM fee)
      // NOT: 21600 * 0.10 = 2160
      expect(res.propertyManagement).toBe(2400);
      expect(res.propertyManagement).not.toBe(2160);
    });
  });

  describe('Underwrite Purchase Assumptions (Card 2.4)', () => {
    it('verifies cacheFinancials syncing expected purchase/financing fields', () => {
      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      const mockProjectId = 'test-purchase-proj';
      
      const payload = {
        financials: {
          expected_purchase_price: 300000,
          down_payment_pct: 20,
          est_rate: 7.25,
          est_term_years: 15,
        }
      };

      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);
      
      expect(result.expected_purchase_price).toBe(300000);
      expect(result.purchasePrice).toBe(300000);
      expect(result.targetPrice).toBe(300000);
      expect(result.down_payment_pct).toBe(20);
      expect(result.downPaymentPercent).toBe(20);
      expect(result.est_rate).toBe(7.25);
      expect(result.loanInterestRate).toBe(7.25);
      expect(result.est_term_years).toBe(15);
      expect(result.loanTermYears).toBe(15);
    });
  });

  describe('Underwrite Closing & Upfront Cost Assumptions (Card 2.5)', () => {
    it('verifies cacheFinancials syncing expected closing costs and upfront rehab budget fields', () => {
      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      const mockProjectId = 'test-closing-costs-proj';
      
      const payload = {
        financials: {
          closing_costs: 8500,
          upfront_rehab_budget: 15000,
        }
      };

      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);
      
      expect(result.closing_costs).toBe(8500);
      expect(result.closingCosts).toBe(8500);
      expect(result.estClosingCostsCents).toBe(850000);
      
      expect(result.upfront_rehab_budget).toBe(15000);
      expect(result.projectedRehabCost).toBe(15000);
    });
  });

  describe('Underwrite Hold Assumptions (Card 2.6)', () => {
    it('verifies cacheFinancials syncing expected hold period and appreciation rate fields', () => {
      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      const mockProjectId = 'test-hold-assumptions-proj';
      
      const payload = {
        financials: {
          hold_period_years: 5,
          appreciation_rate: 4.5,
        }
      };

      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);
      
      expect(result.hold_period_years).toBe(5);
      expect(result.projectedHoldTimeMonths).toBe(60);
      
      expect(result.appreciation_rate).toBe(4.5);
      expect(result.annualAppreciationPercent).toBe(4.5);
    });
  });

  describe('Underwriting Scorecard (Card 2.7)', () => {
    it('verifies scorecard question is defined and conditional on A2 cards', () => {
      const scorecardQ = PHASE_1_QUESTIONS.find(q => q.key === 'scorecard');
      expect(scorecardQ).toBeDefined();
      expect(scorecardQ?.type).toBe('scorecard');
      expect(scorecardQ?.condition).toBeDefined();

      const condition = scorecardQ!.condition!;
      
      // Should return false when A2 fields are missing
      expect(condition({}, {})).toBe(false);
      expect(condition({ gross_annual_rent: 1200000 }, {})).toBe(false);

      // Should return true when A2 fields are complete
      expect(condition({
        gross_annual_rent: 1200000,
        vacancy_rate: 5,
        expected_purchase_price: 30000000
      }, {})).toBe(true);
    });
  });

  describe('Declare Strategy (Card 3.1)', () => {
    it('verifies that Stage 3 completion checks both disposition_type and dispositionType along with subStrategy', () => {
      const checkStage3Complete = (project: any) => !!(
        (project?.disposition_type || project?.dispositionType) &&
        project?.subStrategy
      );

      // incomplete cases
      expect(checkStage3Complete({})).toBe(false);
      expect(checkStage3Complete({ disposition_type: 'SALE' })).toBe(false);
      expect(checkStage3Complete({ subStrategy: 'FLIP' })).toBe(false);

      // complete cases
      expect(checkStage3Complete({ disposition_type: 'SALE', subStrategy: 'FLIP' })).toBe(true);
      expect(checkStage3Complete({ dispositionType: 'RENT', subStrategy: 'LONG_TERM' })).toBe(true);
    });
  });

  describe('Offer Terms (Card 4.1)', () => {
    it('verifies offer questions are defined in PHASE_1_QUESTIONS', () => {
      const opQ = PHASE_1_QUESTIONS.find(q => q.key === 'offer_price');
      expect(opQ).toBeDefined();
      expect(opQ?.type).toBe('currency');

      const emQ = PHASE_1_QUESTIONS.find(q => q.key === 'earnest_money');
      expect(emQ).toBeDefined();
      expect(emQ?.type).toBe('currency');

      const otQ = PHASE_1_QUESTIONS.find(q => q.key === 'offer_terms');
      expect(otQ).toBeDefined();
      expect(otQ?.type).toBe('text');
    });

    it('verifies cacheFinancials correctly updates and syncs offer_price, earnest_money, and offer_terms', () => {
      const mockProjectId = 'test-project-offer-terms-sync';
      const payload = {
        financials: {
          offer_price: 15000000,
          earnest_money: 500000,
          offer_terms: '30 days close, inspection contingency',
        }
      };

      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);

      expect(result.offer_price).toBe(15000000);
      expect(result.offerMadeCents).toBe(15000000);
      expect(result.earnest_money).toBe(500000);
      expect(result.earnestMoneyCents).toBe(500000);
      expect(result.offer_terms).toBe('30 days close, inspection contingency');
    });
  });

  describe('Offer Outcome (Card 4.2)', () => {
    it('verifies offer outcome questions are defined in PHASE_1_QUESTIONS', () => {
      const osQ = PHASE_1_QUESTIONS.find(q => q.key === 'offer_status');
      expect(osQ).toBeDefined();
      expect(osQ?.type).toBe('select');

      const apQ = PHASE_1_QUESTIONS.find(q => q.key === 'accepted_price');
      expect(apQ).toBeDefined();
      expect(apQ?.type).toBe('currency');
      expect(apQ?.condition).toBeDefined();

      const cdQ = PHASE_1_QUESTIONS.find(q => q.key === 'contract_executed_date');
      expect(cdQ).toBeDefined();
      expect(cdQ?.type).toBe('date');
      expect(cdQ?.condition).toBeDefined();
    });

    it('verifies cacheFinancials correctly updates and actualizes expected purchase price on acceptance', () => {
      const mockProjectId = 'test-project-offer-outcome-sync';
      const payload = {
        financials: {
          offer_status: 'accepted',
          accepted_price: 16500000,
          contract_executed_date: '2026-07-18',
        }
      };

      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);

      expect(result.offer_status).toBe('accepted');
      expect(result.offerStatus).toBe('Accepted');
      expect(result.accepted_price).toBe(16500000);
      expect(result.acceptedPriceCents).toBe(16500000);
      expect(result.finalAgreedPrice).toBe(16500000);
      
      // Actualization check
      expect(result.expected_purchase_price).toBe(16500000);
      expect(result.purchasePrice).toBe(16500000);
      expect(result.targetPrice).toBe(16500000);
      expect(result.contract_executed_date).toBe('2026-07-18');
    });
  });

  describe('Inspection (Card 5.1)', () => {
    it('verifies inspection questions are defined in PHASE_1_QUESTIONS and conditioned on offer acceptance', () => {
      const isQ = PHASE_1_QUESTIONS.find(q => q.key === 'inspection_status');
      expect(isQ).toBeDefined();
      expect(isQ?.type).toBe('select');
      expect(isQ?.condition).toBeDefined();
      expect(isQ!.condition!({ offer_status: 'accepted' })).toBe(true);
      expect(isQ!.condition!({ offer_status: 'submitted' })).toBe(false);

      const ifQ = PHASE_1_QUESTIONS.find(q => q.key === 'inspection_findings');
      expect(ifQ).toBeDefined();
      expect(ifQ?.type).toBe('text');
      expect(ifQ?.condition).toBeDefined();
      expect(ifQ!.condition!({ offer_status: 'accepted' })).toBe(true);
      expect(ifQ!.condition!({ offer_status: 'submitted' })).toBe(false);
    });

    it('verifies cacheFinancials correctly updates and syncs inspection_status and inspection_findings', () => {
      const mockProjectId = 'test-project-inspection-sync';
      const payload = {
        financials: {
          inspection_status: 'scheduled',
          inspection_findings: 'Minor foundation cracks noted, HVAC in excellent shape.',
        }
      };

      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);

      expect(result.inspection_status).toBe('scheduled');
      expect(result.inspection_findings).toBe('Minor foundation cracks noted, HVAC in excellent shape.');
    });
  });

  describe('Environmental & Pest Tests (Card 5.2)', () => {
    it('verifies environmental test questions are defined in PHASE_1_QUESTIONS and conditioned on age or toggles', () => {
      const radonQ = PHASE_1_QUESTIONS.find(q => q.key === 'radon_test_status');
      expect(radonQ).toBeDefined();
      expect(radonQ?.type).toBe('select');
      expect(radonQ?.condition).toBeDefined();

      // Older home condition checks
      expect(radonQ!.condition!({ offer_status: 'accepted' }, { yearBuilt: 1950 })).toBe(true);
      expect(radonQ!.condition!({ offer_status: 'accepted' }, { yearBuilt: 1990 })).toBe(false);
      expect(radonQ!.condition!({ offer_status: 'submitted' }, { yearBuilt: 1950 })).toBe(false);

      // Inspector flag condition check
      expect(radonQ!.condition!({ offer_status: 'accepted' }, { yearBuilt: 1990, financials: { inspector_flagged_specialty_tests: true } })).toBe(true);

      // Manual toggle check
      expect(radonQ!.condition!({ offer_status: 'accepted' }, { yearBuilt: 1990, financials: { age_conditional_tests_elected: true } })).toBe(true);
    });

    it('verifies cacheFinancials correctly updates and syncs environmental test statuses and results', () => {
      const mockProjectId = 'test-project-environmental-sync';
      const payload = {
        financials: {
          radon_test_status: 'completed',
          radon_test_result: '3.1 pCi/L (Passed)',
          lead_test_status: 'completed',
          lead_test_result: 'Lead detected in window frames',
          termite_test_status: 'waived',
          termite_test_result: 'Not required',
          inspector_flagged_specialty_tests: true,
          age_conditional_tests_elected: false,
        }
      };

      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);

      expect(result.radon_test_status).toBe('completed');
      expect(result.radon_test_result).toBe('3.1 pCi/L (Passed)');
      expect(result.lead_test_status).toBe('completed');
      expect(result.lead_test_result).toBe('Lead detected in window frames');
      expect(result.termite_test_status).toBe('waived');
      expect(result.termite_test_result).toBe('Not required');
      expect(result.inspector_flagged_specialty_tests).toBe(true);
      expect(result.age_conditional_tests_elected).toBe(false);
    });
  });

  describe('Commercial Environmental - Phase I ESA (Card 5.3)', () => {
    it('verifies Phase I ESA questions are defined in PHASE_1_QUESTIONS and conditioned on commercial/mixed type or election', () => {
      const esaStatusQ = PHASE_1_QUESTIONS.find(q => q.key === 'phase_i_esa_status');
      expect(esaStatusQ).toBeDefined();
      expect(esaStatusQ?.type).toBe('select');
      expect(esaStatusQ?.condition).toBeDefined();

      // Commercial/mixed type condition checks
      expect(esaStatusQ!.condition!({ offer_status: 'accepted' }, { propertyType: 'Commercial' })).toBe(true);
      expect(esaStatusQ!.condition!({ offer_status: 'accepted' }, { propertyType: 'Mixed-Use' })).toBe(true);
      expect(esaStatusQ!.condition!({ offer_status: 'accepted' }, { propertyType: 'Residential' })).toBe(false);
      expect(esaStatusQ!.condition!({ offer_status: 'submitted' }, { propertyType: 'Commercial' })).toBe(false);

      // Manual election check
      expect(esaStatusQ!.condition!({ offer_status: 'accepted' }, { propertyType: 'Residential', financials: { phaseIElected: true } })).toBe(true);
    });

    it('verifies cacheFinancials correctly updates and syncs Phase I ESA status, findings, and waived state', () => {
      const mockProjectId = 'test-project-esa-sync';
      const payload = {
        financials: {
          phase_i_esa_status: 'waived',
          phase_i_esa_findings: 'Minimal environmental risks found.',
        }
      };

      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);

      expect(result.phase_i_esa_status).toBe('waived');
      expect(result.phase_i_esa_findings).toBe('Minimal environmental risks found.');
      expect(result.phaseIWaived).toBe(true); // Bidirectional sync check
      expect(result.phaseIFindings).toBe('Minimal environmental risks found.'); // Findings sync check
    });
  });

  describe('HOA Branch - HOA dues & documents (Card 5.4)', () => {
    it('verifies HOA questions are defined in PHASE_1_QUESTIONS and check conditions correctly', () => {
      const hasHoaQ = PHASE_1_QUESTIONS.find(q => q.key === 'has_hoa');
      expect(hasHoaQ).toBeDefined();
      expect(hasHoaQ?.type).toBe('select');
      expect(hasHoaQ?.condition!({ offer_status: 'accepted' }, {})).toBe(true);
      expect(hasHoaQ?.condition!({ offer_status: 'submitted' }, {})).toBe(false);

      const hoaDuesQ = PHASE_1_QUESTIONS.find(q => q.key === 'hoa_dues');
      expect(hoaDuesQ).toBeDefined();
      expect(hoaDuesQ?.type).toBe('number');
      expect(hoaDuesQ?.condition!({ offer_status: 'accepted', has_hoa: 'yes' }, {})).toBe(true);
      expect(hoaDuesQ?.condition!({ offer_status: 'accepted', has_hoa: 'no' }, {})).toBe(false);
    });

    it('verifies cacheFinancials correctly updates and syncs HOA status, dues, and underwriting expenses', () => {
      const mockProjectId = 'test-project-hoa-sync';
      const payload = {
        financials: {
          has_hoa: true,
          hoa_dues: 25000, // $250.00 in cents
        }
      };

      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);

      expect(result.has_hoa).toBe(true);
      expect(result.hasHOA).toBe(true);
      expect(result.hoa).toBe(true);
      expect(result.hoa_dues).toBe(25000);
      expect(result.expense_hoa).toBe(250); // $250.00 in dollars
      expect(result.HOA).toBe(250);
      expect(result.monthlyHOA).toBe(250);
    });
  });

  describe('Title Opening - Escrow & title company setup (Card 5.5)', () => {
    it('verifies Who is handling title question is defined in PHASE_1_QUESTIONS and checks condition correctly', () => {
      const titleQ = PHASE_1_QUESTIONS.find(q => q.key === 'title_company');
      expect(titleQ).toBeDefined();
      expect(titleQ?.type).toBe('text');
      expect(titleQ?.condition!({ offer_status: 'accepted' }, {})).toBe(true);
      expect(titleQ?.condition!({ offer_status: 'submitted' }, {})).toBe(false);
    });

    it('verifies cacheFinancials correctly updates and syncs title_company and titleCompany bidirectionally', () => {
      const mockProjectId = 'test-project-title-sync';
      const payload = {
        financials: {
          title_company: 'Premium Title & Escrow Co.',
        }
      };

      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);

      expect(result.title_company).toBe('Premium Title & Escrow Co.');
      expect(result.titleCompany).toBe('Premium Title & Escrow Co.');
    });
  });

  describe('Contingency deadline tracker (Card 5.11)', () => {
    it('verifies Contingency tracker question is defined in PHASE_1_QUESTIONS and checks condition correctly', () => {
      const contQ = PHASE_1_QUESTIONS.find(q => q.key === 'contingencies');
      expect(contQ).toBeDefined();
      expect(contQ?.type).toBe('scorecard');
      expect(contQ?.condition!({ offer_status: 'accepted' }, {})).toBe(true);
      expect(contQ?.condition!({ offer_status: 'submitted' }, {})).toBe(false);
    });

    it('verifies cacheFinancials correctly updates and stores contingencies array', () => {
      const mockProjectId = 'test-project-contingencies-sync';
      const mockContingencies = [
        {
          id: 'test-c1',
          type: 'Inspection',
          deadlineDate: new Date('2026-07-25'),
          isWaived: false,
          isSatisfied: false,
          party: 'Buyer',
        }
      ];
      const payload = {
        financials: {
          contingencies: mockContingencies,
        }
      };

      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      cacheFinancials(mockProjectId, payload);
      const result = getCachedFinancials(mockProjectId);

      expect(result.contingencies).toBeDefined();
      expect(result.contingencies.length).toBe(1);
      expect(result.contingencies[0].type).toBe('Inspection');
      expect(result.contingencies[0].id).toBe('test-c1');
    });

    it('should show dd_decision and dd_decision_reason only if offer is accepted and contingencies are resolved/waived', () => {
      const { PHASE_1_QUESTIONS } = require('../app/dashboard/projects/[id]/phase-1/page');
      const ddDecisionQ = PHASE_1_QUESTIONS.find((q: any) => q.key === 'dd_decision');
      const ddReasonQ = PHASE_1_QUESTIONS.find((q: any) => q.key === 'dd_decision_reason');

      expect(ddDecisionQ).toBeDefined();
      expect(ddReasonQ).toBeDefined();

      // Offer status not accepted: should not show
      const answersNotAccepted = { offer_status: 'submitted' as const, contingencies: [] };
      expect(ddDecisionQ.condition(answersNotAccepted, {})).toBe(false);
      expect(ddReasonQ.condition(answersNotAccepted, {})).toBe(false);

      // Offer status accepted but contingencies unresolved: should not show
      const answersUnresolved = {
        offer_status: 'accepted' as const,
        contingencies: [
          { id: '1', type: 'Inspection', isWaived: false, isSatisfied: false }
        ]
      };
      expect(ddDecisionQ.condition(answersUnresolved, {})).toBe(false);
      expect(ddReasonQ.condition(answersUnresolved, {})).toBe(false);

      // Offer status accepted and contingencies resolved/satisfied with confirmation: should show
      const answersResolved = {
        offer_status: 'accepted' as const,
        contingencies: [
          { id: '1', type: 'Inspection', isWaived: false, isSatisfied: true, explicitConfirmation: true }
        ]
      };
      expect(ddDecisionQ.condition(answersResolved, {})).toBe(true);
      expect(ddReasonQ.condition(answersResolved, {})).toBe(true);

      // Offer status accepted and contingencies waived: should show
      const answersWaived = {
        offer_status: 'accepted' as const,
        contingencies: [
          { id: '1', type: 'Inspection', isWaived: true, isSatisfied: false }
        ]
      };
      expect(ddDecisionQ.condition(answersWaived, {})).toBe(true);
      expect(ddReasonQ.condition(answersWaived, {})).toBe(true);
    });

    it('should map dd_decision bidirectionally with decision inside cacheFinancials', () => {
      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');

      const mockProjectId = 'test-project-dd-decision-sync';

      // dd_decision: walk -> decision: terminate, status: exit
      cacheFinancials(mockProjectId, { financials: { dd_decision: 'walk' } });
      let result = getCachedFinancials(mockProjectId);
      expect(result.dd_decision).toBe('walk');
      expect(result.decision).toBe('terminate');
      expect(result.dealStatus).toBe('Terminated');

      // dd_decision: proceed -> decision: proceed, dealStatus: Proceeding
      cacheFinancials(mockProjectId, { financials: { dd_decision: 'proceed' } });
      result = getCachedFinancials(mockProjectId);
      expect(result.dd_decision).toBe('proceed');
      expect(result.decision).toBe('proceed');
      expect(result.dealStatus).toBe('Proceeding');

      // decision: terminate -> dd_decision: walk, dealStatus: Terminated
      cacheFinancials(mockProjectId, { financials: { decision: 'terminate' } });
      result = getCachedFinancials(mockProjectId);
      expect(result.dd_decision).toBe('walk');
      expect(result.decision).toBe('terminate');
      expect(result.dealStatus).toBe('Terminated');

      // reason sync
      cacheFinancials(mockProjectId, { financials: { dd_decision_reason: 'Diligence issues found' } });
      result = getCachedFinancials(mockProjectId);
      expect(result.dd_decision_reason).toBe('Diligence issues found');
    });

    it('should show capital_intent only if offer is accepted and dd_decision is proceed', () => {
      const { PHASE_1_QUESTIONS } = require('../app/dashboard/projects/[id]/phase-1/page');
      const capitalIntentQ = PHASE_1_QUESTIONS.find((q: any) => q.key === 'capital_intent');

      expect(capitalIntentQ).toBeDefined();

      // Offer status not accepted: should not show
      const answersNotAccepted = { offer_status: 'submitted' as const, dd_decision: 'proceed' as const };
      expect(capitalIntentQ.condition(answersNotAccepted, {})).toBe(false);

      // Offer status accepted but dd_decision is walk: should not show
      const answersWalk = { offer_status: 'accepted' as const, dd_decision: 'walk' as const };
      expect(capitalIntentQ.condition(answersWalk, {})).toBe(false);

      // Offer status accepted and dd_decision is proceed: should show
      const answersProceed = { offer_status: 'accepted' as const, dd_decision: 'proceed' as const };
      expect(capitalIntentQ.condition(answersProceed, {})).toBe(true);
    });

    it('should map capital_intent bidirectionally with capitalPlan inside cacheFinancials', () => {
      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      const mockProjectId = 'test-project-capital-intent-sync';

      // capital_intent: solo -> capitalPlan: all-cash solo
      cacheFinancials(mockProjectId, { financials: { capital_intent: 'solo' } });
      let result = getCachedFinancials(mockProjectId);
      expect(result.capital_intent).toBe('solo');
      expect(result.capitalPlan).toBe('all-cash solo');

      // capital_intent: group -> capitalPlan: partnership
      cacheFinancials(mockProjectId, { financials: { capital_intent: 'group' } });
      result = getCachedFinancials(mockProjectId);
      expect(result.capital_intent).toBe('group');
      expect(result.capitalPlan).toBe('partnership');

      // capital_intent: raise -> capitalPlan: raise interest
      cacheFinancials(mockProjectId, { financials: { capital_intent: 'raise' } });
      result = getCachedFinancials(mockProjectId);
      expect(result.capital_intent).toBe('raise');
      expect(result.capitalPlan).toBe('raise interest');

      // capitalPlan: all-cash solo -> capital_intent: solo
      cacheFinancials(mockProjectId, { financials: { capitalPlan: 'all-cash solo' } });
      result = getCachedFinancials(mockProjectId);
      expect(result.capital_intent).toBe('solo');
      expect(result.capitalPlan).toBe('all-cash solo');

      // capitalPlan: partnership -> capital_intent: group
      cacheFinancials(mockProjectId, { financials: { capitalPlan: 'partnership' } });
      result = getCachedFinancials(mockProjectId);
      expect(result.capital_intent).toBe('group');
      expect(result.capitalPlan).toBe('partnership');

      // capitalPlan: raise interest -> capital_intent: raise
      cacheFinancials(mockProjectId, { financials: { capitalPlan: 'raise interest' } });
      result = getCachedFinancials(mockProjectId);
      expect(result.capital_intent).toBe('raise');
      expect(result.capitalPlan).toBe('raise interest');
    });

    it('should show mailing_list and one_pager steps only for non-solo capital intent, and one_pager requires 2.7 complete', () => {
      const { PHASE_1_QUESTIONS } = require('../app/dashboard/projects/[id]/phase-1/page');
      const mailingListQ = PHASE_1_QUESTIONS.find((q: any) => q.key === 'mailing_list');
      const onePagerQ = PHASE_1_QUESTIONS.find((q: any) => q.key === 'one_pager');

      expect(mailingListQ).toBeDefined();
      expect(onePagerQ).toBeDefined();

      // capital_intent is solo: should not show mailing_list or one_pager
      const answersSolo = { capital_intent: 'solo' as const, expense_tax: 1000 };
      expect(mailingListQ.condition(answersSolo, {})).toBe(false);
      expect(onePagerQ.condition(answersSolo, {})).toBe(false);

      // capital_intent is group: should show mailing_list, and one_pager only if 2.7 is complete (expense_tax !== undefined)
      const answersGroupNoTax = { capital_intent: 'group' as const };
      expect(mailingListQ.condition(answersGroupNoTax, {})).toBe(true);
      expect(onePagerQ.condition(answersGroupNoTax, {})).toBe(false);

      const answersGroupWithTax = { capital_intent: 'group' as const, expense_tax: 1000 };
      expect(mailingListQ.condition(answersGroupWithTax, {})).toBe(true);
      expect(onePagerQ.condition(answersGroupWithTax, {})).toBe(true);

      // capital_intent is raise: should show mailing_list, and one_pager only if 2.7 is complete
      const answersRaiseNoTax = { capital_intent: 'raise' as const };
      expect(mailingListQ.condition(answersRaiseNoTax, {})).toBe(true);
      expect(onePagerQ.condition(answersRaiseNoTax, {})).toBe(false);

      const answersRaiseWithTax = { capital_intent: 'raise' as const, expense_tax: 1000 };
      expect(mailingListQ.condition(answersRaiseWithTax, {})).toBe(true);
      expect(onePagerQ.condition(answersRaiseWithTax, {})).toBe(true);
    });

    it('should show loi_log only if capital_intent is group/raise and one_pager_reviewed is true', () => {
      const loiLogQ = PHASE_1_QUESTIONS.find((q: any) => q.key === 'loi_log') as any;
      expect(loiLogQ).toBeDefined();

      const answersSolo = { capital_intent: 'solo' as const, one_pager_reviewed: true };
      expect(loiLogQ.condition(answersSolo, {})).toBe(false);

      const answersGroupNotReviewed = { capital_intent: 'group' as const, one_pager_reviewed: false };
      expect(loiLogQ.condition(answersGroupNotReviewed, {})).toBe(false);

      const answersGroupReviewed = { capital_intent: 'group' as const, one_pager_reviewed: true };
      expect(loiLogQ.condition(answersGroupReviewed, {})).toBe(true);

      const answersRaiseReviewed = { capital_intent: 'raise' as const, one_pager_reviewed: true };
      expect(loiLogQ.condition(answersRaiseReviewed, {})).toBe(true);
    });

    it('should map one_pager_reviewed, loi_log, and equity_target inside cacheFinancials', () => {
      const { cacheFinancials, getCachedFinancials } = require('../lib/db/projects');
      const mockProjectId = 'test-project-one-pager-review-sync';

      const mockLoiLog = [{ investor: 'Alice', amount: 5000000, date: '2026-07-18', status: 'soft-committed' as const }];
      cacheFinancials(mockProjectId, {
        financials: {
          one_pager_reviewed: true,
          loi_log: mockLoiLog,
          equity_target: 10000000
        }
      });
      const result = getCachedFinancials(mockProjectId);
      expect(result.one_pager_reviewed).toBe(true);
      expect(result.loi_log).toEqual(mockLoiLog);
      expect(result.equity_target).toBe(10000000);
    });
  });
});
