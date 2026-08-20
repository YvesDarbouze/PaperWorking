import { describe, expect, it, jest } from '@jest/globals';
import { FirestoreProjectRepository } from '../firestore/repositories/project.repository.js';

function mockFirestoreDoc(id: string, data: Record<string, unknown> | null, exists = true) {
  return {
    id,
    exists,
    data: () => data,
  };
}

describe('FirestoreProjectRepository', () => {
  it('getRaw returns document data', async () => {
    const db = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(
            mockFirestoreDoc('proj_1', { address: '123 Main', status: 'acquisition' }),
          ),
        }),
      }),
    };

    const repo = new FirestoreProjectRepository(db as never);
    const raw = await repo.getRaw('proj_1');

    expect(raw).toEqual({
      id: 'proj_1',
      data: { address: '123 Main', status: 'acquisition' },
    });
  });

  it('getValidated parses minimal valid project fields', async () => {
    const now = new Date();
    const validProject = {
      organizationId: 'org_abc123',
      propertyName: '123 Elm Street',
      address: '123 Elm Street, Miami, FL 33101',
      status: 'acquisition',
      members: {
        user_abc123: {
          uid: 'user_abc123',
          role: 'Lead Investor',
          joinedAt: now,
        },
      },
      financials: {
        purchasePrice: 250000,
        estimatedARV: 350000,
        costs: [],
      },
      ownerUid: 'user_abc123',
      createdAt: now,
      updatedAt: now,
    };

    const db = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockFirestoreDoc('proj_1', validProject)),
        }),
      }),
    };

    const repo = new FirestoreProjectRepository(db as never);
    const project = await repo.getValidated('proj_1');

    expect(project?.status).toBe('acquisition');
    expect(project?.propertyName).toBe('123 Elm Street');
  });

  it('getRaw returns null for missing doc', async () => {
    const db = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockFirestoreDoc('missing', null, false)),
        }),
      }),
    };

    const repo = new FirestoreProjectRepository(db as never);
    await expect(repo.getRaw('missing')).resolves.toBeNull();
  });
});
