import {
  reconcileAcquisitionUnderwriting,
  canonicalDemoDeal,
  TerminalValueMethodRequiredError,
} from '../index.js';

describe('MISSION W2-06: Terminal-Value Discipline', () => {
  // Base deal fixture
  const baseDeal = {
    purchasePrice: 520000,
    rehabBudget: 59800,
    estimatedARV: 680000,
    grossRentMonthly: 5200,
    operatingExpensesAnnual: 21142,
    vacancyRatePct: 5.0,
    targetLtvPct: 75.0,
    interestRatePct: 6.5,
    amortizationYears: 30,
    buyerClosingCostsPct: 3.0,
    holdPeriodYears: 5,
    sellingCostsPct: 6.0,
  };

  /**
   * Test 1: Hand-computed distinct exit values for each method
   * Hand computation arithmetic:
   * Purchase Price: $520,000, Hold Period: 5 years, NOI: $38,138
   * - appreciation_pct @ 3.0%:
   *   $520,000 * (1.03)^5 = $520,000 * 1.1592740743 = $602,822.52 -> $602,823
   * - exit_cap @ 6.5%:
   *   $38,138 / 0.065 = $586,738.46 -> $586,738
   * - per_unit @ 3 units * $210,000/unit:
   *   3 * $210,000 = $630,000
   */
  it('1. same deal under each of the three methods yields distinct, hand-computable exit values', () => {
    // 1A. appreciation_pct (purchase_price base, default)
    const resApprec = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'appreciation_pct',
      annualAppreciationPct: 3.0,
    });
    expect(resApprec.estimatedExitValue).toBe(602823);
    expect(resApprec.terminalValueLabel).toBe('Exit @ 3.0%/yr on $520,000 purchase price');
    expect(resApprec.terminalValueMethod).toBe('appreciation_pct');
    expect(resApprec.appreciationBase).toBe('purchase_price');

    // 1A-2. appreciation_pct (explicit ARV base)
    const resApprecArv = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'appreciation_pct',
      appreciationBase: 'arv',
      annualAppreciationPct: 3.0,
    });
    // $680,000 * 1.03^5 = $788,306
    expect(resApprecArv.estimatedExitValue).toBe(788306);
    expect(resApprecArv.terminalValueLabel).toBe('Exit @ 3.0%/yr on $680,000 ARV');
    expect(resApprecArv.appreciationBase).toBe('arv');

    // 1B. exit_cap
    const resExitCap = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'exit_cap',
      exitCapRatePct: 6.5,
    });
    expect(resExitCap.estimatedExitValue).toBe(586738);
    expect(resExitCap.terminalValueLabel).toBe('Exit @ 6.5% cap on Y5 NOI');
    expect(resExitCap.terminalValueMethod).toBe('exit_cap');

    // 1C. per_unit
    const resPerUnit = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'per_unit',
      unitsCount: 3,
      perUnitExitValue: 210000,
    });
    expect(resPerUnit.estimatedExitValue).toBe(630000);
    expect(resPerUnit.terminalValueLabel).toBe('Exit @ $210,000/unit');
    expect(resPerUnit.terminalValueMethod).toBe('per_unit');

    // All distinct exit values
    expect(resApprec.estimatedExitValue).not.toBe(resExitCap.estimatedExitValue);
    expect(resApprec.estimatedExitValue).not.toBe(resPerUnit.estimatedExitValue);
    expect(resApprecArv.estimatedExitValue).not.toBe(resApprec.estimatedExitValue);
  });

  // Test 2: Missing method -> honest required-input state (throws TerminalValueMethodRequiredError)
  it('2. missing terminalValueMethod throws TerminalValueMethodRequiredError (never a silent default)', () => {
    const unselectedDeal = { ...baseDeal };
    delete (unselectedDeal as any).terminalValueMethod;

    expect(() => {
      reconcileAcquisitionUnderwriting(unselectedDeal);
    }).toThrow(TerminalValueMethodRequiredError);

    expect(() => {
      reconcileAcquisitionUnderwriting(unselectedDeal);
    }).toThrow('Terminal value method not selected — choose appreciation_pct, exit_cap, or per_unit.');
  });

  // Test 3: Method label is present on output and carries descriptive qualifier
  it('3. every result carries an explicit method label qualifier naming the base', () => {
    const res1 = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'appreciation_pct',
      annualAppreciationPct: 4.5,
      appreciationBase: 'purchase_price',
    });
    expect(res1.terminalValueLabel).toBe('Exit @ 4.5%/yr on $520,000 purchase price');

    const res1Arv = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'appreciation_pct',
      annualAppreciationPct: 4.5,
      appreciationBase: 'arv',
    });
    expect(res1Arv.terminalValueLabel).toBe('Exit @ 4.5%/yr on $680,000 ARV');

    const res2 = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'exit_cap',
      exitCapRatePct: 6.5,
    });
    expect(res2.terminalValueLabel).toBe('Exit @ 6.5% cap on Y5 NOI');

    const res3 = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'per_unit',
      unitsCount: 3,
      perUnitExitValue: 200000,
    });
    expect(res3.terminalValueLabel).toBe('Exit @ $200,000/unit');
  });

  // Test 4: 0%-appreciation reproduces purchase price as exit value to the dollar
  it('4. 0%-appreciation reproduces purchase price as exit value to the dollar', () => {
    const flatApprec = reconcileAcquisitionUnderwriting({
      ...baseDeal,
      terminalValueMethod: 'appreciation_pct',
      annualAppreciationPct: 0.0,
    });

    // 520,000 * (1 + 0)^5 = 520,000
    expect(flatApprec.estimatedExitValue).toBe(520000);
    expect(flatApprec.terminalValueLabel).toBe('Exit @ 0.0%/yr on $520,000 purchase price');
  });

  // Test 5: Canonical fixture regression golden unchanged under appreciation_pct with 3.0%
  it('5. canonical fixture golden remains exactly 3.8% IRR under appreciation_pct at 3.0%', () => {
    const canonicalResult = reconcileAcquisitionUnderwriting(canonicalDemoDeal);

    expect(canonicalResult.terminalValueMethod).toBe('appreciation_pct');
    expect(canonicalResult.estimatedExitValue).toBe(602823);
    expect(canonicalResult.projectedIrrPct).toBe(3.8);
    expect(canonicalResult.capRateOnCost).toBe(6.4);
    expect(canonicalResult.cashOnCashReturnPct).toBe(4.2);
  });

  // Test 6: Legacy read-path for pre-W2-06 persisted deals supplies labeled default at load time
  it('6. legacy read-path with allowDefaultTerminalMethod supplies labeled appreciation_pct default without throwing', () => {
    const legacyDeal = { ...baseDeal };
    delete (legacyDeal as any).terminalValueMethod;

    const res = reconcileAcquisitionUnderwriting({
      ...legacyDeal,
      allowDefaultTerminalMethod: true,
    });

    expect(res.terminalValueMethod).toBe('appreciation_pct');
    expect(res.terminalValueLabel).toBe('Exit @ 3.0%/yr on $520,000 purchase price');
    expect(res.estimatedExitValue).toBe(602823);
  });
});

