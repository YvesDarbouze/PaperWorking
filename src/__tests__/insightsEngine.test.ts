import { Project, PropertyMetricSnapshot } from '@/types/schema';
import { evaluateInsights, BENCHMARKS } from '@/lib/insights/engine';

// Mock firebase config to avoid network calls during tests
jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

describe('Deterministic Insight Engine Rules', () => {
  // 1. Healthy Project setup
  const healthyProject = {
    id: 'healthy-proj',
    propertyName: 'Palm Garden Villas',
    address: '456 Palms Ave, Miami FL',
    currentPhase: 3, // Hold
    status: 'hold',
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    createdAt: new Date('2025-01-01'),
    financials: {
      purchasePrice: 500000,
      estimatedCurrentValue: 550000,
      loanAmount: 375000,
      loanInterestRate: 6.0,
      loanTermYears: 30,
      actualRentalIncome: 4500,        // actual rent in Phase 3 Hold
      projectedMonthlyRent: 4000,      // pro-forma rent in Phase 1
      holdingCostTaxes: 300,
      holdingCostInsurance: 100,
      vacancyRatePercent: 5,         // Good occupancy
      propertyManagementFeePercent: 8,
      monthlyMaintenanceReserve: 200,
      monthlyHOA: 0,
      numberOfUnits: 10,
      occupiedUnits: 9,              // 90% occupancy
    }
  } as unknown as Project;

  // 2. Underperforming Project setup
  const underperformingProject = {
    id: 'poor-proj',
    propertyName: 'Oakwood Apartments',
    address: '789 Oak St, Atlanta GA',
    currentPhase: 3, // Hold
    status: 'hold',
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    createdAt: new Date('2025-01-01'),
    financials: {
      purchasePrice: 400000,
      estimatedCurrentValue: 380000, // Negative appreciation / value decline
      loanAmount: 320000,
      loanInterestRate: 7.5,         // High interest burden
      loanTermYears: 30,
      actualRentalIncome: 2200,        // actual rent in Phase 3 Hold
      projectedMonthlyRent: 3500,      // pro-forma rent in Phase 1
      holdingCostTaxes: 400,
      holdingCostInsurance: 150,
      vacancyRatePercent: 25,        // High vacancy rate
      propertyManagementFeePercent: 10,
      monthlyMaintenanceReserve: 300,
      monthlyHOA: 100,
      numberOfUnits: 4,
      occupiedUnits: 2,              // 50% occupancy
    }
  } as unknown as Project;

  // 3. Newly Acquired Project in Acquisition (Phase 1)
  const lockedProject = {
    id: 'locked-proj',
    propertyName: 'Sunset Heights Duplex',
    address: '101 Sunset Rd, Phoenix AZ',
    currentPhase: 1, // Sourcing/Acquisition phase
    status: 'acquisition',
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    createdAt: new Date(),
    financials: {
      purchasePrice: 300000,
      estimatedARV: 350000,
      projectedMonthlyRent: 2500,
    }
  } as unknown as Project;

  // Time-series snapshots
  const mockSnapshots: PropertyMetricSnapshot[] = [
    // Healthy Project Snapshots (Stable / Improving trends)
    {
      id: 'healthy-proj_2026-01',
      projectId: 'healthy-proj',
      organizationId: 'org-test',
      period: '2026-01',
      periodType: 'monthly',
      date: new Date('2026-01-01'),
      noi: 35000,
      annualCashFlow: 12000,
      monthlyCashFlow: 1000,
      capRate: 7.0,
      cashOnCashReturn: 9.0,
      dscr: 1.35,
      occupancyRate: 88.0, // Rising
      oer: 38.0,
      appreciation: 4.0,
      propertyValue: 540000,
      totalCashInvested: 135000,
    } as any,
    {
      id: 'healthy-proj_2026-02',
      projectId: 'healthy-proj',
      organizationId: 'org-test',
      period: '2026-02',
      periodType: 'monthly',
      date: new Date('2026-02-01'),
      noi: 36500,
      annualCashFlow: 13500,
      monthlyCashFlow: 1125,
      capRate: 7.3,
      cashOnCashReturn: 10.0,
      dscr: 1.40,
      occupancyRate: 90.0, // Rising
      oer: 37.0,
      appreciation: 4.2,
      propertyValue: 545000,
      totalCashInvested: 135000,
    } as any,
    {
      id: 'healthy-proj_2026-03',
      projectId: 'healthy-proj',
      organizationId: 'org-test',
      period: '2026-03',
      periodType: 'monthly',
      date: new Date('2026-03-01'),
      noi: 38000,
      annualCashFlow: 15000,
      monthlyCashFlow: 1250,
      capRate: 7.6,
      cashOnCashReturn: 11.1,
      dscr: 1.45,
      occupancyRate: 92.0, // Monotonically rising occupancy (improving trend!)
      oer: 36.0,
      appreciation: 4.5,
      propertyValue: 550000,
      totalCashInvested: 135000,
    } as any,

    // Poor Project Snapshots (Deteriorating trends)
    {
      id: 'poor-proj_2026-01',
      projectId: 'poor-proj',
      organizationId: 'org-test',
      period: '2026-01',
      periodType: 'monthly',
      date: new Date('2026-01-01'),
      noi: 18000,
      annualCashFlow: 2000,
      monthlyCashFlow: 166,
      capRate: 4.5,
      cashOnCashReturn: 2.0,
      dscr: 1.08,
      occupancyRate: 70.0, // Falling
      oer: 48.0,           // Rising
      appreciation: 1.0,
      propertyValue: 395000,
      totalCashInvested: 100000,
    } as any,
    {
      id: 'poor-proj_2026-02',
      projectId: 'poor-proj',
      organizationId: 'org-test',
      period: '2026-02',
      periodType: 'monthly',
      date: new Date('2026-02-01'),
      noi: 15000,
      annualCashFlow: -1000, // Turned negative
      monthlyCashFlow: -83,
      capRate: 3.75,
      cashOnCashReturn: -1.0,
      dscr: 0.90,            // Below 1.0 (Critical)
      occupancyRate: 60.0,   // Falling
      oer: 52.0,             // Rising
      appreciation: -1.5,    // Negative appreciation
      propertyValue: 388000,
      totalCashInvested: 100000,
    } as any,
    {
      id: 'poor-proj_2026-03',
      projectId: 'poor-proj',
      organizationId: 'org-test',
      period: '2026-03',
      periodType: 'monthly',
      date: new Date('2026-03-01'),
      noi: 12000,
      annualCashFlow: -4000, // Deteriorating consecutively
      monthlyCashFlow: -333,
      capRate: 3.0,
      cashOnCashReturn: -4.0,
      dscr: 0.72,
      occupancyRate: 50.0,   // Monotonically falling occupancy (deteriorating trend!)
      oer: 58.0,             // Monotonically rising OER (deteriorating trend!)
      appreciation: -3.0,
      propertyValue: 380000,
      totalCashInvested: 100000,
    } as any,
  ];

  it('correctly locks metrics for newly-acquired project based on current phase', () => {
    const insights = evaluateInsights([lockedProject], []);
    
    // NOI, Cash Flow, Occupancy, Expense Ratio require Phase 3 (Hold)
    // DSCR, Cash-on-Cash require Phase 2 (Fund)
    // IRR requires Phase 4 (Exit)
    const locks = insights.filter(i => i.kind === 'locked');
    expect(locks.length).toBe(7); // NOI, Cash Flow, DSCR, CoC, Occupancy, OER, IRR

    const dscrLock = locks.find(i => i.metric === 'DSCR');
    expect(dscrLock).toBeDefined();
    expect(dscrLock?.detail).toContain('unlocks in the Fund phase. Current phase is Acquisition.');
  });

  it('identifies benchmark breaches for healthy and underperforming projects', () => {
    const insights = evaluateInsights([healthyProject, underperformingProject], []);

    // Underperforming project should trigger several risk/warning benchmark breaches:
    // - DSCR < 1.0 (Risk)
    // - CoC < 0% (Risk)
    // - Occupancy < 80% (Risk, because occupiedUnits/numberOfUnits = 50%)
    // - OER > 55% (Risk)
    // - Appreciation < 0 (Risk)
    const breaches = insights.filter(i => i.kind === 'benchmark');

    const poorDscr = breaches.find(b => b.projectId === 'poor-proj' && b.metric === 'DSCR');
    expect(poorDscr).toBeDefined();
    expect(poorDscr?.severity).toBe('risk');
    expect(poorDscr?.headline).toBe('Critical Debt Coverage');

    const poorCoc = breaches.find(b => b.projectId === 'poor-proj' && b.metric === 'COC');
    expect(poorCoc).toBeDefined();
    expect(poorCoc?.severity).toBe('risk');

    const healthyDscr = breaches.find(b => b.projectId === 'healthy-proj' && b.metric === 'DSCR');
    expect(healthyDscr).toBeDefined();
    expect(healthyDscr?.severity).toBe('good');
  });

  it('detects pro-forma thesis drift (both outperforming and deteriorating)', () => {
    const insights = evaluateInsights([healthyProject, underperformingProject], []);
    const drifts = insights.filter(i => i.kind === 'drift');

    // healthyProject has actual rent = 4500 vs projected = 4000. This is outperforming.
    const goodRentDrift = drifts.find(d => d.projectId === 'healthy-proj' && d.metric === 'NOI');
    expect(goodRentDrift).toBeDefined();
    expect(goodRentDrift?.severity).toBe('good');
    expect(goodRentDrift?.headline).toBe('NOI Beating Thesis');

    // underperformingProject has actual rent = 2200 vs projected = 3500. This is a severe deterioration.
    const badNoiDrift = drifts.find(d => d.projectId === 'poor-proj' && d.metric === 'NOI');
    expect(badNoiDrift).toBeDefined();
    expect(badNoiDrift?.severity).toBe('risk');
    expect(badNoiDrift?.headline).toBe('NOI Underperforming Thesis');
  });

  it('detects consecutive historical trends from snapshots', () => {
    const insights = evaluateInsights([healthyProject, underperformingProject], mockSnapshots);
    const trends = insights.filter(i => i.kind === 'trend');

    // healthy-proj has occupancy rising consecutively: 88 -> 90 -> 92
    const healthyOccupancy = trends.find(t => t.projectId === 'healthy-proj' && t.metric === 'OCCUPANCY');
    expect(healthyOccupancy).toBeDefined();
    expect(healthyOccupancy?.severity).toBe('good');
    expect(healthyOccupancy?.headline).toBe('Occupancy Improving');

    // poor-proj has occupancy falling consecutively: 70 -> 60 -> 50
    const poorOccupancy = trends.find(t => t.projectId === 'poor-proj' && t.metric === 'OCCUPANCY');
    expect(poorOccupancy).toBeDefined();
    expect(poorOccupancy?.severity).toBe('warning');
    expect(poorOccupancy?.headline).toBe('Occupancy Deteriorating');

    // poor-proj has cash flow decreasing consecutively: 2000 -> -1000 -> -4000
    const poorCashFlow = trends.find(t => t.projectId === 'poor-proj' && t.metric === 'CASH_FLOW');
    expect(poorCashFlow).toBeDefined();
    expect(poorCashFlow?.severity).toBe('risk'); // Turned negative
    expect(poorCashFlow?.headline).toBe('Cash Flow Turned Negative');
  });

  it('emits standout leaders and drags at portfolio level', () => {
    const insights = evaluateInsights([healthyProject, underperformingProject], []);
    const standouts = insights.filter(i => i.kind === 'standout');

    expect(standouts.length).toBeGreaterThan(0);
    
    // Highest CoC should be Palm Garden Villas
    const topCoc = standouts.find(s => s.id === 'portfolio_highest_coc');
    expect(topCoc).toBeDefined();
    expect(topCoc?.detail).toContain('Palm Garden Villas');
    expect(topCoc?.severity).toBe('good');

    // Yield drag should be Oakwood Apartments
    const dragCoc = standouts.find(s => s.id === 'portfolio_lowest_coc_drag');
    expect(dragCoc).toBeDefined();
    expect(dragCoc?.detail).toContain('Oakwood Apartments');
    expect(dragCoc?.severity).toBe('risk');
  });
});
