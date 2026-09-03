import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { createTaskAssignmentsRepository } from '@paperworking/database';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';

@Injectable()
export class TasksService {
  private readonly tasksRepository;

  constructor(private readonly authz: AuthorizationService) {
    this.tasksRepository = createTaskAssignmentsRepository();
  }

  async list(user: AuthUser, projectId?: string, assigneeId?: string) {
    this.authz.assertPermission(user, 'projects.read');

    const trustedAssigneeFilter =
      assigneeId && (assigneeId === user.uid || user.isAdmin) ? assigneeId : undefined;

    if (projectId) {
      await this.authz.assertProjectAccess(user, projectId, 'projects.read');
      const tasks = await this.tasksRepository.listByProjectId(
        projectId,
        trustedAssigneeFilter,
      );
      return { success: true, tasks };
    }

    const tasks = await this.tasksRepository.listForAssignee(user.uid);
    const filtered = trustedAssigneeFilter
      ? tasks.filter((task: { assigneeId: string }) => task.assigneeId === trustedAssigneeFilter)
      : tasks;
    return { success: true, tasks: filtered };
  }

  async create(user: AuthUser, body: Record<string, unknown>) {
    this.authz.assertPermission(user, 'projects.update');

    const title = String(body.title || '');
    if (!title) return { success: false, error: 'title required' };

    const projectId =
      typeof body.projectId === 'string' && body.projectId.trim()
        ? body.projectId.trim()
        : '';
    if (!projectId) {
      throw new BadRequestException({ error: 'projectId required' });
    }

    void body.organizationId;
    void body.userId;

    await this.authz.assertProjectAccess(user, projectId, 'projects.update');

    const requestedAssignee =
      typeof body.assigneeId === 'string' && body.assigneeId.trim()
        ? body.assigneeId.trim()
        : user.uid;

    await this.authz.assertAssigneeInProjectScope(user, projectId, requestedAssignee);

    const task = await this.tasksRepository.createTask({
      title,
      projectId,
      assigneeId: requestedAssignee,
      status: typeof body.status === 'string' ? body.status : 'open',
      dueAt:
        typeof body.dueAt === 'string' || body.dueAt instanceof Date
          ? new Date(body.dueAt as string)
          : undefined,
      metadata: (body.metadata as Record<string, unknown>) || {},
    });
    return { success: true, task };
  }

  async assign(user: AuthUser, body: Record<string, unknown>) {
    const assigneeId =
      typeof body.assigneeId === 'string'
        ? body.assigneeId
        : typeof body.userId === 'string'
          ? body.userId
          : user.uid;
    return this.create(user, {
      ...body,
      assigneeId,
    });
  }
}

const taskSchema = z.object({
  title: z.string().min(1),
  projectId: z.string().min(1),
  assigneeId: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional(),
  dueAt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  organizationId: z.string().optional(),
});

@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('assign')
  @RequirePermissions('projects.update')
  assign(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(taskSchema)) body: z.infer<typeof taskSchema>,
  ) {
    return this.tasks.assign(user, body);
  }
}

@Controller('api/task-assignments')
export class TaskAssignmentsController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @CurrentUser() user: AuthUser,
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.tasks.list(user, projectId, assigneeId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(taskSchema)) body: z.infer<typeof taskSchema>,
  ) {
    return this.tasks.create(user, body);
  }
}

@Module({
  controllers: [TasksController, TaskAssignmentsController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
