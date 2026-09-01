import {
  createProfileCommandService,
  createProfileReadService,
} from '@paperworking/services';
import { createPrismaProfileSettingsRepository } from '@paperworking/database';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Shared profile services for Nest GET/PUT /api/settings/profile (Phase B17). */
export function buildNestProfileServices(prisma: PrismaService) {
  const repository = createPrismaProfileSettingsRepository(prisma.client);
  return {
    read: createProfileReadService({ repository }),
    command: createProfileCommandService({ repository }),
  };
}

export type NestProfileServices = ReturnType<typeof buildNestProfileServices>;
