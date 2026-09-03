import { describe, expect, it, jest } from '@jest/globals';
import { createIdentityProvisioningService } from '../auth/identity-provisioning.service.js';
import type { IdentityUserRepository } from '../auth/types.js';
import type { SessionUserStore } from '../session/types.js';

function makeRepository(
  overrides: Partial<IdentityUserRepository> = {},
): IdentityUserRepository {
  return {
    findById: jest.fn(async () => null),
    findByFirebaseUid: jest.fn(async () => null),
    findByLegacyUid: jest.fn(async () => null),
    findByEmail: jest.fn(async () => null),
    updateEmail: jest.fn(async () => undefined),
    updateAfterEmailRemap: jest.fn(async () => undefined),
    createUser: jest.fn(async () => undefined),
    remapPrimaryKey: jest.fn(async () => undefined),
    ...overrides,
  };
}

function makeStore(): SessionUserStore {
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
      findByFirebaseUid: jest.fn(async () => ({
        id: 'user-existing',
        documentId: 'investor@example.com',
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

    expect(repository.updateEmail).toHaveBeenCalledWith(
      'investor@example.com',
      'investor@example.com',
    );
    expect(repository.createUser).not.toHaveBeenCalled();
    expect(authUser.accountType).toBe('investor');
  });

  it('creates user with email document id on first provision', async () => {
    const repository = makeRepository();
    const store = makeStore();
    const service = createIdentityProvisioningService({ repository, sessionStore: store });

    await service.provisionFromVerifiedIdentity(
      { uid: 'user-new', email: 'new@example.com', provider: 'firebase' },
      'vendor',
    );

    expect(repository.createUser).toHaveBeenCalledWith({
      firebaseUid: 'user-new',
      email: 'new@example.com',
      accountType: 'vendor',
    });
  });

  it('remaps legacy uid document id to email document id on login', async () => {
    const repository = makeRepository({
      findByFirebaseUid: jest.fn(async () => ({
        id: 'firebase-uid',
        documentId: 'firebase-uid',
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

    expect(repository.remapPrimaryKey).toHaveBeenCalledWith('firebase-uid', 'user@example.com');
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
