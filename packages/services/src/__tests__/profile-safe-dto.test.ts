import { describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createProfileCommandService,
  createProfileReadService,
  INTERNAL_PROFILE_RESPONSE_FIELDS,
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
    role: 'platform_admin',
    settings: {
      profile: { mfaEnabled: true, secretInternalFlag: true },
      stripeCustomerId: 'cus_leak',
    },
    ...overrides,
  };
}

function expectNoInternalProfileFields(settings: Record<string, unknown>) {
  for (const key of INTERNAL_PROFILE_RESPONSE_FIELDS) {
    expect(settings).not.toHaveProperty(key);
  }
  expect(Object.keys(settings).sort()).toEqual(
    [
      'accountType',
      'avatarUrl',
      'companyName',
      'displayName',
      'email',
      'name',
      'phone',
      'timezone',
    ].sort(),
  );
}

describe('phase B17.1 — SafeProfileDto response minimization', () => {
  it('GET profile returns only SafeProfileDto fields', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(async () => userRow()),
      updateProfileFields: jest.fn(),
    };
    const result = await createProfileReadService({ repository }).getProfile(user);
    expectNoInternalProfileFields(result.settings as unknown as Record<string, unknown>);
    expect(result.settings.accountType).toBe('investor');
    expect(result.settings.email).toBe('user@example.com');
  });

  it('GET profile does not spread nested settings.profile keys', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(async () => userRow()),
      updateProfileFields: jest.fn(),
    };
    const result = await createProfileReadService({ repository }).getProfile(user);
    expect(result.settings).not.toHaveProperty('mfaEnabled');
    expect(result.settings).not.toHaveProperty('secretInternalFlag');
    expect(result.settings).not.toHaveProperty('id');
  });

  it('PUT profile returns mapped SafeProfileDto not raw Prisma row', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(async () => userRow()),
      updateProfileFields: jest.fn(async () =>
        userRow({
          phone: '+15559876543',
          role: 'super_admin',
          settings: { internal: true },
        }),
      ),
    };
    const result = await createProfileCommandService({ repository }).updateProfile(user, {
      phone: '+15559876543',
    });
    expectNoInternalProfileFields(result.settings as unknown as Record<string, unknown>);
    expect(result.settings.phone).toBe('+15559876543');
    expect(result.settings).not.toHaveProperty('role');
  });

  it('does not expose role even when Postgres row contains elevated role', async () => {
    const repository: ProfileSettingsRepository = {
      findByAuthUid: jest.fn(async () => userRow({ role: 'platform_admin' })),
      updateProfileFields: jest.fn(),
    };
    const result = await createProfileReadService({ repository }).getProfile(user);
    expect(result.settings).not.toHaveProperty('role');
    expect(result.settings.accountType).toBe('investor');
  });
});
