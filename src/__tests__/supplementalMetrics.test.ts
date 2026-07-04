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
} from '../lib/metrics/computeSupplemental';

describe('Supplemental Metrics Gating and Calculation Logic', () => {
  const baseProject = {
    id: 'test-project',
    currentPhase: 3, // Hold
    strategyType: 'Rent',
    numberOfUnits: 2,
    financials: {
      purchasePrice: 500000,
      estimatedCurrentValue: 500000,
      loanAmount: 375000, // 75% LTV
      loanInterestRate: 6.0,
      loanTermYears: 30,
      monthlyGrossRent: 4000,
      monthlyMaintenanceReserve: 150,
      capitalReserves: 3000, // 20 months
      numberOfUnits: 2,
      tenantTurnoverRate: 10,
      leaseRenewalRate: 90,
      daysOnMarket: 30,
      rehabBudget: 50000,
      rehabActual: 55000, // +10% variance
    },
  };

  describe('LTV', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeLTVMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBe(75);
      expect(res.state).toBe('live');
    });

    it('returns notApplicable when not in allowed phase', () => {
      const res = computeLTVMetric({ ...baseProject, currentPhase: 1 });
      expect(res.state).toBe('n/a');
    });
  });

  describe('Debt Yield', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeDebtYieldMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBeGreaterThan(0);
      expect(res.state).toBe('live');
    });
  });

  describe('Equity Multiple', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeEquityMultipleMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBeGreaterThan(0);
      expect(res.state).toBe('live');
    });
  });

  describe('Break-Even Occupancy', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeBreakEvenOccupancyMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBeGreaterThan(0);
      expect(res.state).toBe('live');
    });
  });

  describe('Capital Reserves Months', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeCapitalReservesMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBe(20);
      expect(res.state).toBe('live');
    });
  });

  describe('Payback Period', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computePaybackPeriodMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBeGreaterThan(0);
      expect(res.state).toBe('live');
    });
  });

  describe('Tenant Turnover Rate', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeTenantTurnoverMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBe(10);
      expect(res.state).toBe('live');
    });
  });

  describe('Lease Renewal Rate', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeLeaseRenewalMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBe(90);
      expect(res.state).toBe('live');
    });
  });

  describe('Maintenance Cost Per Unit', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeMaintenanceCostPerUnitMetric({ ...baseProject, currentPhase: 3 });
      expect(res.value).toBe(900); // 150 * 12 / 2
      expect(res.state).toBe('live');
    });
  });

  describe('DOM', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeDOMMetric({ ...baseProject, currentPhase: 4 });
      expect(res.value).toBe(30);
      expect(res.state).toBe('realized');
    });
  });

  describe('Budget Variance', () => {
    it('returns correct value when in allowed phase', () => {
      const res = computeBudgetVarianceMetric({ ...baseProject, currentPhase: 1 });
      expect(res.value).toBe(10);
      expect(res.state).toBe('projected');
    });
  });
});
