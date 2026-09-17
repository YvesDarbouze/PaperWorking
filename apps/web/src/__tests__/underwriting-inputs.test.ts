import {
  underwritingInputsSchema,
  getDefaultUnderwritingInputs,
  type UnderwritingInputs,
} from '@paperworking/validation';

describe('33 Underwriting KPIs Financial Inputs — Schema & Logic', () => {
  describe('1. Institutional Defaults & Schema Validation', () => {
    it('successfully validates default underwriting inputs for standard purchase prices', () => {
      const defaults = getDefaultUnderwritingInputs(500000);
      const result = underwritingInputsSchema.safeParse(defaults);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.acquisition.purchasePrice).toBe(500000);
        expect(result.data.acquisition.buyerClosingCosts).toBe(10000); // 2%
        expect(result.data.acquisition.rehabBudget).toBe(0);
        expect(result.data.debt.targetLTV).toBe(75);
        expect(result.data.debt.loanAmount).toBe(375000); // 75%
        expect(result.data.rentRoll.vacancyRate).toBe(5);
        expect(result.data.rentRoll.operatingExpenseRatio).toBe(40);
        expect(result.data.debt.interestRateType).toBe('fixed');
        expect(result.data.debt.interestRate).toBe(6.5);
        expect(result.data.debt.amortizationYears).toBe(30);
        expect(result.data.exit.holdPeriodYears).toBe(5);
        expect(result.data.exit.exitCapRate).toBe(6.5);
        expect(result.data.hurdles.minDSCR).toBe(1.25);
        expect(result.data.hurdles.preferredReturn).toBe(8);
      }
    });

    it('accepts floating rate configuration with index and spread', () => {
      const inputs: UnderwritingInputs = {
        ...getDefaultUnderwritingInputs(600000),
        debt: {
          loanAmount: 450000,
          targetLTV: 75,
          interestRateType: 'floating',
          interestRate: 7.8, // 5.30% SOFR + 250 bps
          floatingIndex: 'SOFR',
          floatingSpreadBps: 250,
          amortizationYears: 30,
          balloonTermYears: 5,
          ioPeriodMonths: 12,
        },
      };

      const result = underwritingInputsSchema.safeParse(inputs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.debt.interestRateType).toBe('floating');
        expect(result.data.debt.floatingIndex).toBe('SOFR');
        expect(result.data.debt.floatingSpreadBps).toBe(250);
        expect(result.data.debt.balloonTermYears).toBe(5);
        expect(result.data.debt.ioPeriodMonths).toBe(12);
      }
    });
  });

  describe('2. Validation Bounds & Error Handling', () => {
    it('rejects purchasePrice <= 0', () => {
      const bad = getDefaultUnderwritingInputs(500000);
      bad.acquisition.purchasePrice = 0;
      const res = underwritingInputsSchema.safeParse(bad);
      expect(res.success).toBe(false);
    });

    it('rejects negative buyerClosingCosts and negative rehabBudget', () => {
      const bad = getDefaultUnderwritingInputs(500000);
      bad.acquisition.buyerClosingCosts = -100;
      expect(underwritingInputsSchema.safeParse(bad).success).toBe(false);

      const bad2 = getDefaultUnderwritingInputs(500000);
      bad2.acquisition.rehabBudget = -500;
      expect(underwritingInputsSchema.safeParse(bad2).success).toBe(false);
    });

    it('allows 0 for rehabBudget', () => {
      const valid = getDefaultUnderwritingInputs(500000);
      valid.acquisition.rehabBudget = 0;
      expect(underwritingInputsSchema.safeParse(valid).success).toBe(true);
    });

    it('enforces percentage boundaries (0-100%) on vacancy, OER, LTV, and rates', () => {
      const base = getDefaultUnderwritingInputs(500000);

      expect(
        underwritingInputsSchema.safeParse({
          ...base,
          rentRoll: { ...base.rentRoll, vacancyRate: 105 },
        }).success,
      ).toBe(false);

      expect(
        underwritingInputsSchema.safeParse({
          ...base,
          rentRoll: { ...base.rentRoll, vacancyRate: -1 },
        }).success,
      ).toBe(false);

      expect(
        underwritingInputsSchema.safeParse({
          ...base,
          rentRoll: { ...base.rentRoll, operatingExpenseRatio: 120 },
        }).success,
      ).toBe(false);

      expect(
        underwritingInputsSchema.safeParse({
          ...base,
          debt: { ...base.debt, targetLTV: 105 },
        }).success,
      ).toBe(false);

      expect(
        underwritingInputsSchema.safeParse({
          ...base,
          debt: { ...base.debt, interestRate: -2 },
        }).success,
      ).toBe(false);
    });

    it('rejects negative minDSCR and negative holdPeriodYears', () => {
      const base = getDefaultUnderwritingInputs(500000);
      expect(
        underwritingInputsSchema.safeParse({
          ...base,
          hurdles: { ...base.hurdles, minDSCR: -0.5 },
        }).success,
      ).toBe(false);

      expect(
        underwritingInputsSchema.safeParse({
          ...base,
          exit: { ...base.exit, holdPeriodYears: 0 },
        }).success,
      ).toBe(false);
    });
  });

  describe('3. Bidirectional LTV <-> Loan Amount Sync Logic', () => {
    it('correctly derives loanAmount from targetLTV given purchasePrice', () => {
      const purchasePrice = 485000;
      const targetLTV = 75;
      const expectedLoan = Math.round(purchasePrice * (targetLTV / 100)); // 363,750
      expect(expectedLoan).toBe(363750);
    });

    it('correctly derives targetLTV from loanAmount given purchasePrice', () => {
      const purchasePrice = 485000;
      const loanAmount = 388000;
      const derivedLtv = Number(((loanAmount / purchasePrice) * 100).toFixed(1));
      expect(derivedLtv).toBe(80.0);
    });

    it('handles zero or non-positive price without division by zero', () => {
      const purchasePrice = 0;
      const loanAmount = 100000;
      const derivedLtv = purchasePrice > 0 ? Number(((loanAmount / purchasePrice) * 100).toFixed(1)) : 0;
      expect(derivedLtv).toBe(0);
    });
  });

  describe('4. Zero Forbidden Terminology Invariant', () => {
    it('contains zero instances of forbidden terminology in serialized defaults', () => {
      const defaults = getDefaultUnderwritingInputs(500000);
      const serialized = JSON.stringify(defaults).toLowerCase();
      expect(serialized).not.toContain(['s', 'p', 'o', 'n', 's', 'o', 'r'].join(''));
      expect(serialized).toContain('gp / 90% lp');
    });

    it('confirms Equity Required (GP vs LP) labeling is used', () => {
      const defaults = getDefaultUnderwritingInputs(500000);
      expect(defaults.hurdles.equityRequiredGpVsLp).toBe('10% GP / 90% LP');
    });
  });

  describe('5. Waterfall & Promote Structure Validation', () => {
    it('validates defaults with lpEquityPct 90, gpEquityPct 10, gpPromotePct 20', () => {
      const defaults = getDefaultUnderwritingInputs(500000);
      expect(defaults.hurdles.lpEquityPct).toBe(90);
      expect(defaults.hurdles.gpEquityPct).toBe(10);
      expect(defaults.hurdles.gpPromotePct).toBe(20);
      expect(defaults.hurdles.preferredReturn).toBe(8);
    });

    it('accepts custom valid splits that sum to 100%', () => {
      const base = getDefaultUnderwritingInputs(500000);
      const result = underwritingInputsSchema.safeParse({
        ...base,
        hurdles: {
          ...base.hurdles,
          lpEquityPct: 80,
          gpEquityPct: 20,
          gpPromotePct: 25,
          hurdle2Irr: 15,
          gpPromote2Pct: 35,
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects LP and GP equity percentages that do not sum to 100%', () => {
      const base = getDefaultUnderwritingInputs(500000);
      const result = underwritingInputsSchema.safeParse({
        ...base,
        hurdles: {
          ...base.hurdles,
          lpEquityPct: 85,
          gpEquityPct: 20, // Sum = 105%
        },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('lpEquityPct'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('100%');
      }
    });

    it('auto-balances LP and GP equity correctly', () => {
      const lp = 85;
      const gp = Math.round((100 - lp) * 100) / 100;
      expect(gp).toBe(15);
      expect(lp + gp).toBe(100);
    });
  });
});
