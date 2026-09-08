import { describe, expect, it } from '@jest/globals';
import {
  computeAssetDepreciationSchedule,
  computeMidMonthInServiceFraction,
  computeMultiAssetDepreciationSchedule,
  resolveImprovementBasis,
  type DepreciableAsset,
} from '../depreciation-engine.js';

describe('Audit Suite: IRS Straight-Line MACRS Depreciation Engine & Golden Values', () => {
  /**
   * GOLDEN CASE 1: Residential 27.5-Year Straight-Line
   * Total Basis: $1,250,000
   * Land Value: $250,000 (20%)
   * Depreciable Improvement Basis: $1,000,000 (80%)
   * Full-Year Annual Depreciation:
   *   $1,000,000 / 27.5 = $36,363.636... -> rounded to $36,363.64
   *
   * Mid-Month Convention in Year 1 (Placed in Service: January, month 1):
   *   Active months = 12 - 1 + 0.5 = 11.5 months
   *   Fraction of year = 11.5 / 12 = 0.958333...
   *   Year 1 Depreciation = ($1,000,000 / 27.5) * (11.5 / 12)
   *                       = 36,363.636... * 0.958333...
   *                       = $34,848.4848... -> $34,848.48
   */
  it('computes canonical residential 27.5-year golden values with January mid-month convention', () => {
    const asset: DepreciableAsset = {
      id: 'prop-res-1',
      name: 'Oakwood Apartments',
      assetClass: 'residential_27_5',
      totalCostBasis: 1250000,
      landValue: 250000,
      inServiceDate: '2024-01-15',
    };

    const res = computeAssetDepreciationSchedule(asset, 5, 2024);
    expect(res.valid).toBe(true);
    expect(res.schedule).toBeDefined();

    const sched = res.schedule!;
    expect(sched.totalBasis).toBe(1250000);
    expect(sched.landValue).toBe(250000);
    expect(sched.improvementBasis).toBe(1000000);
    expect(sched.recoveryPeriodYears).toBe(27.5);
    expect(sched.annualStraightLineFullYear).toBe(36363.64);

    // Year 1 (2024, Jan mid-month -> 11.5 months)
    expect(sched.schedule[0].year).toBe(2024);
    expect(sched.schedule[0].activeMonths).toBe(11.5);
    expect(sched.schedule[0].isMidMonthYear).toBe(true);
    expect(sched.schedule[0].annualDepreciation).toBe(34848.48);
    expect(sched.schedule[0].accumulatedDepreciation).toBe(34848.48);
    expect(sched.schedule[0].endingBasis).toBe(965151.52);

    // Year 2 (2025, full year -> 12 months)
    expect(sched.schedule[1].year).toBe(2025);
    expect(sched.schedule[1].activeMonths).toBe(12);
    expect(sched.schedule[1].isMidMonthYear).toBe(false);
    expect(sched.schedule[1].annualDepreciation).toBe(36363.64);
    expect(sched.schedule[1].accumulatedDepreciation).toBe(71212.12);
    expect(sched.schedule[1].endingBasis).toBe(928787.88);
  });

  /**
   * GOLDEN CASE 2: July Placed-in-Service (Month 7 Mid-Month)
   * Improvement Basis: $1,000,000
   * Placed in Service: July 2024 (month 7)
   * Active months = 12 - 7 + 0.5 = 5.5 months
   * Fraction of year = 5.5 / 12 = 0.458333...
   * Year 1 Depreciation = ($1,000,000 / 27.5) * (5.5 / 12)
   *                     = 36,363.636... * 0.458333...
   *                     = $16,666.666... -> $16,666.67
   */
  it('computes July mid-month placed-in-service convention accurately', () => {
    const asset: DepreciableAsset = {
      id: 'prop-res-july',
      name: 'Summer Manor',
      assetClass: 'residential_27_5',
      totalCostBasis: 1000000,
      improvementBasis: 1000000,
      landValue: 0,
      inServiceDate: '2024-07-01',
    };

    const res = computeAssetDepreciationSchedule(asset, 3, 2024);
    expect(res.valid).toBe(true);
    expect(res.schedule!.schedule[0].activeMonths).toBe(5.5);
    expect(res.schedule!.schedule[0].annualDepreciation).toBe(16666.67);
  });

  /**
   * GOLDEN CASE 3: Commercial 39-Year Nonresidential Property
   * Total Basis: $4,500,000
   * Land Value: $600,000
   * Depreciable Improvement Basis: $3,900,000
   * Recovery Period: 39.0 years
   * Full-Year Annual Depreciation = $3,900,000 / 39 = $100,000.00 / yr
   * In-Service: March 2024 (month 3)
   * Active months = 12 - 3 + 0.5 = 9.5 months
   * Year 1 = $100,000 * (9.5 / 12) = $79,166.67
   */
  it('computes commercial 39-year MACRS straight-line depreciation', () => {
    const asset: DepreciableAsset = {
      id: 'comm-1',
      name: 'Midtown Plaza Commercial',
      assetClass: 'commercial_39',
      totalCostBasis: 4500000,
      landValue: 600000,
      inServiceDate: '2024-03-10',
    };

    const res = computeAssetDepreciationSchedule(asset, 4, 2024);
    expect(res.valid).toBe(true);
    const sched = res.schedule!;
    expect(sched.recoveryPeriodYears).toBe(39);
    expect(sched.annualStraightLineFullYear).toBe(100000);
    expect(sched.schedule[0].activeMonths).toBe(9.5);
    expect(sched.schedule[0].annualDepreciation).toBe(79166.67);
    expect(sched.schedule[1].annualDepreciation).toBe(100000);
    expect(sched.schedule[1].accumulatedDepreciation).toBe(179166.67);
  });

  /**
   * GOLDEN CASE 4: Multi-Asset Schedule (Building + Separate Capital Improvement)
   * Asset 1: Residential building placed in service Jan 2024 ($1,000,000 improvement basis)
   *   Yr 1: $34,848.48, Yr 2: $36,363.64
   * Asset 2: HVAC Replacement placed in service Jan 2025 (Year 2) ($75,000 basis, 15-year recovery)
   *   Full year = $75,000 / 15 = $5,000/yr
   *   Yr 1 (2024 for portfolio): $0 (not in service yet)
   *   Yr 2 (2025): Jan mid-month -> $5,000 * (11.5 / 12) = $4,791.67
   * Portfolio Total Year 2 (2025):
   *   $36,363.64 (bldg) + $4,791.67 (HVAC) = $41,155.31
   */
  it('aggregates multi-asset depreciation schedule with distinct in-service dates', () => {
    const building: DepreciableAsset = {
      id: 'bldg-1',
      name: 'Building Structure',
      assetClass: 'residential_27_5',
      totalCostBasis: 1250000,
      landValue: 250000,
      inServiceDate: '2024-01-01',
    };

    const hvac: DepreciableAsset = {
      id: 'capex-hvac',
      name: 'HVAC Modernization',
      assetClass: 'improvement_15',
      totalCostBasis: 75000,
      improvementBasis: 75000,
      landValue: 0,
      inServiceDate: '2025-01-15',
    };

    const summary = computeMultiAssetDepreciationSchedule([building, hvac], 3, 2024);
    expect(summary.assets.length).toBe(2);

    // Year 1 (2024): Only building
    expect(summary.annualPortfolioTotals[0].year).toBe(2024);
    expect(summary.annualPortfolioTotals[0].annualDepreciation).toBe(34848.48);

    // Year 2 (2025): Building full year ($36,363.64) + HVAC Year 1 ($4,791.67) = $41,155.31
    expect(summary.annualPortfolioTotals[1].year).toBe(2025);
    expect(summary.annualPortfolioTotals[1].annualDepreciation).toBe(41155.31);
  });

  it('rejects asset missing both landValue and improvementBasis without fabricating splits', () => {
    const unallocatedAsset: DepreciableAsset = {
      id: 'prop-missing-split',
      name: 'Ambiguous Asset',
      assetClass: 'residential_27_5',
      totalCostBasis: 500000,
      inServiceDate: '2024-01-01',
      // No landValue, no improvementBasis
    };

    const basisCheck = resolveImprovementBasis(unallocatedAsset);
    expect(basisCheck.valid).toBe(false);
    expect(basisCheck.missingInputs).toContain('landValue');

    const scheduleRes = computeAssetDepreciationSchedule(unallocatedAsset);
    expect(scheduleRes.valid).toBe(false);
    expect(scheduleRes.missingInputs).toContain('landValue');
  });

  it('computes accurate mid-month in-service fractions across all 12 calendar months', () => {
    // January: 11.5 / 12
    expect(computeMidMonthInServiceFraction(1).activeMonths).toBe(11.5);
    // June: 12 - 6 + 0.5 = 6.5 / 12
    expect(computeMidMonthInServiceFraction(6).activeMonths).toBe(6.5);
    // December: 12 - 12 + 0.5 = 0.5 / 12
    expect(computeMidMonthInServiceFraction(12).activeMonths).toBe(0.5);
  });
});
