import { describe, expect, it, jest } from '@jest/globals';
import { createIdentityProvisioningService } from '../auth/identity-provisioning.service.js';
import type { IdentityUserRepository } from '../auth/types.js';
import type { SessionUserStore } from '../session/types.js';

function makeRepository(
  overrides: Partial<IdentityUserRepository> = {},
): IdentityUserRepository {
  return {
    findById: jest.fn(async () => null),
    findByLegacyUid: jest.fn(async () => null),
    findByEmail: jest.fn(async () => null),
    updateEmail: jest.fn(async () => undefined),
    updateAfterEmailRemap: jest.fn(async () => undefined),
    createUser: jest.fn(async () => undefined),
    remapPrimaryKey: jest.fn(async () => undefined),
    ...overrides,
  };
}

function makeStore(profile: SessionUserStore extends infer _ ? never : never): SessionUserStore {
  void profile;
  return {
    findUserByUid: jest.fn(async () => ({
      id: 'user-new',
      email: 'new@example.com',
      accountType: 'vendor',
      role: null,
    })),
  };
}

describe('IdentityProvisioningService', () => {
  it('updates email only for existing user — never accountType', async () => {
    const repository = makeRepository({
      findById: jest.fn(async () => ({
        id: 'user-existing',
        email: 'old@example.com',
        accountType: 'investor',
      })),
    });
    const store: SessionUserStore = {
      findUserByUid: jest.fn(async () => ({
        id: 'user-existing',
        email: 'investor@example.com',
        accountType: 'investor',
        role: 'investor',
      })),
    };
    const service = createIdentityProvisioningService({ repository, sessionStore: store });

    const authUser = await service.provisionFromVerifiedIdentity(
      { uid: 'user-existing', email: 'investor@example.com', provider: 'firebase' },
      'vendor',
    );

    expect(repository.updateEmail).toHaveBeenCalledWith('user-existing', 'investor@example.com');
    expect(repository.createUser).not.toHaveBeenCalled();
    expect(authUser.accountType).toBe('investor');
  });

  it('creates user with normalized accountType on first provision', async () => {
    const repository = makeRepository();
    const store = makeStore(null as never);
    const service = createIdentityProvisioningService({ repository, sessionStore: store });

    await service.provisionFromVerifiedIdentity(
      { uid: 'user-new', email: 'new@example.com', provider: 'supabase' },
      'vendor',
    );

    expect(repository.createUser).toHaveBeenCalledWith({
      id: 'user-new',
      email: 'new@example.com',
      accountType: 'vendor',
    });
  });

  it('remaps legacy Firebase uid to authoritative id', async () => {
    const repository = makeRepository({
      findByLegacyUid: jest.fn(async () => ({
        id: 'legacy-id',
        email: 'user@example.com',
        accountType: 'investor',
        legacyFirebaseUid: 'firebase-uid',
      })),
    });
    const store: SessionUserStore = {
      findUserByUid: jest.fn(async () => ({
        id: 'firebase-uid',
        email: 'user@example.com',
        accountType: 'investor',
        role: 'investor',
      })),
    };
    const service = createIdentityProvisioningService({ repository, sessionStore: store });

    await service.provisionFromVerifiedIdentity(
      { uid: 'firebase-uid', email: 'user@example.com', provider: 'firebase' },
      'investor',
    );

    expect(repository.remapPrimaryKey).toHaveBeenCalledWith('legacy-id', 'firebase-uid');
  });

  it('requires email from verified identity', async () => {
    const repository = makeRepository();
    const store: SessionUserStore = { findUserByUid: jest.fn(async () => null) };
    const service = createIdentityProvisioningService({ repository, sessionStore: store });

    await expect(
      service.provisionFromVerifiedIdentity(
        { uid: 'user-no-email', provider: 'firebase' },
        'investor',
      ),
    ).rejects.toThrow(/email is required/i);
  });
});
