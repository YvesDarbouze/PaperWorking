import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  /**
   * Resolve the caller's vendor profile from session identity only.
   * Never trust client-supplied vendorId / organizationId.
   */
  private async resolveTrustedVendor(user: AuthUser) {
    if (!user.email) return null;
    return this.prisma.vendor.findFirst({
      where: { contactEmail: user.email },
    });
  }

  async list(user: AuthUser, q?: string) {
    const orgIds = await this.authz.resolveUserOrgIds(user.uid);
    const where = q?.trim()
      ? {
          organizationId: { in: orgIds },
          OR: [
            { name: { contains: q.trim(), mode: 'insensitive' as const } },
            { type: { contains: q.trim(), mode: 'insensitive' as const } },
            { contactEmail: { contains: q.trim(), mode: 'insensitive' as const } },
          ],
        }
      : { organizationId: { in: orgIds } };
    const vendors = await this.prisma.vendor.findMany({
      where: orgIds.length > 0 ? where : { organizationId: { in: [] } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return { success: true, vendors };
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
    const vendor = await this.resolveTrustedVendor(user);
    return {
      success: true,
      profile: vendor || {
        userId: user.uid,
        email: user.email,
        accountType: user.accountType,
        stub: true,
      },
    };
  }

  async updatePortalProfile(user: AuthUser, body: Record<string, unknown>) {
    void body.vendorId;
    void body.userId;
    void body.ownerId;

    const existing = await this.resolveTrustedVendor(user);
    if (!existing) {
      const name = typeof body.name === 'string' ? body.name : '';
      if (!name) {
        throw new NotFoundException({
          error: 'Vendor profile not found; provide name to create',
        });
      }
      const organizationId = await this.authz.resolveTrustedOrgId(
        user,
        typeof body.organizationId === 'string' ? body.organizationId : undefined,
      );
      if (!organizationId) {
        throw new ForbiddenException({
          error: 'Forbidden',
          reason: 'organization',
        });
      }
      const created = await this.prisma.vendor.create({
        data: {
          organizationId,
          name,
          type: String(body.type || 'general'),
          contactEmail: user.email || undefined,
          contactPhone:
            typeof body.contactPhone === 'string' ? body.contactPhone : undefined,
        },
      });
      return { success: true, profile: created };
    }

    // Existing profile: never re-attach organizationId from client.
    void body.organizationId;
    const updated = await this.prisma.vendor.update({
      where: { id: existing.id },
      data: {
        name: typeof body.name === 'string' ? body.name : undefined,
        type: typeof body.type === 'string' ? body.type : undefined,
        contactPhone:
          typeof body.contactPhone === 'string' ? body.contactPhone : undefined,
        contactEmail: user.email || existing.contactEmail || undefined,
      },
    });
    return { success: true, profile: updated };
  }

  async listPortalRequests(user: AuthUser) {
    const vendor = await this.resolveTrustedVendor(user);
    if (!vendor) return { success: true, requests: [] };
    const bids = await this.prisma.vendorBid.findMany({
      where: { vendorId: vendor.id },
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, requests: bids };
  }

  async updatePortalRequest(user: AuthUser, body: Record<string, unknown>) {
    const bidId = String(body.id || body.bidId || body.requestId || '');
    if (!bidId) throw new NotFoundException({ error: 'id required' });

    // Ignore client-supplied ownership fields — session only.
    void body.vendorId;
    void body.organizationId;
    void body.ownerId;

    const vendor = await this.resolveTrustedVendor(user);
    if (!vendor) {
      throw new ForbiddenException({
        error: 'Forbidden',
        reason: 'vendor_profile_required',
      });
    }

    const bid = await this.prisma.vendorBid.findFirst({
      where: {
        id: bidId,
        vendorId: vendor.id,
      },
    });
    if (!bid) {
      throw new ForbiddenException({
        error: 'Forbidden',
        reason: 'bid',
      });
    }

    const quotedFee =
      typeof body.quotedFee === 'number'
        ? body.quotedFee
        : typeof body.bidAmount === 'number' || typeof body.bidAmount === 'bigint'
          ? Number(body.bidAmount)
          : undefined;
    const notes =
      typeof body.notes === 'string'
        ? body.notes
        : typeof body.message === 'string'
          ? body.message
          : undefined;

    const updated = await this.prisma.vendorBid.update({
      where: { id: bid.id },
      data: {
        status: typeof body.status === 'string' ? body.status : undefined,
        notes,
        bidAmount:
          quotedFee != null && Number.isFinite(quotedFee)
            ? BigInt(Math.round(quotedFee))
            : undefined,
      },
    });
    return { success: true, request: updated };
  }
}
