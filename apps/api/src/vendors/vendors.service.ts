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
import { AuthorizationService } from '../authz/authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly vendorsRead: VendorsReadService,
    private readonly vendorPortalRead: VendorPortalReadService,
    private readonly vendorPortalCommand: VendorPortalCommandService,
  ) {}

  async list(user: AuthUser, q?: string) {
    return this.vendorsRead.listVendors(user, q);
  }

  async listServices() {
    const vendors = await this.prisma.vendor.findMany({
      select: { id: true, name: true, type: true, contactEmail: true },
      orderBy: { name: 'asc' },
    });
    const services = vendors.map(
      (v: {
        id: string;
        name: string;
        type: string;
        contactEmail: string | null;
      }) => ({
        id: v.id,
        vendorId: v.id,
        name: v.name,
        category: v.type,
        contactEmail: v.contactEmail,
      }),
    );
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

    const vendor = await this.prisma.vendor.create({
      data: {
        organizationId,
        name,
        type,
        contactEmail:
          typeof body.contactEmail === 'string'
            ? body.contactEmail
            : user.email || undefined,
        contactPhone:
          typeof body.contactPhone === 'string' ? body.contactPhone : undefined,
      },
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
