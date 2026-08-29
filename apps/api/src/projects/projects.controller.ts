import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.types.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ProjectsService } from './projects.service.js';

const createProjectSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  purchasePrice: z.number().optional(),
  organizationId: z.string().optional(),
});

const patchProjectSchema = z.record(z.unknown());

const documentSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().optional(),
  storageKey: z.string().optional(),
  sizeBytes: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
});

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.projects.list(user, q);
  }

  @Post()
  @RequirePermissions('projects.create')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createProjectSchema))
    body: z.infer<typeof createProjectSchema>,
  ) {
    return this.projects.create(user, body);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.getById(user, id);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  patch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchProjectSchema)) body: Record<string, unknown>,
  ) {
    return this.projects.patch(user, id, body);
  }

  @Get(':id/kpis/current')
  @RequirePermissions('projects.read')
  currentKpis(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.currentKpis(user, id);
  }

  @Patch(':id/phases/:phase')
  @RequirePermissions('projects.update')
  patchPhase(
    @Param('id') id: string,
    @Param('phase') phase: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projects.patchPhase(id, phase, body ?? {}, user);
  }

  @Get(':id/hold/registry')
  @RequirePermissions('projects.read')
  getHoldRegistry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.getHoldRegistry(user, id);
  }

  @Patch(':id/hold/registry')
  @RequirePermissions('projects.update')
  patchHoldRegistry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projects.patchHoldRegistry(user, id, body ?? {});
  }

  @Get(':id/documents')
  @RequirePermissions('projects.read')
  listDocuments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.listDocuments(user, id);
  }

  @Post(':id/documents')
  @RequirePermissions('projects.update')
  createDocument(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(documentSchema)) body: z.infer<typeof documentSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projects.createDocument(id, body, user);
  }

  @Get(':id/documents/:docId/download')
  @RequirePermissions('projects.read')
  downloadDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.projects.downloadDocument(user, id, docId);
  }

  @Get(':id/sub/:name')
  @RequirePermissions('projects.read')
  getSub(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('name') name: string,
  ) {
    return this.projects.getSub(user, id, name);
  }

  @Post(':id/sub/:name')
  @RequirePermissions('projects.update')
  postSub(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('name') name: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projects.postSub(user, id, name, body ?? {});
  }
}
