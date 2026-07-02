/**
 * Tests for writeActivityLog
 *
 * Since writeActivityLog depends on firebase-admin (adminDb),
 * we mock the Firestore batch interface and verify the correct
 * documents are being created with the right shape.
 */

// ── Mock firebase-admin before imports ──────────────────
// jest.mock is hoisted, so we must define fns inline

const mockSet = jest.fn();
const mockCommit = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/firebase/admin', () => {
  const mockDoc = jest.fn(() => ({ id: 'mock-auto-id' }));
  return {
    adminDb: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            doc: mockDoc,
          })),
        })),
      })),
      batch: jest.fn(() => ({
        set: mockSet,
        commit: mockCommit,
      })),
    },
  };
});

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  },
}));

import { writeActivityLog } from '../activityLogWriter';

describe('writeActivityLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when changes array is empty', async () => {
    await writeActivityLog('proj-1', 'user-1', []);
    // batch() should not be called since there are no changes
    const { adminDb } = require('@/lib/firebase/admin');
    expect(adminDb.batch).not.toHaveBeenCalled();
  });

  it('creates one batch entry per change', async () => {
    const changes = [
      { fieldPath: 'financials.purchasePrice', oldValue: 200000, newValue: 210000 },
      { fieldPath: 'status', oldValue: 'Active', newValue: 'Under Contract' },
    ];

    await writeActivityLog('proj-1', 'user-1', changes, 'manual');

    // Should set twice (one per change) and commit once
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledTimes(1);

    // Verify the shape of the first entry
    const firstEntry = mockSet.mock.calls[0][1];
    expect(firstEntry.userId).toBe('user-1');
    expect(firstEntry.fieldPath).toBe('financials.purchasePrice');
    expect(firstEntry.oldValue).toBe(200000);
    expect(firstEntry.newValue).toBe(210000);
    expect(firstEntry.source).toBe('manual');
    expect(firstEntry.timestamp).toBeDefined();
  });

  it('sets source correctly for different change types', async () => {
    const changes = [{ fieldPath: 'address', oldValue: null, newValue: '123 Main St' }];

    await writeActivityLog('proj-1', 'user-1', changes, 'ocr');

    const entry = mockSet.mock.calls[0][1];
    expect(entry.source).toBe('ocr');
  });

  it('sanitizes undefined values to null', async () => {
    const changes = [{ fieldPath: 'notes', oldValue: undefined, newValue: 'hello' }];

    await writeActivityLog('proj-1', 'user-1', changes);

    const entry = mockSet.mock.calls[0][1];
    expect(entry.oldValue).toBeNull();
  });

  it('serializes complex objects', async () => {
    const changes = [{
      fieldPath: 'financials',
      oldValue: { purchasePrice: 100000 },
      newValue: { purchasePrice: 200000 },
    }];

    await writeActivityLog('proj-1', 'user-1', changes);

    const entry = mockSet.mock.calls[0][1];
    expect(entry.oldValue).toEqual({ purchasePrice: 100000 });
    expect(entry.newValue).toEqual({ purchasePrice: 200000 });
  });

  it('handles the vendor source type', async () => {
    const changes = [{ fieldPath: 'appraisalValue', oldValue: null, newValue: 350000 }];
    await writeActivityLog('proj-1', 'vendor-uid', changes, 'vendor');

    const entry = mockSet.mock.calls[0][1];
    expect(entry.source).toBe('vendor');
    expect(entry.userId).toBe('vendor-uid');
  });

  it('defaults source to manual when not specified', async () => {
    const changes = [{ fieldPath: 'notes', oldValue: '', newValue: 'updated' }];
    await writeActivityLog('proj-1', 'user-1', changes);

    const entry = mockSet.mock.calls[0][1];
    expect(entry.source).toBe('manual');
  });
});
