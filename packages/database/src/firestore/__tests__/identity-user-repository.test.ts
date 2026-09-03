import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { createFirestoreIdentityUserRepository } from '../create-firestore-identity-user-repository.js';
import { resetFirestoreAdminForTests } from '../admin.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';

describe('Firestore identity user repository', () => {
  let mock: MockFirestore;

  beforeEach(() => {
    resetFirestoreAdminForTests();
    mock = new MockFirestore();
  });

  afterEach(() => {
    resetFirestoreAdminForTests();
  });

  it('creates user with email document id and finds by firebase uid', async () => {
    const repo = createFirestoreIdentityUserRepository(createMockFirestoreFactory(mock));
    await repo.createUser({
      firebaseUid: 'uid-1',
      email: 'user@example.com',
      accountType: 'investor',
    });
    const found = await repo.findByFirebaseUid('uid-1');
    expect(found?.id).toBe('uid-1');
    expect(found?.documentId).toBe('user@example.com');
    expect(found?.email).toBe('user@example.com');
    expect(found?.accountType).toBe('investor');
    expect(mock.getDocument('users', 'user@example.com')?.displayName).toBeTruthy();
  });

  it('finds user by email', async () => {
    mock.seed('users', [
      {
        id: 'findme@example.com',
        data: {
          uid: 'uid-2',
          email: 'findme@example.com',
          displayName: 'Findme',
          accountType: 'investor',
          legacyFirebaseUid: 'uid-2',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    const repo = createFirestoreIdentityUserRepository(createMockFirestoreFactory(mock));
    const found = await repo.findByEmail('findme@example.com');
    expect(found?.id).toBe('uid-2');
    expect(found?.documentId).toBe('findme@example.com');
  });

  it('remaps primary key to email document id', async () => {
    mock.seed('users', [
      {
        id: 'old-id',
        data: {
          uid: 'old-id',
          email: 'remap@example.com',
          accountType: 'investor',
          legacyFirebaseUid: 'old-id',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    const repo = createFirestoreIdentityUserRepository(createMockFirestoreFactory(mock));
    await repo.remapPrimaryKey('old-id', 'remap@example.com');
    expect(await repo.findById('old-id')).toBeNull();
    const found = await repo.findById('remap@example.com');
    expect(found?.email).toBe('remap@example.com');
  });
});
