import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createAdminAgentCrewCommandService,
  createAdminAgentCrewReadService,
  createAdminLenderReadService,
  createAdminOpsReadService,
  createAdminRentcastReadService,
} from '@paperworking/services';
import { createAdminReadRepository, createAuthzStore } from '@paperworking/database';

/** Shared admin services for Nest /api/admin/* compatibility (Phase B18). */
export function buildNestAdminServices() {
  const authz = new CoreAuthorizationService(createAuthzStore());
  const repository = createAdminReadRepository();

  return {
    ops: createAdminOpsReadService({ authz, repository }),
    rentcast: createAdminRentcastReadService({ authz, repository }),
    lender: createAdminLenderReadService({ authz, repository }),
    agentCrewRead: createAdminAgentCrewReadService({ authz, repository }),
    agentCrewCommand: createAdminAgentCrewCommandService({ authz, repository }),
  };
}

export type NestAdminServices = ReturnType<typeof buildNestAdminServices>;
