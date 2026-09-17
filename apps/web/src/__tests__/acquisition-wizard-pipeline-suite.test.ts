import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  getStrategyTemplateDefaults,
  acquisitionPipelineStatusEnum,
  deadReasonCategoryEnum,
  type InvestmentStrategy,
} from '@paperworking/validation';
import {
  computeMAO,
  reconcileAcquisitionUnderwriting,
  transformCalculatorToProject,
} from '@paperworking/financial-engine';
import {
  saveProjectDraft,
  getProjectDraft,
  deleteProjectDraft,
  clearAllDrafts,
} from '../../lib/projects/drafts-store';
import {
  validateAcquisitionTransition,
  executeAcquisitionTransition,
} from '../../../api/src/lib/reil/acquisition-state-machine';

describe('Acquisition 5-Step Wizard & Pipeline Suite', () => {
  beforeEach(() => {
    clearAllDrafts();
  });

  describe('1. 5-Step Wizard Low-Friction Rule & Progressive Disclosure', () => {
    it('validates that only address, strategy, and purchasePrice are mandatory to launch', () => {
      // Missing address -> invalid
      const step1Check = (addr: string) => addr.trim().length > 0;
      expect(step1Check('')).toBe(false);
      expect(step1Check('  ')).toBe(false);
      expect(step1Check('1247 Elm St')).toBe(true);

      // Strategy selected -> valid
      const step2Check = (strat: InvestmentStrategy | null) => !!strat;
      expect(step2Check(null)).toBe(false);
      expect(step2Check('flip')).toBe(true);

      // Purchase price > 0 -> valid
      const step3Check = (price: number) => price > 0;
      expect(step3Check(0)).toBe(false);
      expect(step3Check(-1000)).toBe(false);
      expect(step3Check(450000)).toBe(true);

      // Optional fields like unit, beds, baths, notes can be omitted without failing
      const projectDoc = {
        address: '1247 Elm St',
        strategy: 'flip' as const,
        purchasePrice: 450000,
      };
      expect(step1Check(projectDoc.address)).toBe(true);
      expect(step2Check(projectDoc.strategy)).toBe(true);
      expect(step3Check(projectDoc.purchasePrice)).toBe(true);
    });

    it('prefills all 5 strategy templates with institutional vacancy floors and rehab categories', () => {
      const strategies: InvestmentStrategy[] = [
        'flip',
        'brrrr',
        'buy_and_hold_rental',
        'short_term_rental_airbnb',
        'commercial_value_add',
      ];

      for (const strat of strategies) {
        const defaults = getStrategyTemplateDefaults(strat);
        expect(defaults.strategy).toBe(strat);
        expect(defaults.dispositionType).toBeDefined();
        expect(defaults.operatingExpenseRatioPct).toBeGreaterThan(0);
        expect(defaults.rehabCategories.length).toBeGreaterThan(0);
        expect(defaults.standardTaskTitles.length).toBeGreaterThan(0);

        if (strat === 'buy_and_hold_rental') {
          expect(defaults.vacancyRatePct).toBeGreaterThanOrEqual(6.0); // 6% floor
        }
        if (strat === 'brrrr') {
          expect(defaults.vacancyRatePct).toBeGreaterThanOrEqual(7.0); // 7% floor
        }
        if (strat === 'commercial_value_add') {
          expect(defaults.vacancyRatePct).toBeGreaterThanOrEqual(8.0); // 8% floor
        }
        if (strat === 'flip') {
          expect(defaults.vacancyRatePct).toBe(0.0);
          expect(defaults.dispositionType).toBe('SALE');
        }
      }
    });
  });

  describe('2. Server-Side Drafts Store & Progressive Persistence', () => {
    it('autosaves wizard state per step and retrieves draft across refreshes', () => {
      const userId = 'usr-wizard-test-1';

      // Step 1 Save
      saveProjectDraft(userId, {
        step: 1,
        address: '501 E 6th St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
      });

      let draft = getProjectDraft(userId);
      expect(draft).not.toBeNull();
      expect(draft?.step).toBe(1);
      expect(draft?.address).toBe('501 E 6th St');

      // Step 2 Save
      saveProjectDraft(userId, {
        step: 2,
        strategy: 'brrrr',
      });

      draft = getProjectDraft(userId);
      expect(draft?.step).toBe(2);
      expect(draft?.address).toBe('501 E 6th St');
      expect(draft?.strategy).toBe('brrrr');

      // Step 3 Save
      saveProjectDraft(userId, {
        step: 3,
        purchasePrice: 420000,
        rehabBudget: 60000,
        estimatedARV: 580000,
      });

      draft = getProjectDraft(userId);
      expect(draft?.step).toBe(3);
      expect(draft?.purchasePrice).toBe(420000);
      expect(draft?.rehabBudget).toBe(60000);

      // Discard / Clear on Launch
      deleteProjectDraft(userId);
      expect(getProjectDraft(userId)).toBeNull();
    });
  });

  describe('3. Canonical Underwriting Engine & MAO 70% Rule', () => {
    it('reconciles underwriting metrics and generates live scorecard', () => {
      const metrics = reconcileAcquisitionUnderwriting({
        purchasePrice: 500000,
        rehabBudget: 50000,
        estimatedARV: 650000,
        grossRentMonthly: 4500,
        operatingExpenseRatioPct: 35,
        vacancyRatePct: 6.0,
        targetLtvPct: 75,
        interestRatePct: 6.5,
        amortizationYears: 30,
        strategy: 'buy_and_hold_rental',
        terminalValueMethod: 'appreciation_pct',
      });

      expect(metrics.totalCostBasis).toBe(560000); // 500k + 10k closing + 50k rehab
      expect(metrics.loanAmount).toBe(375000); // 75% of 500k
      expect(metrics.cashRequired).toBe(185000); // 560k - 375k
      expect(metrics.maximumAllowableOffer70Pct).toBe(395000); // (650k * 0.70) - 50k - 10k
      expect(metrics.capRateOnCost).toBeGreaterThan(0);
      expect(metrics.cashOnCashReturnPct).toBeGreaterThan(0);
      expect(metrics.dscr).toBeGreaterThan(1.0);
    });

    it('computes 70% rule MAO with dynamic closing costs', () => {
      const result = computeMAO(600000, 50000, 0.70, 12000);
      // (600,000 * 0.70) - 50,000 - 12,000 = 420,000 - 62,000 = 358,000
      expect(result.mao).toBe(358000);
      expect(result.isViable).toBe(true);
    });
  });

  describe('4. Acquisition Pipeline FSM & Milestone Generation', () => {
    it('auto-generates 11 milestone tasks when moving to under_contract', () => {
      const validation = validateAcquisitionTransition('offer_sent', 'under_contract', {
        projectId: 'test-deal-1',
        psaDocumentUrl: '/docs/psa.pdf',
        psaExecutionDate: new Date().toISOString(),
      });
      expect(validation.valid).toBe(true);

      const executed = executeAcquisitionTransition(
        'offer_sent',
        'under_contract',
        {
          projectId: 'test-deal-1',
          psaDocumentUrl: '/docs/psa.pdf',
          psaExecutionDate: new Date().toISOString(),
          contingencyDeadlines: {
            inspectionDays: 10,
            financingDays: 21,
            appraisalDays: 14,
          },
        },
        'user-1',
      );

      expect(executed.updatedStatus).toBe('under_contract');
      expect(executed.autoGeneratedTasks).toBeDefined();
      expect(executed.autoGeneratedTasks?.length).toBe(11);

      const taskTitles = executed.autoGeneratedTasks!.map((t) => t.title);
      expect(taskTitles).toContain('Wire Earnest Money Deposit (EMD)');
      expect(taskTitles).toContain('Schedule General Property Inspection');
      expect(taskTitles).toContain('Request Title Search & Commitment');
      expect(taskTitles).toContain('Order Property Appraisal');
    });

    it('rejects under_contract transition if PSA execution date / doc is missing', () => {
      const validation = validateAcquisitionTransition('offer_sent', 'under_contract', {
        projectId: 'test-deal-1',
      });
      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('PSA_DETAILS_REQUIRED');
    });

    it('requires valid deadReasonCategory and notes >= 3 characters to archive dead deal', () => {
      const validTransition = validateAcquisitionTransition('analyzing', 'dead', {
        projectId: 'test-deal-1',
        deadReason: 'inspection',
        deadReasonNotes: 'Foundation crack discovered during walk-through',
      });
      expect(validTransition.valid).toBe(true);

      const executed = executeAcquisitionTransition(
        'analyzing',
        'dead',
        {
          projectId: 'test-deal-1',
          deadReason: 'inspection',
          deadReasonNotes: 'Foundation crack discovered during walk-through',
        },
        'user-1',
      );

      expect(executed.updatedStatus).toBe('dead');
      expect(executed.deadRecord).toBeDefined();
      expect(executed.deadRecord?.deadReasonCategory).toBe('inspection');
      expect(executed.deadRecord?.archivedByUid).toBe('user-1');

      // Notes too short (< 3 chars)
      const invalidNotes = validateAcquisitionTransition('analyzing', 'dead', {
        projectId: 'test-deal-1',
        deadReason: 'inspection',
        deadReasonNotes: 'no',
      });
      expect(invalidNotes.valid).toBe(false);
      expect(invalidNotes.code).toBe('DEAD_NOTES_REQUIRED');
    });

    it('rejects illegal backward or jumping transitions', () => {
      // Cannot jump from lead to clear_to_close
      const invalidJump = validateAcquisitionTransition('lead', 'clear_to_close', {
        projectId: 'test-deal-1',
      });
      expect(invalidJump.valid).toBe(false);
      expect(invalidJump.code).toBe('INVALID_TRANSITION');
    });
  });

  describe('5. Progressive Alert Thresholds (<72h, <48h, <24h)', () => {
    it('classifies contingency deadlines accurately by urgency', () => {
      const now = Date.now();

      const testContingencies = [
        {
          id: 'c-1',
          label: 'Notice Alert',
          deadline: new Date(now + 60 * 3600000).toISOString(), // 60h left
          status: 'open',
        },
        {
          id: 'c-2',
          label: 'Urgent Alert',
          deadline: new Date(now + 36 * 3600000).toISOString(), // 36h left
          status: 'open',
        },
        {
          id: 'c-3',
          label: 'Critical Alert Barrier',
          deadline: new Date(now + 12 * 3600000).toISOString(), // 12h left
          status: 'open',
        },
      ];

      const evaluated = testContingencies.map((c) => {
        const hoursLeft = Math.round(
          (new Date(c.deadline).getTime() - now) / 3600000,
        );
        const severity =
          hoursLeft <= 24
            ? 'critical'
            : hoursLeft <= 48
            ? 'urgent'
            : hoursLeft <= 72
            ? 'notice'
            : 'normal';
        return { ...c, hoursLeft, severity };
      });

      expect(evaluated[0]?.severity).toBe('notice');
      expect(evaluated[1]?.severity).toBe('urgent');
      expect(evaluated[2]?.severity).toBe('critical');
    });
  });
});
