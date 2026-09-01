import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createAdminAgentCrewCommandService,
  createAdminAgentCrewReadService,
  createAdminLenderReadService,
  createAdminOpsReadService,
  createAdminRentcastReadService,
} from '@paperworking/services';
import { createPrismaAdminReadRepository, createPrismaAuthzStore } from '@paperworking/database';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Shared admin services for Nest /api/admin/* compatibility (Phase B18). */
export function buildNestAdminServices(prisma: PrismaService) {
  const client = prisma.client;
  const authz = new CoreAuthorizationService(createPrismaAuthzStore(client));
  const repository = createPrismaAdminReadRepository(client);

  return {
    ops: createAdminOpsReadService({ authz, repository }),
    rentcast: createAdminRentcastReadService({ authz, repository }),
    lender: createAdminLenderReadService({ authz, repository }),
    agentCrewRead: createAdminAgentCrewReadService({ authz, repository }),
    agentCrewCommand: createAdminAgentCrewCommandService({ authz, repository }),
  };
}

export type NestAdminServices = ReturnType<typeof buildNestAdminServices>;
