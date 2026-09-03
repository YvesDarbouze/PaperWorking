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

  it('creates and finds user by id', async () => {
    const repo = createFirestoreIdentityUserRepository(createMockFirestoreFactory(mock));
    await repo.createUser({
      id: 'uid-1',
      email: 'user@example.com',
      accountType: 'investor',
    });
    const found = await repo.findById('uid-1');
    expect(found?.id).toBe('uid-1');
    expect(found?.email).toBe('user@example.com');
    expect(found?.accountType).toBe('investor');
  });

  it('finds user by email', async () => {
    mock.seed('users', [
      {
        id: 'uid-2',
        data: {
          uid: 'uid-2',
          email: 'findme@example.com',
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
  });

  it('remaps primary key', async () => {
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
    await repo.remapPrimaryKey('old-id', 'new-id');
    expect(await repo.findById('old-id')).toBeNull();
    const found = await repo.findById('new-id');
    expect(found?.email).toBe('remap@example.com');
  });
});
