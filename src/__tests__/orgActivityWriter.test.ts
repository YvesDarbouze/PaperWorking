/**
 * Unit tests for logOrgActivity (admin SDK org-level activity writer).
 *
 * Verifies the correct Firestore path, document shape, and failure isolation
 * without making any real network calls.
 */

const mockAdd = jest.fn().mockResolvedValue({ id: 'mock-auto-id' });
const mockCollection = jest.fn().mockReturnValue({ add: mockAdd });
const mockDoc = jest.fn().mockReturnValue({ collection: mockCollection });

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({ doc: mockDoc })),
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  },
}));

import { logOrgActivity } from '../lib/firebase/orgActivityWriter';

describe('logOrgActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-wire after clearAllMocks
    mockDoc.mockReturnValue({ collection: mockCollection });
    mockCollection.mockReturnValue({ add: mockAdd });
    const { adminDb } = require('@/lib/firebase/admin');
    adminDb.collection.mockReturnValue({ doc: mockDoc });
  });

  it('writes to organizations/{orgId}/activity', async () => {
    const { adminDb } = require('@/lib/firebase/admin');

    await logOrgActivity({
      organizationId: 'org-123',
      type: 'deal_created',
      actorId: 'uid-abc',
      actorName: 'Alice',
      summary: 'Added 123 Main St',
      projectId: 'proj-1',
      projectName: '123 Main St',
    });

    expect(adminDb.collection).toHaveBeenCalledWith('organizations');
    expect(mockDoc).toHaveBeenCalledWith('org-123');
    expect(mockCollection).toHaveBeenCalledWith('activity');
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('stores both actorId and actorUid for client-reader compat', async () => {
    await logOrgActivity({
      organizationId: 'org-123',
      type: 'doc_uploaded',
      actorId: 'uid-abc',
      actorName: 'Bob',
      summary: 'Uploaded deed.pdf',
    });

    const doc = mockAdd.mock.calls[0][0];
    expect(doc.actorId).toBe('uid-abc');
    expect(doc.actorUid).toBe('uid-abc');
  });

  it('stores both summary and description for client-reader compat', async () => {
    await logOrgActivity({
      organizationId: 'org-123',
      type: 'phase_change',
      actorId: 'uid-abc',
      actorName: 'Carol',
      summary: 'Status changed to Under Contract',
    });

    const doc = mockAdd.mock.calls[0][0];
    expect(doc.summary).toBe('Status changed to Under Contract');
    expect(doc.description).toBe('Status changed to Under Contract');
  });

  it('uses serverTimestamp for createdAt', async () => {
    await logOrgActivity({
      organizationId: 'org-123',
      type: 'member_joined',
      actorId: 'uid-xyz',
      actorName: 'Dan',
      summary: 'Dan joined the workspace',
    });

    const doc = mockAdd.mock.calls[0][0];
    expect(doc.createdAt).toEqual({ _methodName: 'serverTimestamp' });
  });

  it('stores optional fields as null when omitted', async () => {
    await logOrgActivity({
      organizationId: 'org-123',
      type: 'deal_created',
      actorId: 'uid-abc',
      actorName: 'Eve',
      summary: 'New deal',
    });

    const doc = mockAdd.mock.calls[0][0];
    expect(doc.targetRef).toBeNull();
    expect(doc.projectId).toBeNull();
    expect(doc.projectName).toBeNull();
  });

  it('is failure-isolated — does not throw when adminDb.add rejects', async () => {
    mockAdd.mockRejectedValueOnce(new Error('Firestore unavailable'));

    // Should resolve without throwing
    await expect(
      logOrgActivity({
        organizationId: 'org-123',
        type: 'deal_created',
        actorId: 'uid-abc',
        actorName: 'Frank',
        summary: 'Should not throw',
      })
    ).resolves.toBeUndefined();
  });
});
