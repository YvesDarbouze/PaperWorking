import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  async listThreads(user: AuthUser) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: user.uid }, { recipientId: user.uid }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const byThread = new Map<string, (typeof messages)[number]>();
    for (const m of messages) {
      if (!byThread.has(m.threadId)) byThread.set(m.threadId, m);
    }
    return {
      success: true,
      threads: [...byThread.values()].map((m) => ({
        threadId: m.threadId,
        subject: m.subject,
        lastMessageAt: m.createdAt,
        preview: m.body.slice(0, 120),
        participants: [m.senderId, m.recipientId],
      })),
    };
  }

  async listMessages(user: AuthUser, threadId?: string) {
    if (threadId) {
      await this.authz.assertThreadAccess(user, threadId);
    }
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: user.uid }, { recipientId: user.uid }],
        ...(threadId ? { threadId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return { success: true, messages };
  }

  async create(user: AuthUser, body: Record<string, unknown>) {
    // Never trust client identity spoof fields.
    void body.senderId;
    void body.organizationId;
    void body.userId;

    const recipientId = String(body.recipientId || '');
    const subject = String(body.subject || 'Message');
    const messageBody = String(body.body || '');
    if (!recipientId || !messageBody) {
      throw new BadRequestException({ error: 'recipientId and body required' });
    }
    if (recipientId === user.uid) {
      throw new BadRequestException({ error: 'Cannot message yourself' });
    }

    await this.authz.assertMessageRecipientAllowed(
      user,
      recipientId,
      typeof body.threadId === 'string' ? body.threadId : undefined,
    );

    let threadId: string;
    if (typeof body.threadId === 'string' && body.threadId.trim()) {
      // Existing thread only — must already be a participant.
      await this.authz.assertThreadAccess(user, body.threadId.trim());
      threadId = body.threadId.trim();
    } else {
      threadId = crypto.randomUUID();
    }

    let attachmentProjectId: string | undefined;
    if (typeof body.attachmentProjectId === 'string' && body.attachmentProjectId) {
      await this.authz.assertProjectAccess(
        user,
        body.attachmentProjectId,
        'projects.read',
      );
      attachmentProjectId = body.attachmentProjectId;
    }

    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderId: user.uid,
        recipientId,
        subject,
        body: messageBody,
        attachmentProjectId,
      },
    });
    return { success: true, message };
  }

  async thread(user: AuthUser, threadId: string) {
    await this.authz.assertThreadAccess(user, threadId);
    const messages = await this.prisma.message.findMany({
      where: {
        threadId,
        OR: [{ senderId: user.uid }, { recipientId: user.uid }],
      },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, threadId, messages };
  }
}

const createSchema = z.object({
  recipientId: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  threadId: z.string().optional(),
  attachmentProjectId: z.string().optional(),
});

@Controller('api/message-threads')
export class MessageThreadsController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.messages.listThreads(user);
  }
}

@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('threadId') threadId?: string) {
    return this.messages.listMessages(user, threadId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
  ) {
    return this.messages.create(user, body);
  }

  @Get('thread/:threadId')
  thread(@CurrentUser() user: AuthUser, @Param('threadId') threadId: string) {
    return this.messages.thread(user, threadId);
  }
}

@Module({
  controllers: [MessageThreadsController, MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
