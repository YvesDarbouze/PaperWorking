/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '../selectors';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { useProjectStore } from '@/store/projectStore';
import type { Project } from '@/types/schema';

// Mock the state variables that tests can mutate
let mockStoreState: {
  projects: Project[];
  projectsSynced: boolean;
} = {
  projects: [],
  projectsSynced: false,
};

let mockSnapshotsState: {
  snapshots: any[] | null;
  loading: boolean;
  error: any | null;
} = {
  snapshots: [],
  loading: false,
  error: null,
};

// Setup mocks
jest.mock('@/store/projectStore', () => ({
  useProjectStore: jest.fn((selector: any) => selector(mockStoreState)),
}));

jest.mock('@/hooks/usePortfolioMetricSnapshots', () => ({
  usePortfolioMetricSnapshots: jest.fn(() => mockSnapshotsState),
}));

describe('Intelligence Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      projects: [],
      projectsSynced: false,
    };
    mockSnapshotsState = {
      snapshots: [],
      loading: false,
      error: null,
    };
  });

  describe('useMetricSeries', () => {
    it('returns loading state when snapshots are loading', () => {
      mockSnapshotsState.loading = true;
      mockSnapshotsState.snapshots = null;

      const { result } = renderHook(() => useMetricSeries('NOI'));
      expect(result.current).toEqual({ status: 'loading' });
    });

    it('returns insufficient state when there are fewer than 2 snapshots', () => {
      mockSnapshotsState.loading = false;
      mockSnapshotsState.snapshots = [
        {
          date: new Date(2026, 0, 1),
          noi: 5000,
        },
      ];

      const { result } = renderHook(() => useMetricSeries('NOI'));
      expect(result.current.status).toBe('insufficient');
      if (result.current.status === 'insufficient') {
        expect(result.current.reason).toContain('Fewer than 2 historical monthly snapshots available');
      }
    });

    it('returns ready state with chronological data when snapshots are available', () => {
      mockSnapshotsState.loading = false;
      mockSnapshotsState.snapshots = [
        {
          date: new Date(2026, 1, 1),
          noi: 6000,
        },
        {
          date: new Date(2026, 0, 1),
          noi: 5000,
        },
      ];

      const { result } = renderHook(() => useMetricSeries('NOI'));
      expect(result.current.status).toBe('ready');
      if (result.current.status === 'ready') {
        expect(result.current.data.series).toEqual([5000, 6000]);
        expect(result.current.data.labels).toEqual(['Jan', 'Feb']);
      }
    });

    it('respects window size constraint when slicing snapshots', () => {
      mockSnapshotsState.loading = false;
      mockSnapshotsState.snapshots = [
        { date: new Date(2026, 0, 1), noi: 1000 },
        { date: new Date(2026, 1, 1), noi: 2000 },
        { date: new Date(2026, 2, 1), noi: 3000 },
      ];

      const { result } = renderHook(() => useMetricSeries('NOI', 2));
      expect(result.current.status).toBe('ready');
      if (result.current.status === 'ready') {
        expect(result.current.data.series).toEqual([2000, 3000]);
        expect(result.current.data.labels).toEqual(['Feb', 'Mar']);
      }
    });

    it('PRECEDENCE RULE: only reads from snapshots and never blends with project store', () => {
      mockSnapshotsState.snapshots = [
        { date: new Date('2026-01-01'), noi: 1000 },
        { date: new Date('2026-02-01'), noi: 2000 },
      ];
      // Even if live projects exist in store, series should ONLY come from snapshots
      mockStoreState.projects = [
        {
          id: 'p1',
          propertyName: 'Live Property',
          financials: { purchasePrice: 500000, netOperatingIncome: 45000 },
        } as any,
      ];
      mockStoreState.projectsSynced = true;

      const { result } = renderHook(() => useMetricSeries('NOI'));
      expect(result.current.status).toBe('ready');
      if (result.current.status === 'ready') {
        expect(result.current.data.series).toEqual([1000, 2000]);
      }
    });

    it('maintains determinism (identical inputs give identical outputs/references)', () => {
      mockSnapshotsState.snapshots = [
        { date: new Date('2026-01-01'), noi: 1000 },
        { date: new Date('2026-02-01'), noi: 2000 },
      ];

      const { result, rerender } = renderHook(() => useMetricSeries('NOI'));
      const ref1 = result.current;
      rerender();
      const ref2 = result.current;
      expect(ref1).toBe(ref2); // Stable memoized reference
    });
  });

  describe('useMetricCurrent', () => {
    it('returns loading state when projects are not synced', () => {
      mockStoreState.projectsSynced = false;

      const { result } = renderHook(() => useMetricCurrent('NOI'));
      expect(result.current).toEqual({ status: 'loading' });
    });

    it('returns insufficient state when there are no projects', () => {
      mockStoreState.projectsSynced = true;
      mockStoreState.projects = [];

      const { result } = renderHook(() => useMetricCurrent('NOI'));
      expect(result.current.status).toBe('insufficient');
      if (result.current.status === 'insufficient') {
        expect(result.current.reason).toContain('No active projects');
      }
    });

    it('returns ready state with derived today values from project store', () => {
      mockStoreState.projectsSynced = true;
      mockStoreState.projects = [
        {
          id: 'p1',
          propertyName: 'Prop 1',
          strategyType: 'Rent',
          financials: {
            purchasePrice: 100000,
            monthlyGrossRent: 1000,
            holdingCostTaxes: 100,
            holdingCostInsurance: 50,
          },
        } as any,
      ];

      const { result } = renderHook(() => useMetricCurrent('NOI'));
      expect(result.current.status).toBe('ready');
      if (result.current.status === 'ready') {
        // NOI should be derived from rent (1000 * 12) - opex (150 * 12) = 12000 - 1800 = 10200, but vacancy default 7% is deducted: (12000 * 0.93) - 1800 = 9360
        expect(result.current.data).toBe(9360);
      }
    });

    it('PRECEDENCE RULE: only reads from project store and never blends with snapshots', () => {
      mockStoreState.projectsSynced = true;
      mockStoreState.projects = [
        {
          id: 'p1',
          propertyName: 'Prop 1',
          strategyType: 'Rent',
          financials: {
            purchasePrice: 100000,
            monthlyGrossRent: 1000,
          },
        } as any,
      ];
      // Snapshots have different value, but we only use live project store
      mockSnapshotsState.snapshots = [
        { date: new Date(2026, 0, 1), noi: 50000 },
        { date: new Date(2026, 1, 1), noi: 60000 },
      ];

      const { result } = renderHook(() => useMetricCurrent('NOI'));
      expect(result.current.status).toBe('ready');
      if (result.current.status === 'ready') {
        expect(result.current.data).not.toBe(60000);
      }
    });

    it('applies ownership factor correctly for myShare scope', () => {
      mockStoreState.projectsSynced = true;
      mockStoreState.projects = [
        {
          id: 'p1',
          propertyName: 'Prop 1',
          strategyType: 'Rent',
          financials: {
            purchasePrice: 100000,
            monthlyGrossRent: 1000,
            ownershipPercentage: 50,
          },
        } as any,
      ];

      const { result } = renderHook(() => useMetricCurrent('NOI', { scope: 'myShare' }));
      expect(result.current.status).toBe('ready');
      if (result.current.status === 'ready') {
        // NOI is 11160 * 50% = 5580
        expect(result.current.data).toBe(5580);
      }
    });
  });

  describe('usePortfolioInputs', () => {
    it('returns loading state if projects or snapshots are loading', () => {
      mockStoreState.projectsSynced = false;
      mockSnapshotsState.loading = true;

      const { result } = renderHook(() => usePortfolioInputs());
      expect(result.current).toEqual({ status: 'loading' });
    });

    it('returns ready state with calculated property value, debt, and equity', () => {
      mockStoreState.projectsSynced = true;
      mockStoreState.projects = [
        {
          id: 'p1',
          propertyName: 'Prop 1',
          financials: {
            purchasePrice: 200000,
            loanAmount: 120000,
            estimatedCurrentValue: 250000,
          },
        } as any,
      ];
      mockSnapshotsState.loading = false;
      mockSnapshotsState.snapshots = [
        { date: new Date(), noi: 1000 },
        { date: new Date(), noi: 2000 },
      ];

      const { result } = renderHook(() => usePortfolioInputs());
      expect(result.current.status).toBe('ready');
      if (result.current.status === 'ready') {
        expect(result.current.data.totalPropertyValue).toBe(250000);
        expect(result.current.data.totalDebt).toBe(120000);
        expect(result.current.data.totalEquity).toBe(130000);
      }
    });
  });
});
