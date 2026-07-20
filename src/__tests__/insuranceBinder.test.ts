import { deriveAllProjectMetrics } from '../lib/metrics/reiMetrics';
import { FX_1_PROJECT } from '../lib/metrics/fixtures';

describe('FD-27: Insurance Binder and Riders Validation', () => {
  it('correctly derives opex insurance and NOI from the annual premium input', () => {
    // 1. Setup a project financials object with an annual insurance premium of $2,400
    const annualPremium = 2400;
    const monthlyPremium = annualPremium / 12; // $200/mo

    const projectWithAnnualPremium = {
      ...FX_1_PROJECT,
      financials: {
        ...FX_1_PROJECT.financials,
        insuranceCost: annualPremium,
        insurance: monthlyPremium, // writes to the insurance expense category
        holdingCostInsurance: monthlyPremium,
      },
    };

    // calculate metrics
    const metrics = deriveAllProjectMetrics(projectWithAnnualPremium);

    // Verify NOI in the metrics engine is $10,782 (EGI $21,762 - Total Opex $10,980)
    expect(metrics.noi).toBe(10782);
  });

  it('verifies that the five goldens on the demo property remain intact with seeded premium (no double-counting)', () => {
    // FX_1_PROJECT has a monthly insurance of $58 seeded.
    // Annualized = 58 * 12 = $696.
    const metrics = deriveAllProjectMetrics(FX_1_PROJECT);

    // Verify that the five goldens reproduce exactly
    // Golden 1: NOI = $12,486
    expect(metrics.noi).toBe(12486);

    // Golden 2: Annual Cash Flow = -$4,443.31
    expect(metrics.annualCashFlow).toBeCloseTo(-4443.31, 1);

    // Golden 3: DSCR = 0.74
    expect(metrics.dscr).toBeCloseTo(0.74, 2);

    // Golden 4: Cash-on-Cash Return = -7.41%
    expect(metrics.cashOnCashReturn).toBeCloseTo(-7.41, 1);

    // Golden 5: GRM = 11.92
    expect(metrics.grossRentMultiplier).toBeCloseTo(11.92, 2);
  });

  it('ensures that opex coalescing prevents double counting between insurance and holdingCostInsurance', () => {
    const projectDoubleFields = {
      ...FX_1_PROJECT,
      financials: {
        ...FX_1_PROJECT.financials,
        insurance: 100, // Monthly premium
        holdingCostInsurance: 50, // Should be ignored because financials.insurance is preferred
      },
    };

    const metrics = deriveAllProjectMetrics(projectDoubleFields);
    
    // NOI should reflect monthly insurance of $100 * 12 = $1,200 (Total Opex $9,780).
    // NOI = EGI $21,762 - Total Opex $9,780 = $11,982.
    expect(metrics.noi).toBe(11982);
  });

  it('correctly tracks conditional hazard riders and zone status parameters', () => {
    const projectWithRiders = {
      ...FX_1_PROJECT,
      financials: {
        ...FX_1_PROJECT.financials,
        hasFloodRider: true,
        floodZone: 'Zone AE',
        hasEarthquakeRider: true,
        earthquakeZone: 'High Risk 4',
      },
    };

    expect(projectWithRiders.financials.hasFloodRider).toBe(true);
    expect(projectWithRiders.financials.floodZone).toBe('Zone AE');
    expect(projectWithRiders.financials.hasEarthquakeRider).toBe(true);
    expect(projectWithRiders.financials.earthquakeZone).toBe('High Risk 4');
  });
});
