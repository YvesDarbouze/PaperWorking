import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { AuthzForbiddenError } from '@paperworking/authz';
import type { VendorPortalCommandRepository } from './vendor-portal-command-repository.js';
import {
  VendorPortalCommandValidationError,
  vendorPortalForbidden,
  vendorProfileNotFound,
} from './vendor-portal-command-errors.js';

export type VendorPortalProfileUpdateInput = {
  name?: string;
  companyName?: string;
  type?: string;
  contactPhone?: string;
  organizationId?: string;
  vendorId?: unknown;
  userId?: unknown;
  ownerId?: unknown;
};

export type VendorPortalRequestUpdateInput = {
  id?: string;
  bidId?: string;
  requestId?: string;
  status?: string;
  quotedFee?: number;
  bidAmount?: number | bigint;
  notes?: string;
  message?: string;
  vendorId?: unknown;
  organizationId?: unknown;
  ownerId?: unknown;
  projectId?: unknown;
};

export type VendorPortalProfileUpdateResult = {
  success: true;
  profile: Awaited<ReturnType<VendorPortalCommandRepository['updateVendor']>>;
};

export type VendorPortalRequestUpdateResult = {
  success: true;
  request: Awaited<ReturnType<VendorPortalCommandRepository['updateBid']>>;
};

export type VendorPortalCommandServiceDeps = {
  authz: AuthorizationService;
  repository: VendorPortalCommandRepository;
};

function assertVendorPortalAccess(user: AuthUser): void {
  if (user.isAdmin || user.accountType === 'vendor') return;
  throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'role' });
}

function parseProfileName(input: VendorPortalProfileUpdateInput): string | undefined {
  if (typeof input.name === 'string' && input.name.trim()) return input.name.trim();
  if (typeof input.companyName === 'string' && input.companyName.trim()) {
    return input.companyName.trim();
  }
  return undefined;
}

/**
 * Self-scoped vendor portal mutations — profile update and bid/request updates.
 */
export class VendorPortalCommandService {
  constructor(private readonly deps: VendorPortalCommandServiceDeps) {}

  async updateProfile(
    user: AuthUser,
    input: VendorPortalProfileUpdateInput,
  ): Promise<VendorPortalProfileUpdateResult> {
    assertVendorPortalAccess(user);

    const existing = user.email
      ? await this.deps.repository.findVendorByContactEmail(user.email)
      : null;

    if (!existing) {
      const name = parseProfileName(input);
      if (!name) {
        throw vendorProfileNotFound('Vendor profile not found; provide name to create');
      }
      const organizationId = await this.deps.authz.resolveTrustedOrgId(user, input.organizationId);
      if (!organizationId) {
        throw vendorPortalForbidden('organization');
      }
      const created = await this.deps.repository.createVendor({
        organizationId,
        name,
        type: typeof input.type === 'string' ? input.type : 'general',
        contactEmail: user.email || undefined,
        contactPhone: typeof input.contactPhone === 'string' ? input.contactPhone : undefined,
      });
      return { success: true, profile: created };
    }

    const updated = await this.deps.repository.updateVendor(existing.id, {
      name: parseProfileName(input),
      type: typeof input.type === 'string' ? input.type : undefined,
      contactPhone: typeof input.contactPhone === 'string' ? input.contactPhone : undefined,
      contactEmail: user.email || existing.contactEmail || undefined,
    });
    return { success: true, profile: updated };
  }

  async updateRequest(
    user: AuthUser,
    input: VendorPortalRequestUpdateInput,
  ): Promise<VendorPortalRequestUpdateResult> {
    assertVendorPortalAccess(user);

    const bidId = String(input.id || input.bidId || input.requestId || '').trim();
    if (!bidId) {
      throw new VendorPortalCommandValidationError('id required');
    }

    const vendor = user.email
      ? await this.deps.repository.findVendorByContactEmail(user.email)
      : null;
    if (!vendor) {
      throw vendorPortalForbidden('vendor_profile_required');
    }

    const bid = await this.deps.repository.findBidForVendor(vendor.id, bidId);
    if (!bid) {
      throw vendorPortalForbidden('bid');
    }

    const quotedFee =
      typeof input.quotedFee === 'number'
        ? input.quotedFee
        : typeof input.bidAmount === 'number' || typeof input.bidAmount === 'bigint'
          ? Number(input.bidAmount)
          : undefined;
    const notes =
      typeof input.notes === 'string'
        ? input.notes
        : typeof input.message === 'string'
          ? input.message
          : undefined;

    const updated = await this.deps.repository.updateBid(bid.id, {
      status: typeof input.status === 'string' ? input.status : undefined,
      notes,
      bidAmount:
        quotedFee != null && Number.isFinite(quotedFee)
          ? BigInt(Math.round(quotedFee))
          : undefined,
    });
    return { success: true, request: updated };
  }
}

export function createVendorPortalCommandService(
  deps: VendorPortalCommandServiceDeps,
): VendorPortalCommandService {
  return new VendorPortalCommandService(deps);
}
