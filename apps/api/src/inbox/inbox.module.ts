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
import {
  createPrismaInboxReadRepository,
  createPrismaInboxCommandRepository,
} from '@paperworking/database';
import {
  InboxReadService,
  InboxCommandService,
  InboxItemNotFoundError,
  createInboxReadService,
  createInboxCommandService,
} from '@paperworking/services';
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
    private readonly inboxRead: InboxReadService,
    private readonly inboxCommand: InboxCommandService,
  ) {}

  async list(user: AuthUser) {
    return this.inboxRead.listInbox(user);
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
    try {
      return await this.inboxCommand.updateInboxItem(user, id, {
        read: typeof body.read === 'boolean' ? body.read : undefined,
        archived: typeof body.archived === 'boolean' ? body.archived : undefined,
        title: typeof body.title === 'string' ? body.title : undefined,
        body: typeof body.body === 'string' ? body.body : undefined,
        href: typeof body.href === 'string' ? body.href : undefined,
      });
    } catch (error) {
      if (error instanceof InboxItemNotFoundError) {
        throw new NotFoundException({ error: 'Inbox item not found' });
      }
      throw error;
    }
  }

  async remove(user: AuthUser, id: string) {
    try {
      return await this.inboxCommand.deleteInboxItem(user, id);
    } catch (error) {
      if (error instanceof InboxItemNotFoundError) {
        throw new NotFoundException({ error: 'Inbox item not found' });
      }
      throw error;
    }
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
  providers: [
    InboxService,
    {
      provide: InboxReadService,
      useFactory: (prisma: PrismaService) =>
        createInboxReadService({
          repository: createPrismaInboxReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: InboxCommandService,
      useFactory: (prisma: PrismaService) =>
        createInboxCommandService({
          repository: createPrismaInboxCommandRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
  ],
  exports: [InboxService],
})
export class InboxModule {}
