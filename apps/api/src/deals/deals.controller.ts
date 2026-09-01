import { Body, Controller, ForbiddenException, Get, Headers, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.types.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { DealsService } from './deals.service.js';

const createDealSchema = z.object({
  address: z.string().min(1),
  slug: z.string().min(1).optional(),
  purchasePrice: z.coerce.number().optional(),
  rehabCost: z.coerce.number().optional(),
  arv: z.coerce.number().optional(),
  holdingCosts: z.coerce.number().optional(),
  projectedRoi: z.coerce.number().optional(),
  status: z.enum(['draft', 'published', 'funding', 'closed', 'archived']).optional(),
  visibility: z.enum(['marketplace', 'invitation_only', 'private']).optional(),
  projectId: z.string().optional(),
  id: z.string().optional(),
  // Client may send extra fields (creatorId, createdAt, projects) — ignore via strip
});

const broadcastSchema = z.object({
  dealId: z.string().min(1),
  recipientEmails: z.union([z.array(z.string().email()), z.string().email()]).optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  includeBusinessCard: z.boolean().optional(),
});

const replySchema = z.object({
  dealId: z.string().min(1),
  content: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  senderEmail: z.string().email().optional(),
  email: z.string().email().optional(),
  senderId: z.string().optional(),
  token: z.string().optional(),
  broadcastToken: z.string().optional(),
});

const invitationSchema = z.object({
  dealId: z.string().min(1),
  inviteeEmail: z.string().email().optional(),
  email: z.string().email().optional(),
  inviteeUserId: z.string().optional(),
  businessCardShared: z.boolean().optional(),
});

@Controller('api/deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermissions('deals.read')
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('tab') tab?: string,
  ) {
    return this.deals.list(user, q, tab);
  }

  @Post()
  @RequirePermissions('deals.create')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createDealSchema)) body: z.infer<typeof createDealSchema>,
  ) {
    return this.deals.create(user, body);
  }

  @Public()
  @Get('exists')
  exists(@Query('slug') slug?: string, @Query('id') id?: string) {
    return this.deals.exists(slug || id);
  }

  @Post('broadcast')
  @RequirePermissions('deals.update')
  broadcast(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(broadcastSchema)) body: z.infer<typeof broadcastSchema>,
  ) {
    return this.deals.broadcast(user, body);
  }

  @Public()
  @Post('reply')
  reply(
    @Headers('x-deal-reply-secret') inboundSecret: string | undefined,
    @CurrentUser() user: AuthUser | undefined,
    @Body(new ZodValidationPipe(replySchema)) body: z.infer<typeof replySchema>,
  ) {
    const configured = process.env.DEAL_REPLY_WEBHOOK_SECRET?.trim();
    if (configured && inboundSecret === configured) {
      return this.deals.replyInbound(body);
    }
    if (user) {
      return this.deals.replyAuthenticated(user, body);
    }
    const token = body.token || body.broadcastToken;
    if (token) {
      return this.deals.replyWithBroadcastToken(body, token);
    }
    throw new ForbiddenException({
      error: 'Forbidden',
      reason: 'deal_reply_auth_required',
    });
  }
}

@Controller('api/deal-invitations')
export class DealInvitationsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermissions('deals.read')
  list(@CurrentUser() user: AuthUser) {
    return this.deals.listInvitations(user);
  }

  @Post()
  @RequirePermissions('deals.update')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(invitationSchema)) body: z.infer<typeof invitationSchema>,
  ) {
    return this.deals.createInvitation(user, body);
  }
}
