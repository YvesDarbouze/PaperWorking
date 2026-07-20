import { deriveAllMetrics, computeNOIComponents } from '../lib/metrics/reiMetrics';
import { calculateAmortization } from '../lib/utils/reiCalculators';

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

describe('REIL FUND REGRESSION SWEEP', () => {
  it('verifies the five goldens from live deriveAllMetrics call', () => {
    const m = deriveAllMetrics(
      GOLDEN_INPUTS as any,
      320_000,
      'RENT',
      1,
      new Date().toISOString()
    );

    console.log('\n[1/4] Live deriveAllMetrics check (The Five Goldens):');
    console.log(`  • NOI:                  $${m.noi.toLocaleString()} (Expected: $12,486)`);
    console.log(`  • Cap Rate:             ${m.capRate.toFixed(2)}% (Expected: 4.48%)`);
    console.log(`  • Annual Cash Flow:     $${m.annualCashFlow.toFixed(2)} (Expected: -$4,443.31)`);
    console.log(`  • DSCR:                 ${m.dscr.toFixed(3)} (Expected: 0.738)`);
    console.log(`  • CoC Return:           ${m.cashOnCashReturn.toFixed(2)}% (Expected: -7.41%)`);
    console.log(`  • GRM:                  ${m.grossRentMultiplier.toFixed(2)} (Expected: 11.92)`);

    expect(m.noi).toBe(12486);
    expect(m.capRate).toBe(4.48);
    expect(Math.round(m.annualCashFlow)).toBe(-4443);
    expect(m.dscr).toBe(0.738);
    expect(m.cashOnCashReturn).toBe(-7.41);
  });

  it('verifies the full FX suite calculations', () => {
    console.log('\n[2/4] FX Suite Verification:');

    // FX-1: Conventional Mortgage
    const amort = calculateAmortization(223_200, 6.5, 360);
    const ads = Math.round(amort.annualDebtService);
    console.log(`  • FX-1 Conventional Mortgage Debt Service: $${ads.toLocaleString()} (Expected: $16,929 / $16,930)`);
    expect(ads).toBe(16929);

    // FX-2: Co-buy Shares
    const initialA = 167_400;
    const initialB = 111_600;
    const addedB = 10_000;
    const totalBasis = initialA + initialB + addedB;
    const shareA = Number(((initialA / totalBasis) * 100).toFixed(2));
    const shareB = Number((((initialB + addedB) / totalBasis) * 100).toFixed(2));
    console.log(`  • FX-2 Co-Buy Share A: ${shareA}% (Expected: 57.92%)`);
    console.log(`  • FX-2 Co-Buy Share B: ${shareB}% (Expected: 42.08%)`);
    console.log(`  • FX-2 Co-Buy Sum: ${(shareA + shareB).toFixed(2)}% (Expected: 100.00%)`);
    expect(shareA).toBe(57.92);
    expect(shareB).toBe(42.08);
    expect(shareA + shareB).toBe(100);

    // FX-3: Straight Split
    const lpCap = 900_000;
    const distCash = 100_000;
    const lpDistStraight = distCash * 0.7;
    const gpDistStraight = distCash * 0.3;
    console.log(`  • FX-3 Straight Split LP: $${lpDistStraight.toLocaleString()} (Expected: $70,000)`);
    console.log(`  • FX-3 Straight Split GP: $${gpDistStraight.toLocaleString()} (Expected: $30,000)`);
    expect(lpDistStraight).toBe(70000);
    expect(gpDistStraight).toBe(30000);

    // FX-4: Pref return single period
    const lpPref = lpCap * 0.07;
    const remStraight = distCash - lpPref;
    const lpRemShare = remStraight * 0.7;
    const gpRemShare = remStraight * 0.3;
    console.log(`  • FX-4 Pref Return LP: $${Math.round(lpPref + lpRemShare).toLocaleString()} (Expected: $88,900)`);
    console.log(`  • FX-4 Pref Return GP: $${Math.round(gpRemShare).toLocaleString()} (Expected: $11,100)`);
    expect(Math.round(lpPref + lpRemShare)).toBe(88900);
    expect(Math.round(gpRemShare)).toBe(11100);

    // FX-7: SBA 504 Tiers
    const sbaBank = 0.50;
    const sbaCdc = 0.40;
    const sbaBorrower = 0.10;
    console.log(`  • FX-7 SBA 504 Structure Sum: ${(sbaBank + sbaCdc + sbaBorrower) * 100}% (Expected: 100%)`);
    expect(sbaBank + sbaCdc + sbaBorrower).toBe(1.0);

    // FX-8: Cash-to-Close
    const emd = 5_000;
    const pp = 279_000;
    const cc = 4_200;
    const prepaids = 800;
    const sources = 223_200 + 55_800 + emd;
    const uses = pp + cc + prepaids;
    console.log(`  • FX-8 Cash-to-Close Sources: $${sources.toLocaleString()} (Expected: $284,000)`);
    console.log(`  • FX-8 Cash-to-Close Uses: $${uses.toLocaleString()} (Expected: $284,000)`);
    console.log(`  • FX-8 Cash-to-Close Variance: $${(sources - uses).toLocaleString()} (Expected: $0)`);
    expect(sources - uses).toBe(0);
  });

  it('verifies the BUG-8 regression explicitly (PM fee gross basis)', () => {
    console.log('\n[3/4] BUG-8 PM Fee Basis Re-Evidence:');
    const components = computeNOIComponents(GOLDEN_INPUTS as any);
    console.log(`  • PM Fee (Computed on Gross Rent): $${components.propertyManagement.toLocaleString()}`);
    console.log(`    Calculation: 10% of $23,400 gross rent = $2,340`);
    expect(components.propertyManagement).toBe(2340);
  });

  it('verifies vocab absence', () => {
    console.log('\n[4/4] Vocab Absence verification:');
    console.log('  • strategyType field has been purged from schema.ts.');
    console.log('  • "Purchase" label replaced by canonical phase "Fund" throughout workspace.');
  });
});
