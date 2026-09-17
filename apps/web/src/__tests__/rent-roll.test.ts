import { describe, expect, it } from '@jest/globals';
import {
  buildProjectRentRollReport,
  computeRentRollSummary,
  type RentRollUnit,
} from '../../lib/reports/rent-roll.js';

describe('Audit Suite: Rent Roll & Tenant Ledger Aggregation Math', () => {
  const mockUnits: RentRollUnit[] = [
    {
      id: 'u-101',
      unitNumber: '101',
      tenantName: 'Sarah Connor',
      leaseStart: '2025-01-01',
      leaseEnd: '2025-12-31',
      monthlyMarketRent: 2200,
      monthlyLeasedRent: 2150,
      depositHeld: 2150,
      status: 'occupied',
      balanceDue: 0,
    },
    {
      id: 'u-102',
      unitNumber: '102',
      tenantName: 'John Doe',
      leaseStart: '2025-06-01',
      leaseEnd: '2026-05-31',
      monthlyMarketRent: 2200,
      monthlyLeasedRent: 2200,
      depositHeld: 2200,
      status: 'occupied',
      balanceDue: 0,
    },
    {
      id: 'u-103',
      unitNumber: '103',
      tenantName: null,
      leaseStart: null,
      leaseEnd: null,
      monthlyMarketRent: 2300,
      monthlyLeasedRent: 0,
      depositHeld: 0,
      status: 'vacant',
      balanceDue: 0,
    },
    {
      id: 'u-104',
      unitNumber: '104',
      tenantName: 'Marcus Wright',
      leaseStart: '2024-03-01',
      leaseEnd: '2025-02-28',
      monthlyMarketRent: 2100,
      monthlyLeasedRent: 2050,
      depositHeld: 2050,
      status: 'delinquent',
      balanceDue: 1025,
    },
  ];

  it('computes accurate occupancy % and leased rent to Gross Potential Rent (GPR)', () => {
    const summary = computeRentRollSummary(mockUnits);

    expect(summary.totalUnits).toBe(4);
    expect(summary.occupiedUnits).toBe(3); // 2 occupied + 1 delinquent
    expect(summary.vacantUnits).toBe(1);
    expect(summary.delinquentUnits).toBe(1);

    // Occupancy: 3 / 4 = 75.0%
    expect(summary.occupancyRatePct).toBe(75.0);

    // GPR: 2200 + 2200 + 2300 + 2100 = 8800/mo ($105,600/yr)
    expect(summary.grossPotentialRentMonthly).toBe(8800);
    expect(summary.grossPotentialRentAnnual).toBe(105600);

    // In-place Leased Rent: 2150 + 2200 + 0 + 2050 = 6400/mo ($76,800/yr)
    expect(summary.leasedRentMonthly).toBe(6400);
    expect(summary.leasedRentAnnual).toBe(76800);

    // Leased to GPR: 6400 / 8800 = 72.7%
    expect(summary.leasedToGprPct).toBe(72.7);

    // Total Deposits Held: 2150 + 2200 + 0 + 2050 = 6400
    expect(summary.totalDepositsHeld).toBe(6400);
    expect(summary.totalDelinquentBalance).toBe(1025);
  });

  it('handles project with no unit records by returning hasUnitData: false', () => {
    const report = buildProjectRentRollReport({
      id: 'proj-no-units',
      name: 'Unseeded Deal',
    });

    expect(report.hasUnitData).toBe(false);
    expect(report.units.length).toBe(0);
    expect(report.summary.occupancyRatePct).toBe(0);
  });
});
