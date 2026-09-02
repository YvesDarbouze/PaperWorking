import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthzForbiddenError, AuthzNotFoundError } from '@paperworking/authz';
import {
  ProjectsReadValidationError,
  ProjectsCommandValidationError,
  ProjectDocumentsValidationError,
  ProjectDocumentsStorageError,
  ProjectsReadService,
  ProjectsCommandService,
  ProjectKpiReadService,
  ProjectDocumentsReadService,
  type CreateProjectInput,
} from '@paperworking/services';
import { AuthorizationService } from '../authz/authorization.service.js';
import {
  ProjectsRepository,
  SUBCOLLECTION_ALLOWLIST,
  type SubcollectionName,
} from './projects.repository.js';

function mapProjectsServiceError(error: unknown): never {
  if (error instanceof ProjectsReadValidationError) {
    throw new BadRequestException({ error: error.message });
  }
  if (error instanceof ProjectsCommandValidationError) {
    throw new BadRequestException({ error: error.message });
  }
  if (error instanceof ProjectDocumentsValidationError) {
    throw new BadRequestException({ error: error.message });
  }
  if (error instanceof ProjectDocumentsStorageError) {
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
export class ProjectsService {
  constructor(
    private readonly repo: ProjectsRepository,
    private readonly authz: AuthorizationService,
    private readonly projectsRead: ProjectsReadService,
    private readonly projectsCommand: ProjectsCommandService,
    private readonly projectKpiRead: ProjectKpiReadService,
    private readonly projectDocumentsRead: ProjectDocumentsReadService,
  ) {}

  async list(user: AuthUser, q?: string) {
    try {
      return await this.projectsRead.listProjects(user, q);
    } catch (error) {
      mapProjectsServiceError(error);
    }
  }

  async create(user: AuthUser, body: CreateProjectInput) {
    try {
      return await this.projectsCommand.createProject(user, body);
    } catch (error) {
      mapProjectsServiceError(error);
    }
  }

  async getById(user: AuthUser, id: string) {
    try {
      return await this.projectsRead.getProjectById(user, id);
    } catch (error) {
      mapProjectsServiceError(error);
    }
  }

  async patch(user: AuthUser, id: string, body: Record<string, unknown>) {
    try {
      return await this.projectsCommand.updateProject(user, id, body);
    } catch (error) {
      mapProjectsServiceError(error);
    }
  }

  async currentKpis(user: AuthUser, id: string) {
    try {
      return await this.projectKpiRead.getCurrentProjectKpis(user, id);
    } catch (error) {
      mapProjectsServiceError(error);
    }
  }

  async patchPhase(id: string, phase: string, body: Record<string, unknown>, user: AuthUser) {
    await this.authz.assertProjectAccess(user, id, 'projects.update');
    const project = await this.repo.mergePhase(id, phase, body, user.uid);
    return { success: true, project, phase };
  }

  async getHoldRegistry(user: AuthUser, id: string) {
    await this.authz.assertProjectAccess(user, id, 'projects.read');
    const registry = await this.repo.getHoldRegistry(id);
    return { success: true, registry };
  }

  async patchHoldRegistry(user: AuthUser, id: string, body: Record<string, unknown>) {
    await this.authz.assertProjectAccess(user, id, 'projects.update');
    const registry = body.registry ?? body;
    const project = await this.repo.patchHoldRegistry(id, registry);
    return { success: true, project, registry };
  }

  async listDocuments(user: AuthUser, projectId: string) {
    try {
      return await this.projectDocumentsRead.listDocuments(user, projectId);
    } catch (error) {
      mapProjectsServiceError(error);
    }
  }

  async createDocument(
    _projectId: string,
    _body: {
      name: string;
      mimeType?: string;
      storageKey?: string;
      sizeBytes?: number;
      metadata?: Record<string, unknown>;
    },
    _user: AuthUser,
  ) {
    throw new BadRequestException({
      error:
        'JSON document creation without file bytes is deprecated. Use multipart POST /api/projects/:id/documents on the Next BFF.',
    });
  }

  async downloadDocument(user: AuthUser, projectId: string, docId: string) {
    try {
      return await this.projectDocumentsRead.getDocumentAccess(user, projectId, docId);
    } catch (error) {
      mapProjectsServiceError(error);
    }
  }

  async getSub(user: AuthUser, projectId: string, name: string) {
    await this.authz.assertProjectAccess(user, projectId, 'projects.read');
    if (!SUBCOLLECTION_ALLOWLIST.includes(name as SubcollectionName)) {
      throw new BadRequestException({
        error: `Subcollection not allowed. Allowed: ${SUBCOLLECTION_ALLOWLIST.join(', ')}`,
      });
    }
    const items = await this.repo.getSubcollection(projectId, name as SubcollectionName);
    return { success: true, name, items };
  }

  async postSub(
    user: AuthUser,
    projectId: string,
    name: string,
    body: Record<string, unknown>,
  ) {
    await this.authz.assertProjectAccess(user, projectId, 'projects.update');
    if (!SUBCOLLECTION_ALLOWLIST.includes(name as SubcollectionName)) {
      throw new BadRequestException({
        error: `Subcollection not allowed. Allowed: ${SUBCOLLECTION_ALLOWLIST.join(', ')}`,
      });
    }
    const item = await this.repo.appendSubcollection(
      projectId,
      name as SubcollectionName,
      body,
    );
    return { success: true, name, item };
  }

  private serializeProject(project: {
    id: string;
    name?: string | null;
    title?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    purchasePrice?: number | null;
    status?: string | null;
    currentPhase?: number;
    [key: string]: unknown;
  }) {
    const phaseNumber = project.currentPhase ?? 1;
    return {
      ...project,
      propertyName: project.name || project.title || '',
      currentPhase: this.repo.phaseNumberToName(phaseNumber),
      currentPhaseNumber: phaseNumber,
    };
  }
}
