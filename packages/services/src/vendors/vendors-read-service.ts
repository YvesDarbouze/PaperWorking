import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import type { VendorRow, VendorsReadRepository } from './vendors-read-repository.js';

export type VendorsListResult = {
  success: true;
  vendors: VendorRow[];
};

export type VendorsReadServiceDeps = {
  authz: AuthorizationService;
  repository: VendorsReadRepository;
};

/**
 * Authenticated vendor directory scoped to caller organization memberships.
 */
export class VendorsReadService {
  constructor(private readonly deps: VendorsReadServiceDeps) {}

  async listVendors(user: AuthUser, q?: string): Promise<VendorsListResult> {
    const orgIds = await this.deps.authz.resolveUserOrgIds(user.uid);
    const vendors = await this.deps.repository.listVendors({
      organizationIds: orgIds,
      q: q?.trim() || undefined,
    });
    return { success: true, vendors };
  }
}

export function createVendorsReadService(deps: VendorsReadServiceDeps): VendorsReadService {
  return new VendorsReadService(deps);
}
