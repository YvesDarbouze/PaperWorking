/**
 * Tests for writeMetricSnapshots (snapshotWriter)
 *
 * Mocks firebase-admin and the snapshotService's computeProjectSnapshotData
 * to verify:
 *   - Correct snapshot document ID format
 *   - Firestore set() is called with merge: true
 *   - Returned summary contains computed metrics
 */

// ── Track mock calls at module scope ─────────────────

const mockSnapshotSet = jest.fn().mockResolvedValue(undefined);
const mockSnapshotDoc = jest.fn(() => ({
  set: mockSnapshotSet,
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: mockSnapshotDoc,
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  },
}));

// Mock the snapshot computation to return deterministic values
jest.mock('@/lib/metrics/snapshotService', () => ({
  computeProjectSnapshotData: jest.fn(
    (project: any, period: string, _type: string, _date: Date) => ({
      id: `${project.id}_${period}`,
      projectId: project.id,
      organizationId: project.organizationId || 'org-1',
      period,
      periodType: 'monthly',
      date: _date,
      noi: 24000,
      annualCashFlow: 12000,
      monthlyCashFlow: 1000,
      capRate: 8.5,
      arvCapRate: 7.2,
      cashOnCashReturn: 12.5,
      grossRentMultiplier: 10,
      dscr: 1.35,
      ltv: 75,
      oer: 35,
      occupancyRate: 95,
      irr: 15.5,
      appreciation: 3.5,
      isAppreciationRealized: false,
      propertyValue: 300000,
      totalCashInvested: 96000,
      grossRentalIncome: 36000,
      annualDebtService: 12000,
      loanAmount: 225000,
      totalOperatingExpenses: 12000,
      grossOperatingIncome: 36000,
      occupiedUnits: null,
      numberOfUnits: null,
      ownershipPercentage: 100,
      investorNOI: 24000,
      investorCashFlow: 12000,
      investorCoCReturn: 12.5,
    })
  ),
  parseFirestoreDate: jest.fn((val: any) => {
    if (!val) return new Date();
    if (typeof val.toDate === 'function') return val.toDate();
    return new Date(val);
  }),
}));

import { writeMetricSnapshots } from '../snapshotWriter';

describe('writeMetricSnapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes a snapshot document for the current month', async () => {
    const projectData = {
      id: 'proj-123',
      organizationId: 'org-1',
      financials: {
        purchasePrice: 200000,
        loanAmount: 150000,
        monthlyGrossRent: 1800,
      },
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date(),
    };

    const result = await writeMetricSnapshots('proj-123', projectData);

    // Should call Firestore set with merge
    const { adminDb } = require('@/lib/firebase/admin');
    expect(adminDb.collection).toHaveBeenCalledWith('propertyMetricSnapshots');
    expect(mockSnapshotSet).toHaveBeenCalledTimes(1);

    const [setData, setOptions] = mockSnapshotSet.mock.calls[0];
    expect(setOptions).toEqual({ merge: true });
    expect(setData.projectId).toBe('proj-123');
    expect(setData.createdAt).toBeDefined();

    // Verify result summary
    expect(result.snapshotsWritten).toBe(1);
    expect(result.metricsSummary.noi).toBe(24000);
    expect(result.metricsSummary.capRate).toBe(8.5);
    expect(result.metricsSummary.cashOnCashReturn).toBe(12.5);
    expect(result.metricsSummary.dscr).toBe(1.35);
  });

  it('generates correct document ID format', async () => {
    await writeMetricSnapshots('proj-abc', {
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // The doc ID should be proj-abc_YYYY-MM
    const docIdArg = (mockSnapshotDoc as any).mock.calls[0][0];
    expect(docIdArg).toMatch(/^proj-abc_\d{4}-\d{2}$/);
  });

  it('handles project data with missing financials gracefully', async () => {
    // The mock computeProjectSnapshotData handles this, but verify no throw
    const result = await writeMetricSnapshots('proj-empty', {
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.snapshotsWritten).toBe(1);
  });
});
