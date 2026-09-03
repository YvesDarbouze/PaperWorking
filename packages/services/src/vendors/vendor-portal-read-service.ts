import { AuthzForbiddenError } from '@paperworking/authz';
import type { AuthUser } from '@paperworking/authz';
import type { VendorPortalReadRepository } from './vendor-portal-read-repository.js';

export type VendorPortalProfileResult = {
  success: true;
  profile:
    | Awaited<ReturnType<VendorPortalReadRepository['findVendorByContactEmail']>>
    | {
        userId: string;
        email: string | null | undefined;
        accountType: string;
        stub: true;
      };
};

export type VendorPortalRequestsResult = {
  success: true;
  requests: Awaited<ReturnType<VendorPortalReadRepository['listVendorBids']>>;
};

export type VendorPortalReadServiceDeps = {
  repository: VendorPortalReadRepository;
};

function assertVendorPortalAccess(user: AuthUser): void {
  if (user.isAdmin || user.accountType === 'vendor') return;
  throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'role' });
}

/**
 * Self-scoped vendor portal reads — profile and bid inbox.
 */
export class VendorPortalReadService {
  constructor(private readonly deps: VendorPortalReadServiceDeps) {}

  async getPortalProfile(user: AuthUser): Promise<VendorPortalProfileResult> {
    assertVendorPortalAccess(user);
    if (!user.email) {
      return {
        success: true,
        profile: {
          userId: user.uid,
          email: user.email,
          accountType: user.accountType,
          stub: true,
        },
      };
    }

    const vendor = await this.deps.repository.findVendorByContactEmail(user.email);
    return {
      success: true,
      profile:
        vendor ?? {
          userId: user.uid,
          email: user.email,
          accountType: user.accountType,
          stub: true,
        },
    };
  }

  async listPortalRequests(user: AuthUser): Promise<VendorPortalRequestsResult> {
    assertVendorPortalAccess(user);
    if (!user.email) {
      return { success: true, requests: [] };
    }

    const vendor = await this.deps.repository.findVendorByContactEmail(user.email);
    if (!vendor) {
      return { success: true, requests: [] };
    }

    const requests = await this.deps.repository.listVendorBids(vendor.id);
    return { success: true, requests };
  }
}

export function createVendorPortalReadService(
  deps: VendorPortalReadServiceDeps,
): VendorPortalReadService {
  return new VendorPortalReadService(deps);
}
