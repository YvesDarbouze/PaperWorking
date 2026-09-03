import type { AuthUser } from '@paperworking/authz';
import type { ProfileSettingsRepository } from './profile-settings-repository.js';
import { mapUserRowToSafeProfileDto, type SafeProfileDto } from './safe-profile-dto.js';

export type ProfileReadServiceDeps = {
  repository: ProfileSettingsRepository;
};

export type ProfileGetResult = {
  success: true;
  section: 'profile';
  settings: SafeProfileDto;
};

/**
 * GET /api/settings/profile — canonical safe profile DTO from Neon User row (session-scoped).
 */
export class ProfileReadService {
  constructor(private readonly deps: ProfileReadServiceDeps) {}

  async getProfile(user: AuthUser): Promise<ProfileGetResult> {
    const row = await this.deps.repository.findByAuthUid(user.uid);
    return {
      success: true,
      section: 'profile',
      settings: mapUserRowToSafeProfileDto(row, user),
    };
  }
}

export function createProfileReadService(deps: ProfileReadServiceDeps): ProfileReadService {
  return new ProfileReadService(deps);
}
