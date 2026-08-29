import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
  return base || `deal${Date.now().toString(36)}`;
}

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  async list(user: AuthUser, q?: string, tab?: string) {
    this.authz.assertPermission(user, 'deals.read');

    // Public marketplace listings only — never bare status=published (leaks private deals).
    const marketplaceVisible = {
      AND: [
        { visibility: 'marketplace' as const },
        { status: 'published' as const },
      ],
    };

    const accessOr =
      tab === 'my_activity'
        ? [{ creatorId: user.uid }]
        : tab === 'discover'
          ? [marketplaceVisible]
          : [{ creatorId: user.uid }, marketplaceVisible];

    const deals = await this.prisma.deal.findMany({
      where: q?.trim()
        ? {
            AND: [
              { OR: accessOr },
              {
                OR: [
                  { address: { contains: q.trim(), mode: 'insensitive' as const } },
                  { slug: { contains: q.trim(), mode: 'insensitive' as const } },
                ],
              },
            ],
          }
        : { OR: accessOr },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return { success: true, total: deals.length, deals };
  }

  async create(
    user: AuthUser,
    body: {
      address: string;
      slug?: string;
      purchasePrice?: number;
      rehabCost?: number;
      arv?: number;
      holdingCosts?: number;
      projectedRoi?: number;
      status?: 'draft' | 'published' | 'funding' | 'closed' | 'archived';
      visibility?: 'marketplace' | 'invitation_only' | 'private';
      projectId?: string;
      id?: string;
    },
  ) {
    this.authz.assertPermission(user, 'deals.create');

    if (body.projectId) {
      await this.authz.assertProjectAccess(user, body.projectId, 'projects.update');
    }

    let slug = (body.slug?.trim() || slugify(body.address)).toLowerCase();
    const existingSlug = await this.prisma.deal.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    if (body.id) {
      const existingId = await this.prisma.deal.findUnique({ where: { id: body.id } });
      if (existingId) {
        throw new BadRequestException({ error: 'Deal id already exists' });
      }
    }

    const deal = await this.prisma.deal.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        slug,
        address: body.address,
        purchasePrice: body.purchasePrice ?? 0,
        rehabCost: body.rehabCost ?? 0,
        arv: body.arv ?? 0,
        holdingCosts: body.holdingCosts ?? 0,
        projectedRoi: body.projectedRoi ?? 0,
        status: body.status ?? 'draft',
        visibility: body.visibility ?? 'private',
        creatorId: user.uid,
        ...(body.projectId
          ? {
              projects: {
                connect: { id: body.projectId },
              },
            }
          : {}),
      },
    });

    return { success: true, deal };
  }

  async exists(slugOrId?: string) {
    if (!slugOrId) return { exists: false };
    const deal = await this.prisma.deal.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
      select: { id: true, slug: true, status: true, visibility: true, address: true },
    });
    // Public exists probe: only confirm marketplace-published deals (no private leak).
    if (!deal) return { exists: false, deal: null };
    if (deal.visibility === 'marketplace' && deal.status === 'published') {
      return { exists: true, deal };
    }
    return { exists: false, deal: null };
  }

  async broadcast(user: AuthUser, body: Record<string, unknown>) {
    const dealId = String(body.dealId || '');
    if (!dealId) throw new NotFoundException({ error: 'dealId required' });
    await this.authz.assertDealAccess(user, dealId, 'deals.update');

    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException({ error: 'Deal not found' });

    const recipientEmails = Array.isArray(body.recipientEmails)
      ? body.recipientEmails
      : typeof body.recipientEmails === 'string'
        ? [body.recipientEmails]
        : [];

    const broadcast = await this.prisma.dealBroadcast.create({
      data: {
        dealId,
        senderId: user.uid,
        recipientEmails,
        subject: String(body.subject || `Deal: ${deal.address}`),
        message: String(body.message || ''),
        includeBusinessCard: body.includeBusinessCard !== false,
      },
    });

    for (const email of recipientEmails) {
      if (typeof email !== 'string') continue;
      await this.prisma.dealInvitation.create({
        data: {
          dealId,
          inviteeEmail: email,
          businessCardShared: body.includeBusinessCard !== false,
        },
      });
    }

    return { success: true, broadcast, dispatchedCount: recipientEmails.length };
  }

  async reply(body: Record<string, unknown>) {
    const dealId = String(body.dealId || '');
    const content = String(body.content || body.message || '');
    const senderEmail = String(body.senderEmail || body.email || '');
    if (!dealId || !content || !senderEmail) {
      throw new BadRequestException({
        error: 'dealId, content, and senderEmail are required',
      });
    }
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException({ error: 'Deal not found' });

    const message = await this.prisma.dealMessage.create({
      data: {
        dealId,
        senderEmail,
        content,
        senderId: typeof body.senderId === 'string' ? body.senderId : undefined,
        source: 'email_inbound',
      },
    });
    return { success: true, message };
  }

  async listInvitations(user: AuthUser) {
    this.authz.assertPermission(user, 'deals.read');
    const invitations = await this.prisma.dealInvitation.findMany({
      where: {
        OR: [{ inviteeUserId: user.uid }, { inviteeEmail: user.email || undefined }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, invitations };
  }

  async createInvitation(user: AuthUser, body: Record<string, unknown>) {
    const dealId = String(body.dealId || '');
    const inviteeEmail = String(body.inviteeEmail || body.email || '');
    if (!dealId || !inviteeEmail) {
      throw new BadRequestException({ error: 'dealId and inviteeEmail required' });
    }
    await this.authz.assertDealAccess(user, dealId, 'deals.update');
    const invitation = await this.prisma.dealInvitation.create({
      data: {
        dealId,
        inviteeEmail,
        inviteeUserId:
          typeof body.inviteeUserId === 'string' ? body.inviteeUserId : undefined,
        businessCardShared: Boolean(body.businessCardShared),
      },
    });
    return { success: true, invitation };
  }
}
