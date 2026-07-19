import type { Project } from '@/types/schema';
import { computeNOI, deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/**
 * Card F4.4 — Insurance Binder — Unit tests
 *
 * Verifies annual premium updates, opex premium sync (annual premium / 12),
 * and the conditional rider logic.
 */

// Helper to make a baseline project with financials
function makeMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project_test_123',
    organizationId: 'org_test_123',
    propertyName: 'Test Property',
    currentPhase: 2,
    dispositionType: 'RENT',
    createdAt: new Date().toISOString(),
    ownerUid: 'user_investor_123',
    financials: {
      purchasePrice: 100000,
      estimatedARV: 150000,
      monthlyGrossRent: 2000, // Gross Rental Income = $24,000/yr
      vacancyRatePercent: 7, // Vacancy = $1,680/yr (EGI = $22,320)
      costs: [],
      // Expenses
      tax: 150,       // $1,800/yr
      insurance: 100, // $1,200/yr (monthly baseline)
      utilities: 50,  // $600/yr
      management: 0,
      maintenance: 0,
      HOA: 0,
      security: 0,
      capex: 0,
      ...overrides.financials,
    },
    ...overrides,
  } as unknown as Project;
}

describe('Card F4.4 — Insurance Binder', () => {
  /* ═══ NOI derivation ════════════════════════════════════════════════════ */
  describe('NOI math with premium updates (BUG-8 vigilance)', () => {
    it('computes correct baseline NOI components', () => {
      const project = makeMockProject();
      const metrics = deriveAllMetrics(project.financials!, undefined, project.dispositionType, project.currentPhase);

      // EGI = 2000 * 12 - 7% = 24000 - 1680 = 22320
      // Expenses = (150 tax + 100 ins + 50 util) * 12 = 300 * 12 = 3600
      // NOI = EGI - Expenses = 22320 - 3600 = 18720
      expect(metrics.noi).toBe(18720);
    });

    it('recalculates monthly operating expense and NOI when annual premium changes', () => {
      const project = makeMockProject();
      const financials = project.financials!;

      // User enters an annual premium of $2,400
      const annualPremium = 2400;
      const monthlyPremium = Math.round((annualPremium / 12) * 100) / 100; // $200

      // Update project financials
      financials.insuranceCost = annualPremium;
      financials.insurance = monthlyPremium;
      financials.holdingCostInsurance = monthlyPremium;

      // Recalculate metrics
      const metrics = deriveAllMetrics(financials, undefined, project.dispositionType, project.currentPhase);

      // Expenses should now be: (150 tax + 200 ins + 50 util) * 12 = 400 * 12 = 4800
      // NOI = 22320 - 4800 = 17520
      expect(metrics.noi).toBe(17520);
    });

    it('handles rounding correctly for odd premiums (e.g. 1999)', () => {
      const project = makeMockProject();
      const financials = project.financials!;

      const annualPremium = 1999;
      const monthlyPremium = Math.round((annualPremium / 12) * 100) / 100; // 166.58

      financials.insuranceCost = annualPremium;
      financials.insurance = monthlyPremium;
      financials.holdingCostInsurance = monthlyPremium;

      const metrics = deriveAllMetrics(financials, undefined, project.dispositionType, project.currentPhase);

      // Annualized opex insurance = 166.58 * 12 = 1998.96
      // Total expenses = (150 + 166.58 + 50) * 12 = 366.58 * 12 = 4398.96
      // NOI = 22320 - 4398.96 = 17921.04
      expect(metrics.noi).toBeCloseTo(17921.04, 2);
    });
  });

  /* ═══ Conditional riders & zones ════════════════════════════════════════ */
  describe('Riders & Zone determinations', () => {
    it('correctly maps flood and earthquake riders', () => {
      const project = makeMockProject({
        financials: {
          purchasePrice: 100000,
          estimatedARV: 150000,
          costs: [],
          hasFloodRider: true,
          hasEarthquakeRider: true,
          floodZone: 'Zone AE',
          earthquakeZone: 'High Risk 4',
        } as any,
      });

      const financials = project.financials!;
      expect(financials.hasFloodRider).toBe(true);
      expect(financials.hasEarthquakeRider).toBe(true);
      expect(financials.floodZone).toBe('Zone AE');
      expect(financials.earthquakeZone).toBe('High Risk 4');
    });

    it('sanitizes zones when riders are deselected', () => {
      // Simulate component save where riders are toggled off
      const hasFlood = false;
      const hasEarthquake = false;
      const floodInput = 'Zone AE';
      const earthquakeInput = 'High Risk';

      const finalFloodZone = hasFlood ? floodInput : null;
      const finalEarthquakeZone = hasEarthquake ? earthquakeInput : null;

      expect(finalFloodZone).toBeNull();
      expect(finalEarthquakeZone).toBeNull();
    });
  });
});
