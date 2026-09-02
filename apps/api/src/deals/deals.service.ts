import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthzForbiddenError, AuthzNotFoundError } from '@paperworking/authz';
import {
  DealsCommandValidationError,
  DealCommunicationValidationError,
  DealsReadService,
  DealsCommandService,
  DealBroadcastService,
  DealReplyService,
  type CreateDealInput,
  type DealReplyInput,
} from '@paperworking/services';
import { AuthorizationService } from '../authz/authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

function mapDealsCoreError(error: unknown): never {
  if (error instanceof DealsCommandValidationError) {
    throw new BadRequestException({ error: error.message });
  }
  if (error instanceof DealCommunicationValidationError) {
    throw new BadRequestException({ error: error.message });
  }
  if (error instanceof AuthzForbiddenError) {
    throw new ForbiddenException(error.payload);
  }
  if (error instanceof AuthzNotFoundError) {
    throw new NotFoundException(error.payload);
  }
  throw error;
}

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly dealsRead: DealsReadService,
    private readonly dealsCommand: DealsCommandService,
    private readonly dealBroadcast: DealBroadcastService,
    private readonly dealReply: DealReplyService,
  ) {}

  async list(user: AuthUser, q?: string, tab?: string) {
    try {
      return await this.dealsRead.listDeals(user, { q, tab });
    } catch (error) {
      mapDealsCoreError(error);
    }
  }

  async create(user: AuthUser, body: CreateDealInput) {
    try {
      return await this.dealsCommand.createDeal(user, body);
    } catch (error) {
      mapDealsCoreError(error);
    }
  }

  async exists(slugOrId?: string) {
    return this.dealsRead.dealExists(slugOrId);
  }

  async broadcast(user: AuthUser, body: Record<string, unknown>) {
    try {
      return await this.dealBroadcast.broadcastDeal(user, body);
    } catch (error) {
      mapDealsCoreError(error);
    }
  }

  async replyInbound(body: Record<string, unknown>) {
    try {
      return await this.dealReply.replyInbound(body as DealReplyInput);
    } catch (error) {
      mapDealsCoreError(error);
    }
  }

  async replyWithBroadcastToken(body: Record<string, unknown>, token: string) {
    try {
      return await this.dealReply.replyWithBroadcastToken(body as DealReplyInput, token);
    } catch (error) {
      mapDealsCoreError(error);
    }
  }

  async replyAuthenticated(user: AuthUser, body: Record<string, unknown>) {
    try {
      return await this.dealReply.replyAuthenticated(user, body as DealReplyInput);
    } catch (error) {
      mapDealsCoreError(error);
    }
  }

  /** @deprecated Use replyInbound or replyAuthenticated */
  async reply(body: Record<string, unknown>) {
    return this.replyInbound(body);
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
