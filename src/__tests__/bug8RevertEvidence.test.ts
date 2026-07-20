/**
 * BUG-8 REVERT EVIDENCE
 *
 * This test exists solely to produce on-screen evidence that the BUG-8 revert
 * has been executed: the engine is on gross-scheduled-rent basis per P6 canon,
 * and all five locked golden values are restored.
 *
 * PM Fee Basis: GROSS scheduled rent ($23,400 × 10% = $2,340)
 * NOT effective rent ($21,762 × 10% = $2,176.20) ← BUG-8 drift
 */

jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import { deriveAllMetrics, computeNOIComponents } from '../lib/metrics/reiMetrics';

const GOLDEN_INPUTS = {
  purchasePrice: 279_000,
  monthlyGrossRent: 1_950,
  vacancyRatePercent: 7,
  propertyManagementFeePercent: 10,
  holdingCostTaxes: 200,
  holdingCostInsurance: 58,
  holdingCostUtilities: 125,
  monthlyMaintenanceReserve: 195,
  monthlyHOA: 0,
  loanAmount: 223_200,
  loanInterestRate: 6.5,
  loanTermYears: 30,
  totalCashInvested: 60_000,
  estimatedARV: 320_000,
  projectedRehabCost: 35_000,
};

describe('BUG-8 REVERT EVIDENCE — Gross-Basis PM Fee (P6 Canon)', () => {
  it('PM fee is computed on GROSS rent, not effective rent', () => {
    const components = computeNOIComponents(GOLDEN_INPUTS as any);

    // PM = 10% of $23,400 (gross) = $2,340
    expect(components.propertyManagement).toBe(2_340);

    // NOT the BUG-8 value: 10% of $21,762 (effective) = $2,176.20
    expect(components.propertyManagement).not.toBe(2_176.20);

    console.log('PM Fee: $' + components.propertyManagement + ' (10% of $23,400 gross ✓)');
    console.log('  NOT $2,176.20 (10% of $21,762 effective — BUG-8 drift ✗)');
  });

  it('produces all 5 locked golden values on screen', () => {
    const m = deriveAllMetrics(
      GOLDEN_INPUTS as any,
      320_000,
      'RENT',
      1,
      new Date().toISOString()
    );

    // The 5 locked golden values (P6 canon)
    expect(m.noi).toBe(12_486);
    expect(m.capRate).toBe(4.5);
    expect(m.annualCashFlow).toBeCloseTo(-4444, 0);
    expect(m.dscr).toBe(0.74);
    expect(m.cashOnCashReturn).toBe(-7.41);
    expect(m.grossRentMultiplier).toBe(11.92);

    console.log('\n=== BUG-8 REVERT EVIDENCE ===');
    console.log('PM Fee Basis: GROSS scheduled rent (P6 canon)');
    console.log('');
    console.log('5 Locked Golden Values:');
    console.log('  NOI:          $' + m.noi.toLocaleString() + '    (canon: $12,486 ✓)');
    console.log('  Cap Rate:     ' + m.capRate + '%       (canon: ≈4.5% ✓)');
    console.log('  Cash Flow:    $' + m.annualCashFlow.toFixed(2) + '  (canon: ≈-$4,444 ✓)');
    console.log('  DSCR:         ' + m.dscr + '        (canon: ≈0.74 ✓)');
    console.log('  CoC Return:   ' + m.cashOnCashReturn + '%     (canon: -7.41% ✓)');
    console.log('  GRM:          ' + m.grossRentMultiplier + '       (canon: 11.92 ✓)');
    console.log('');
    console.log('NOI Components:');
    console.log('  Gross Rent:   $' + m.noiComponents.grossRentalIncome);
    console.log('  Vacancy Loss: $' + m.noiComponents.vacancyLoss);
    console.log('  EGI:          $' + m.noiComponents.egi);
    console.log('  PM Fee:       $' + m.noiComponents.propertyManagement + ' (gross-basis ✓)');
    console.log('  Total OpEx:   $' + m.noiComponents.totalOperatingExpenses);
    console.log('  NOI:          $' + m.noiComponents.noi);
    console.log('=============================\n');
  });
});
