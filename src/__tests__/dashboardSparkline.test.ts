/**
 * Unit tests for buildSparklineMetric (dashboard route).
 *
 * Verifies the Honesty Rule fix: no synthetic trend points are ever
 * fabricated, and the insufficientData flag is set correctly.
 *
 * State 1 — sparse (< 2 real periods): insufficientData: true, delta: 0
 * State 2 — sufficient (≥ 2 real periods): real delta, insufficientData: false
 */

import { buildSparklineMetric } from '../app/api/dashboard/route';

// NOI sum function mirrors the route: (noi / 12) per snapshot
const noiSumFn = (s: any) => (s.noi || 0) / 12;

// Cash-flow sum function mirrors the route
const cfSumFn = (s: any) => s.monthlyCashFlow || 0;

describe('buildSparklineMetric — Honesty Rule', () => {
  describe('State 1: no real snapshots (brand-new account)', () => {
    it('sets insufficientData: true', () => {
      const result = buildSparklineMetric([], 1200, noiSumFn);
      expect(result.insufficientData).toBe(true);
    });

    it('returns an empty sparkline — no fabricated points', () => {
      const result = buildSparklineMetric([], 1200, noiSumFn);
      expect(result.sparkline).toHaveLength(0);
      // Confirm the old fabricated 6-point array is not present
      expect(result.sparkline).not.toHaveLength(6);
    });

    it('sets delta to 0', () => {
      const result = buildSparklineMetric([], 1200, noiSumFn);
      expect(result.delta).toBe(0);
    });

    it('sets changePercent to 0', () => {
      const result = buildSparklineMetric([], 1200, noiSumFn);
      expect(result.changePercent).toBe(0);
    });
  });

  describe('State 1: exactly one real period', () => {
    const oneSnap = [{ period: '2026-05', noi: 14400 }];

    it('sets insufficientData: true (single period — no prior to compare)', () => {
      const result = buildSparklineMetric(oneSnap, 1200, noiSumFn);
      expect(result.insufficientData).toBe(true);
    });

    it('sparkline has exactly 1 real point, not 6 fabricated ones', () => {
      const result = buildSparklineMetric(oneSnap, 1200, noiSumFn);
      expect(result.sparkline).toHaveLength(1);
      expect(result.sparkline[0]).toBe(Math.round(14400 / 12)); // = 1200
    });

    it('delta is 0', () => {
      const result = buildSparklineMetric(oneSnap, 1200, noiSumFn);
      expect(result.delta).toBe(0);
    });
  });

  describe('State 2: two real periods (sufficient history)', () => {
    const twoSnaps = [
      { period: '2026-04', noi: 12000 },  // prev period: 1000/mo
      { period: '2026-05', noi: 14400 },  // latest period: 1200/mo
    ];
    const currentNOI = 1200;

    it('sets insufficientData: false', () => {
      const result = buildSparklineMetric(twoSnaps, currentNOI, noiSumFn);
      expect(result.insufficientData).toBe(false);
    });

    it('sparkline has exactly 2 real points with correct values', () => {
      const result = buildSparklineMetric(twoSnaps, currentNOI, noiSumFn);
      expect(result.sparkline).toHaveLength(2);
      expect(result.sparkline[0]).toBe(1000); // 12000 / 12
      expect(result.sparkline[1]).toBe(1200); // 14400 / 12
    });

    it('delta is computed from real prior period (no synthetic fallback)', () => {
      const result = buildSparklineMetric(twoSnaps, currentNOI, noiSumFn);
      // currentNOI (1200) - prevSparklinePoint (1000) = 200
      expect(result.delta).toBe(200);
    });

    it('changePercent is computed correctly', () => {
      const result = buildSparklineMetric(twoSnaps, currentNOI, noiSumFn);
      // 200 / 1000 * 100 = 20%
      expect(result.changePercent).toBe(20);
    });
  });

  describe('State 2: six real periods', () => {
    const sixSnaps = [
      { period: '2025-12', monthlyCashFlow: 500 },
      { period: '2026-01', monthlyCashFlow: 520 },
      { period: '2026-02', monthlyCashFlow: 510 },
      { period: '2026-03', monthlyCashFlow: 530 },
      { period: '2026-04', monthlyCashFlow: 540 },
      { period: '2026-05', monthlyCashFlow: 560 },
    ];
    const currentCF = 560;

    it('preserves all 6 real points in sparkline order', () => {
      const result = buildSparklineMetric(sixSnaps, currentCF, cfSumFn);
      expect(result.sparkline).toHaveLength(6);
      expect(result.sparkline).toEqual([500, 520, 510, 530, 540, 560]);
    });

    it('delta is current minus the 5th point (not fabricated)', () => {
      const result = buildSparklineMetric(sixSnaps, currentCF, cfSumFn);
      // currentCF (560) - prevPoint (540) = 20
      expect(result.delta).toBe(20);
    });

    it('insufficientData is false', () => {
      const result = buildSparklineMetric(sixSnaps, currentCF, cfSumFn);
      expect(result.insufficientData).toBe(false);
    });
  });

  describe('multi-snapshot periods (multiple properties per period)', () => {
    it('sums all snapshots within the same period', () => {
      const snaps = [
        { period: '2026-04', noi: 6000 },
        { period: '2026-04', noi: 6000 }, // second property, same period
        { period: '2026-05', noi: 7200 },
      ];
      const result = buildSparklineMetric(snaps, 600, noiSumFn);
      expect(result.sparkline[0]).toBe(1000); // (6000+6000)/12 = 1000
      expect(result.sparkline[1]).toBe(600);  // 7200/12 = 600
    });
  });
});
