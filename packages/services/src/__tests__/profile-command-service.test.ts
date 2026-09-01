import { describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createProfileCommandService,
  createProfileReadService,
  ProfileForbiddenError,
  ProfileNotFoundError,
  ProfileValidationError,
  type ProfileSettingsRepository,
  type ProfileUserRow,
} from '../profile/index.js';

const user: AuthUser = {
  uid: 'user-1',
  email: 'user@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function userRow(overrides: Partial<ProfileUserRow> = {}): ProfileUserRow {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Jane Doe',
    displayName: 'Jane Doe',
    phone: '+15551234567',
    timezone: 'America/New_York',
    companyName: 'Acme Capital',
    avatarUrl: null,
    accountType: 'investor',
    role: null,
    settings: {},
    ...overrides,
  };
}

describe('ProfileReadService', () => {
  it('returns canonical profile from Postgres for authenticated user', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(async () => userRow()),
      updateProfileFields: jest.fn(),
    };
    const service = createProfileReadService({ repository });
    const result = await service.getProfile(user);
    expect(result.success).toBe(true);
    expect(result.section).toBe('profile');
    expect(result.settings.email).toBe('user@example.com');
    expect(result.settings.accountType).toBe('investor');
    expect(repository.findByAuthUid).toHaveBeenCalledWith('user-1');
  });

  it('prefers Postgres accountType over spoofed AuthUser accountType', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(async () => userRow({ accountType: 'investor' })),
      updateProfileFields: jest.fn(),
    };
    const service = createProfileReadService({ repository });
    const result = await service.getProfile({ ...user, accountType: 'admin' });
    expect(result.settings.accountType).toBe('investor');
  });
});

describe('ProfileCommandService', () => {
  it('updates allowlisted profile fields for own user', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(async () => userRow()),
      updateProfileFields: jest.fn(async (_id, data) =>
        userRow({
          name: data.name ?? 'Jane Doe',
          displayName: data.displayName ?? 'Jane Doe',
          phone: data.phone ?? '+15551234567',
          companyName: data.companyName ?? 'Acme Capital',
        }),
      ),
    };
    const service = createProfileCommandService({ repository });
    const result = await service.updateProfile(user, {
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+15559876543',
      companyName: 'New Co',
    });
    expect(result.success).toBe(true);
    expect(repository.updateProfileFields).toHaveBeenCalledWith('user-1', {
      phone: '+15559876543',
      companyName: 'New Co',
      name: 'Jane Smith',
      displayName: 'Jane Smith',
    });
  });

  it('rejects accountType spoof with ProfileForbiddenError', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(),
      updateProfileFields: jest.fn(),
    };
    const service = createProfileCommandService({ repository });
    await expect(
      service.updateProfile(user, { accountType: 'admin' }),
    ).rejects.toBeInstanceOf(ProfileForbiddenError);
  });

  it('rejects isAdmin spoof with ProfileForbiddenError', async () => {
    const service = createProfileCommandService({
      repository: {
        findByAuthUid: jest.fn(),
        updateProfileFields: jest.fn(),
      },
    });
    await expect(service.updateProfile(user, { isAdmin: true })).rejects.toBeInstanceOf(
      ProfileForbiddenError,
    );
  });

  it('rejects email writes with ProfileForbiddenError', async () => {
    const service = createProfileCommandService({
      repository: {
        findByAuthUid: jest.fn(),
        updateProfileFields: jest.fn(),
      },
    });
    await expect(
      service.updateProfile(user, { email: 'attacker@evil.com' }),
    ).rejects.toBeInstanceOf(ProfileForbiddenError);
  });

  it('rejects subscription field writes', async () => {
    const service = createProfileCommandService({
      repository: {
        findByAuthUid: jest.fn(),
        updateProfileFields: jest.fn(),
      },
    });
    await expect(
      service.updateProfile(user, { stripeCustomerId: 'cus_fake' }),
    ).rejects.toBeInstanceOf(ProfileForbiddenError);
  });

  it('rejects unknown profile fields', async () => {
    const service = createProfileCommandService({
      repository: {
        findByAuthUid: jest.fn(async () => userRow()),
        updateProfileFields: jest.fn(),
      },
    });
    await expect(
      service.updateProfile(user, { hackedField: 'value' }),
    ).rejects.toBeInstanceOf(ProfileValidationError);
  });

  it('rejects foreign userId/uid in body', async () => {
    const service = createProfileCommandService({
      repository: {
        findByAuthUid: jest.fn(),
        updateProfileFields: jest.fn(),
      },
    });
    await expect(
      service.updateProfile(user, { userId: 'foreign-user', phone: '+15551111111' }),
    ).rejects.toBeInstanceOf(ProfileForbiddenError);
    await expect(service.updateProfile(user, { uid: 'foreign-user' })).rejects.toBeInstanceOf(
      ProfileForbiddenError,
    );
  });

  it('always resolves profile by session uid', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(async () => userRow()),
      updateProfileFields: jest.fn(async () => userRow()),
    };
    const service = createProfileCommandService({ repository });
    await service.updateProfile(user, { phone: '+15551111111' });
    expect(repository.findByAuthUid).toHaveBeenCalledWith('user-1');
  });

  it('throws ProfileNotFoundError when user row is missing', async () => {
    const service = createProfileCommandService({
      repository: {
        findByAuthUid: jest.fn(async () => null),
        updateProfileFields: jest.fn(),
      },
    });
    await expect(service.updateProfile(user, { phone: '123' })).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});
