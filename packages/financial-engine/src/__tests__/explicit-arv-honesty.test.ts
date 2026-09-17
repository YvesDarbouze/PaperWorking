import {
  computeMAO,
  reconcileAcquisitionUnderwriting,
  transformCalculatorToProject,
  ValuationInputRequiredError,
  canonicalDemoDeal,
} from '../index.js';

describe('W2-02 Explicit ARV or Null (CATCH-13) Honesty Tests', () => {
  describe('Valuation Input Required Safeguards', () => {
    it('1. reconcileAcquisitionUnderwriting throws ValuationInputRequiredError when ARV is missing or null', () => {
      expect(() => {
        reconcileAcquisitionUnderwriting({
          purchasePrice: 500000,
          rehabBudget: 50000,
          estimatedARV: null as any,
          grossRentMonthly: 3500,
        });
      }).toThrow(ValuationInputRequiredError);

      try {
        reconcileAcquisitionUnderwriting({
          purchasePrice: 500000,
          rehabBudget: 50000,
          estimatedARV: 0,
          grossRentMonthly: 3500,
        });
        throw new Error('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ValuationInputRequiredError);
        expect(err.code).toBe('VALUATION_INPUT_REQUIRED');
        expect(err.message).toBe('ARV not provided — enter ARV to compute equity/MAO.');
      }
    });

    it('2. computeMAO throws ValuationInputRequiredError when ARV is absent, null, or zero', () => {
      expect(() => computeMAO(0, 50000)).toThrow(ValuationInputRequiredError);
      expect(() => computeMAO(null as any, 50000)).toThrow(ValuationInputRequiredError);
      expect(() => computeMAO(undefined as any, 50000)).toThrow(ValuationInputRequiredError);
      expect(() => computeMAO(-1000, 50000)).toThrow(ValuationInputRequiredError);
    });

    it('3. computeMAO with explicit ARV calculates MAO matching hand-calculation to the cent', () => {
      // Hand check: ARV = $650,000, ruleMultiplier = 0.70, rehab = $62,000, closing = $9,700
      // Expected MAO = ($650,000 * 0.70) - $62,000 - $9,700 = $455,000 - $62,000 - $9,700 = $383,300.00
      const result = computeMAO(650000, 62000, 0.70, 9700);
      expect(result.mao).toBe(383300);
      expect(result.rawMao).toBe(383300);
      expect(result.isViable).toBe(true);
      expect(result.formulaDescription).toBe('(650,000 × 70%) - 62,000 - 9,700');
    });

    it('4. canonicalDemoDeal with explicit ARV produces exact verified outputs (0% regression drift)', () => {
      // Purchase $520,000, Rehab $59,800, Closing $15,600, ARV $680,000
      // MAO = (680000 * 0.70) - 59800 - 15600 = 476000 - 59800 - 15600 = 400600
      const result = reconcileAcquisitionUnderwriting(canonicalDemoDeal);
      expect(result.maximumAllowableOffer70Pct).toBe(400600);
      expect(result.totalCostBasis).toBe(595400); // 520k + 59.8k + 15.6k closing
      expect(result.buyerClosingCostsAmount).toBe(15600);
      expect(result.capRateOnCost).toBe(6.4);
    });

    it('5. transformCalculatorToProject records estimatedExitValue: null and estimatedARV: null when ARV is omitted', () => {
      const payload = transformCalculatorToProject({
        purchasePrice: 500000,
        rehabBudget: 40000,
        grossRentMonthly: 3500,
        strategy: 'flip',
        address: '456 Oak St, Austin, TX 78701',
        createdByUid: 'usr-analyst-1',
        projectName: 'Honest No ARV Project',
      });

      // Must never synthesize 1.25 * purchasePrice
      expect(payload.estimatedExitValue).toBeNull();
      expect(payload.underwritingSnapshot.inputs.estimatedARV).toBeNull();
      expect(payload.underwritingSnapshot.snapshotId).toBeDefined();
    });

    it('6. transformCalculatorToProject preserves explicit ARV when provided', () => {
      const payload = transformCalculatorToProject({
        purchasePrice: 500000,
        rehabBudget: 40000,
        estimatedARV: 720000,
        grossRentMonthly: 3500,
        strategy: 'flip',
        address: '789 Pine St, Austin, TX 78702',
        createdByUid: 'usr-analyst-1',
        projectName: 'Explicit ARV Project',
      });

      expect(payload.estimatedExitValue).toBe(720000);
      expect(payload.underwritingSnapshot.inputs.estimatedARV).toBe(720000);
      expect(payload.underwritingSnapshot.outputs).not.toBeNull();
      expect(payload.underwritingSnapshot.outputs?.maximumAllowableOffer70Pct).toBeDefined();
    });
  });
});
