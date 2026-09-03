import {
  createProfileCommandService,
  createProfileReadService,
} from '@paperworking/services';
import { createProfileSettingsRepository } from '@paperworking/database';

/** Shared profile services for Nest GET/PUT /api/settings/profile (Phase B17). */
export function buildNestProfileServices() {
  const repository = createProfileSettingsRepository();
  return {
    read: createProfileReadService({ repository }),
    command: createProfileCommandService({ repository }),
  };
}

export type NestProfileServices = ReturnType<typeof buildNestProfileServices>;
