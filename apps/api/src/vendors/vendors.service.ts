import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import {
  AuthzForbiddenError,
  AuthzNotFoundError,
} from '@paperworking/authz';
import {
  VendorsReadService,
  VendorPortalReadService,
  VendorPortalCommandService,
  VendorPortalCommandValidationError,
  type VendorPortalProfileUpdateInput,
  type VendorPortalRequestUpdateInput,
} from '@paperworking/services';
import {
  createVendorPortalCommandRepository,
  createVendorsReadRepository,
} from '@paperworking/database';
import { AuthorizationService } from '../authz/authorization.service.js';

function mapVendorPortalError(error: unknown): never {
  if (error instanceof AuthzForbiddenError) {
    throw new ForbiddenException(error.payload);
  }
  if (error instanceof AuthzNotFoundError) {
    throw new NotFoundException(error.payload);
  }
  if (error instanceof VendorPortalCommandValidationError) {
    throw new NotFoundException({ error: error.message });
  }
  throw error;
}

@Injectable()
export class VendorsService {
  private readonly vendorsReadRepository;
  private readonly vendorPortalCommandRepository;

  constructor(
    private readonly authz: AuthorizationService,
    private readonly vendorsRead: VendorsReadService,
    private readonly vendorPortalRead: VendorPortalReadService,
    private readonly vendorPortalCommand: VendorPortalCommandService,
  ) {
    this.vendorsReadRepository = createVendorsReadRepository();
    this.vendorPortalCommandRepository = createVendorPortalCommandRepository();
  }

  async list(user: AuthUser, q?: string) {
    return this.vendorsRead.listVendors(user, q);
  }

  async listServices(user: AuthUser) {
    const orgIds = await this.authz.resolveUserOrgIds(user.uid);
    const vendors = await this.vendorsReadRepository.listVendors({ organizationIds: orgIds });
    const services = vendors.map((v: { id: string; name: string; type: string; contactEmail?: string | null }) => ({
      id: v.id,
      vendorId: v.id,
      name: v.name,
      category: v.type,
      contactEmail: v.contactEmail,
    }));
    return { success: true, services };
  }

  async createService(user: AuthUser, body: Record<string, unknown>) {
    void body.vendorId;
    void body.userId;
    void body.ownerId;

    const name = String(body.name || '');
    const type = String(body.type || body.category || 'general');
    if (!name) {
      throw new NotFoundException({ error: 'name required' });
    }

    const organizationId = await this.authz.resolveTrustedOrgId(
      user,
      typeof body.organizationId === 'string' ? body.organizationId : undefined,
    );
    if (!organizationId) {
      throw new ForbiddenException({
        error: 'Forbidden',
        reason: 'organization',
        message: 'No trusted organization for caller',
      });
    }

    const vendor = await this.vendorPortalCommandRepository.createVendor({
      organizationId,
      name,
      type,
      contactEmail:
        typeof body.contactEmail === 'string'
          ? body.contactEmail
          : user.email || undefined,
      contactPhone:
        typeof body.contactPhone === 'string' ? body.contactPhone : undefined,
    });
    return { success: true, service: vendor, vendor };
  }

  async getPortalProfile(user: AuthUser) {
    try {
      return await this.vendorPortalRead.getPortalProfile(user);
    } catch (error) {
      mapVendorPortalError(error);
    }
  }

  async updatePortalProfile(user: AuthUser, body: Record<string, unknown>) {
    try {
      return await this.vendorPortalCommand.updateProfile(
        user,
        body as VendorPortalProfileUpdateInput,
      );
    } catch (error) {
      mapVendorPortalError(error);
    }
  }

  async listPortalRequests(user: AuthUser) {
    try {
      return await this.vendorPortalRead.listPortalRequests(user);
    } catch (error) {
      mapVendorPortalError(error);
    }
  }

  async updatePortalRequest(user: AuthUser, body: Record<string, unknown>) {
    try {
      return await this.vendorPortalCommand.updateRequest(
        user,
        body as VendorPortalRequestUpdateInput,
      );
    } catch (error) {
      mapVendorPortalError(error);
    }
  }
}
