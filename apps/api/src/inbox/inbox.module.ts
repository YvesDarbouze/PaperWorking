import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  async list(user: AuthUser) {
    const items = await this.prisma.inboxItem.findMany({
      where: { recipientUid: user.uid },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, items };
  }

  async create(user: AuthUser, body: Record<string, unknown>) {
    // Ignore spoof fields — recipient resolved via AuthorizationService only.
    void body.organizationId;
    void body.senderUid;

    const recipientUid = await this.authz.resolveInboxRecipientUid(
      user,
      typeof body.recipientUid === 'string' ? body.recipientUid : undefined,
    );

    const item = await this.prisma.inboxItem.create({
      data: {
        recipientUid,
        senderUid: user.uid,
        type: typeof body.type === 'string' ? body.type : 'notification',
        title: String(body.title || 'Notification'),
        body: typeof body.body === 'string' ? body.body : undefined,
        href: typeof body.href === 'string' ? body.href : undefined,
        metadata: (body.metadata as object) || {},
      },
    });
    return { success: true, item };
  }

  async patch(user: AuthUser, id: string, body: Record<string, unknown>) {
    const existing = await this.prisma.inboxItem.findFirst({
      where: { id, recipientUid: user.uid },
    });
    if (!existing) throw new NotFoundException({ error: 'Inbox item not found' });
    const item = await this.prisma.inboxItem.update({
      where: { id },
      data: {
        read: typeof body.read === 'boolean' ? body.read : undefined,
        title: typeof body.title === 'string' ? body.title : undefined,
        body: typeof body.body === 'string' ? body.body : undefined,
        href: typeof body.href === 'string' ? body.href : undefined,
        metadata: body.metadata !== undefined ? (body.metadata as object) : undefined,
      },
    });
    return { success: true, item };
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.inboxItem.findFirst({
      where: { id, recipientUid: user.uid },
    });
    if (!existing) throw new NotFoundException({ error: 'Inbox item not found' });
    await this.prisma.inboxItem.delete({ where: { id } });
    return { success: true, deleted: true };
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  type: z.string().optional(),
  href: z.string().optional(),
  recipientUid: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

@Controller('api/inbox')
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.inbox.list(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
  ) {
    return this.inbox.create(user, body);
  }

  @Patch(':id')
  patch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.inbox.patch(user, id, body ?? {});
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.inbox.remove(user, id);
  }
}

@Module({
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
