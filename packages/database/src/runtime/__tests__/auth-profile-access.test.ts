import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { createFirestoreAuthProfileAccess } from '../auth-profile-access.js';
import { resetFirestoreAdminForTests } from '../../firestore/admin.js';
import { createMockFirestoreFactory, MockFirestore, ts } from '../../firestore/__tests__/mock-firestore.js';

describe('Firestore auth profile access', () => {
  let mock: MockFirestore;

  beforeEach(() => {
    resetFirestoreAdminForTests();
    mock = new MockFirestore();
  });

  afterEach(() => {
    resetFirestoreAdminForTests();
  });

  it('loads user and subscription fields from Firestore user doc', async () => {
    mock.seed('users', [
      {
        id: 'uid-1',
        data: {
          uid: 'uid-1',
          email: 'user@example.com',
          displayName: 'Test User',
          accountType: 'investor',
          legacyFirebaseUid: 'uid-1',
          subscriptionPlan: 'Team',
          subscriptionStatus: 'active',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);

    const access = createFirestoreAuthProfileAccess(createMockFirestoreFactory(mock));
    const user = await access.findUser('uid-1');
    expect(user?.email).toBe('user@example.com');
    expect(user?.displayName).toBe('Test User');

    const sub = await access.findSubscription('uid-1');
    expect(sub?.plan).toBe('Team');
    expect(sub?.status).toBe('active');

    const lookup = await access.findSubscriptionForUid('uid-1');
    expect(lookup).toEqual({ plan: 'Team', status: 'active' });
  });
});
