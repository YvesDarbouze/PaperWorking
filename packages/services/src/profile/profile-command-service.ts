import type { AuthUser } from '@paperworking/authz';
import {
  ProfileForbiddenError,
  ProfileNotFoundError,
  ProfileValidationError,
} from './profile-errors.js';
import type { ProfileSettingsRepository } from './profile-settings-repository.js';
import { mapUserRowToSafeProfileDto, type SafeProfileDto } from './safe-profile-dto.js';

const FORBIDDEN_FIELDS = new Set([
  'id',
  'userId',
  'uid',
  'email',
  'accountType',
  'role',
  'isAdmin',
  'organizationId',
  'orgId',
  'legacyFirebaseUid',
  'stripeCustomerId',
  'subscriptionStatus',
  'subscriptionPlan',
  'permissions',
]);

const PROFILE_COLUMN_FIELDS = new Set([
  'name',
  'displayName',
  'phone',
  'timezone',
  'companyName',
  'avatarUrl',
]);

const ALLOWED_BODY_KEYS = new Set([...PROFILE_COLUMN_FIELDS, 'firstName', 'lastName', 'profile']);

export type ProfileUpdateInput = Record<string, unknown>;

export type ProfileCommandServiceDeps = {
  repository: ProfileSettingsRepository;
};

export type ProfileUpdateResult = {
  success: true;
  section: 'profile';
  settings: SafeProfileDto;
};

/**
 * PUT /api/settings/profile — explicit allowlist; never trusts client identity fields.
 */
export class ProfileCommandService {
  constructor(private readonly deps: ProfileCommandServiceDeps) {}

  async updateProfile(user: AuthUser, body: ProfileUpdateInput): Promise<ProfileUpdateResult> {
    void body.userId;
    void body.organizationId;
    void body.uid;

    const safeBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (FORBIDDEN_FIELDS.has(key)) {
        throw new ProfileForbiddenError({ error: 'Forbidden settings field', field: key });
      }
      safeBody[key] = value;
    }

    for (const key of Object.keys(safeBody)) {
      if (!ALLOWED_BODY_KEYS.has(key)) {
        throw new ProfileValidationError({ error: 'Unknown profile field', field: key });
      }
    }

    const row = await this.deps.repository.findByAuthUid(user.uid);
    if (!row) {
      throw new ProfileNotFoundError({ success: false, error: 'User not found' });
    }

    const data: {
      name?: string;
      displayName?: string;
      phone?: string;
      timezone?: string;
      companyName?: string;
      avatarUrl?: string;
    } = {};

    for (const key of PROFILE_COLUMN_FIELDS) {
      if (typeof safeBody[key] === 'string') {
        data[key as keyof typeof data] = safeBody[key] as string;
      }
    }

    const firstName = typeof safeBody.firstName === 'string' ? safeBody.firstName.trim() : '';
    const lastName = typeof safeBody.lastName === 'string' ? safeBody.lastName.trim() : '';
    if (firstName || lastName) {
      const full = [firstName, lastName].filter(Boolean).join(' ').trim();
      if (full) {
        data.name = full;
        data.displayName = full;
      }
    }

    const updated = await this.deps.repository.updateProfileFields(row.id, data);
    return {
      success: true,
      section: 'profile',
      settings: mapUserRowToSafeProfileDto(updated, user),
    };
  }
}

export function createProfileCommandService(deps: ProfileCommandServiceDeps): ProfileCommandService {
  return new ProfileCommandService(deps);
}
