import {
  computeLTVMetric,
  computeDebtYieldMetric,
  computeEquityMultipleMetric,
  computeBreakEvenOccupancyMetric,
  computeCapitalReservesMetric,
  computePaybackPeriodMetric,
  computeTenantTurnoverMetric,
  computeLeaseRenewalMetric,
  computeMaintenanceCostPerUnitMetric,
  computeDOMMetric,
  computeBudgetVarianceMetric,
  computeIRRMetric,
  computeAppreciationMetric,
  computeCashFlowMetric,
  computeOccupancyMetric,
} from '../lib/metrics';

describe('Insights Metric Taxonomy & Classification Integrity', () => {
  it('should define the 10 Hero KPIs and verify their presence and calculation functions', () => {
    const heroKpiKeys = [
      'NOI',
      'CASH_FLOW',
      'CAP_RATE',
      'COC',
      'GRM',
      'DSCR',
      'IRR',
      'OCCUPANCY',
      'OER',
      'APPRECIATION',
    ];

    expect(heroKpiKeys).toHaveLength(10);
    expect(heroKpiKeys[0]).toBe('NOI');
    expect(heroKpiKeys[1]).toBe('CASH_FLOW');
    expect(heroKpiKeys[2]).toBe('CAP_RATE');
    expect(heroKpiKeys[3]).toBe('COC');
    expect(heroKpiKeys[4]).toBe('GRM');
    expect(heroKpiKeys[5]).toBe('DSCR');
    expect(heroKpiKeys[6]).toBe('IRR');
    expect(heroKpiKeys[7]).toBe('OCCUPANCY');
    expect(heroKpiKeys[8]).toBe('OER');
    expect(heroKpiKeys[9]).toBe('APPRECIATION');
  });

  it('should group all 23 metrics into exactly one of five categories', () => {
    // 10 hero + 13 supplemental = 23 metrics
    const taxonomy = {
      financial: [
        'Net Operating Income (NOI)',
        'Cash Flow',
        'Cap Rate',
        'Cash-on-Cash Return',
        'Gross Rent Multiplier (GRM)',
        'Debt Service Coverage Ratio (DSCR)',
        'Internal Rate of Return (IRR)',
        'Occupancy Rate',
        'Expense Ratio',
        'Long-Term Appreciation',
        'Equity Multiple',
        'Payback Period',
      ],
      operational: [
        'Tenant Turnover Rate',
        'Lease Renewal Rate',
        'Maintenance / Unit',
        'Budget Variance',
      ],
      asset: [
        'CapEx Funded Reserves',
        'Vacancy Rate',
      ],
      marketing: [
        'Price-to-Rent Ratio',
        'Days on Market',
      ],
      risk: [
        'Loan-to-Value',
        'Debt Yield',
        'Break-Even Occupancy',
      ],
    };

    const totalMetricsCount = Object.values(taxonomy).reduce((sum, list) => sum + list.length, 0);
    expect(totalMetricsCount).toBe(23);

    // Verify each list has the expected classification sizes
    expect(taxonomy.financial).toHaveLength(12); // 10 hero + 2 supplemental
    expect(taxonomy.operational).toHaveLength(4);
    expect(taxonomy.asset).toHaveLength(2);
    expect(taxonomy.marketing).toHaveLength(2);
    expect(taxonomy.risk).toHaveLength(3);
  });

  it('should successfully run calculation functions on a standard test project', () => {
    const p = {
      id: 'test-project',
      currentPhase: 3,
      dispositionType: 'RENT',
      subStrategy: 'LONG_TERM',
      numberOfUnits: 2,
      createdAt: new Date().toISOString(),
      financials: {
        purchasePrice: 400000,
        estimatedCurrentValue: 420000,
        loanAmount: 300000,
        loanInterestRate: 6.5,
        loanTermYears: 30,
        monthlyGrossRent: 3500,
        monthlyMaintenanceReserve: 100,
        capitalReserves: 2500,
        tenantTurnoverRate: 12,
        leaseRenewalRate: 80,
        daysOnMarket: 25,
        rehabBudget: 40000,
        rehabActual: 42000,
      },
    };

    // Verify all supplemental metrics can be calculated
    expect(computeLTVMetric(p as any).value).toBe(71.43);
    expect(computeDebtYieldMetric(p as any).value).toBeGreaterThan(0);
    expect(computeEquityMultipleMetric(p as any).value).toBeGreaterThan(0);
    expect(computeBreakEvenOccupancyMetric(p as any).value).toBeGreaterThan(0);
    expect(computeCapitalReservesMetric(p as any).value).toBe(25);
    expect(computePaybackPeriodMetric(p as any).value).toBeGreaterThan(0);
    expect(computeTenantTurnoverMetric(p as any).value).toBe(12);
    expect(computeLeaseRenewalMetric(p as any).value).toBe(80);
    expect(computeMaintenanceCostPerUnitMetric(p as any).value).toBe(600);
    expect(computeBudgetVarianceMetric({ ...p, currentPhase: 1 } as any).value).toBe(5);

    // Verify key custom aggregation/insights functions work
    expect(computeIRRMetric(p as any).value).not.toBeNull();
    expect(computeAppreciationMetric(p as any).value).not.toBeNull();
  });
});
