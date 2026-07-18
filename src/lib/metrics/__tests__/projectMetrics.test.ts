import { deriveAllProjectMetrics } from '../reiMetrics';
import { Project } from '@/types/schema';

describe('deriveAllProjectMetrics', () => {
  const mockProject: Project = {
    id: 'test-project-1',
    propertyName: '123 Main St',
    address: '123 Main St, Anytown USA',
    organizationId: 'org-1',
    status: 'acquisition',
    phaseStatus: 'Phase 1: Acquisition',
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    assetClass: 'Residential',
    createdAt: new Date(), // Set to now so elapsed is 0, falling back to estimatedTimelineDays (90)
    updatedAt: new Date(),
    ownerUid: 'user-1',
    currentPhase: 1,
    members: {
      'user-1': { role: 'Lead Investor' } as any
    },
    financials: {
      purchasePrice: 200000,
      estimatedARV: 250000,
      loanAmount: 150000,
      loanInterestRate: 6,
      loanTermYears: 30,
      loanOriginationPoints: 2, // origination point closing costs: 150000 * 2% = 3000
      estimatedTimelineDays: 90,
      buyersAgentCommission: 3,
      sellersAgentCommission: 3,
      finalClosingCosts: 2000,
      monthlyGrossRent: 2000,
      holdingCostTaxes: 150,
      holdingCostInsurance: 100,
      holdingCostUtilities: 50,
      vacancyRatePercent: 5,
      costs: [],
    }
  };

  test('calculates correct metrics for standard project', () => {
    const metrics = deriveAllProjectMetrics(mockProject, 0, []);

    expect(metrics.purchasePrice).toBe(200000);
    expect(metrics.closingCostsBuy).toBe(3000); // 150k loan * 2% points
    expect(metrics.closingCostsSell).toBe(17000); // 250k sale price * 6% commission + 2k final closing costs
    // Daily burn: (750 interest + 100 ins + 150 tax + 50 util) = 1050 / month -> 35 / day
    // For 90 days hold: 35 * 90 = 3150
    expect(metrics.holdingCosts).toBeCloseTo(3150, 0);
    expect(metrics.salePrice).toBe(250000);
    expect(metrics.renovationCosts).toBe(0);
    
    // totalInvestment = 200000 (purchase) + 3000 (closing buy) + 17000 (closing sell) + 20000 (renovation=0) + 3150 (holding) = 223150
    // netProfit = 250000 - 223150 = 26850
    expect(metrics.netProfit).toBeGreaterThan(20000);
    expect(metrics.roi).toBeGreaterThan(10);
    expect(metrics.holdDays).toBe(90);
  });

  test('includes renovation costs from ledger items', () => {
    const ledgerItems = [
      { id: 'l1', projectId: 'test-project-1', description: 'Kitchen rehab', amount: 15000, status: 'Approved', category: 'renovation', date: new Date() },
      { id: 'l2', projectId: 'test-project-1', description: 'Plumbing', amount: 5000, status: 'Approved', category: 'renovation', date: new Date() },
      { id: 'l3', projectId: 'test-project-1', description: 'Roof repair', amount: 8000, status: 'Pending', category: 'renovation', date: new Date() }, // ignored because pending
    ] as any[];

    const metrics = deriveAllProjectMetrics(mockProject, 0, ledgerItems);

    expect(metrics.renovationCosts).toBe(20000); // 15000 + 5000
  });

  test('supports what-if offset months for holding costs simulation', () => {
    const metricsNormal = deriveAllProjectMetrics(mockProject, 0, []);
    const metricsOffset = deriveAllProjectMetrics(mockProject, 3, []); // offset by 3 months (90 days)

    expect(metricsOffset.holdDays).toBe(90); // holdDays of document doesn't change
    expect(metricsOffset.holdingCosts).toBeGreaterThan(metricsNormal.holdingCosts);
  });
});
