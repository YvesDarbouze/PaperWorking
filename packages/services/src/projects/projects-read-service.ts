import {
  AuthorizationService,
  AuthzForbiddenError,
  AuthzNotFoundError,
  type AuthUser,
  type StoredProject,
} from '@paperworking/authz';
import type { ProjectsReadRepository } from './projects-read-repository.js';
import { serializeProject, type SerializedProject } from './serialize-project.js';

export class ProjectsReadValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ProjectsReadValidationError';
  }
}

export type ProjectsListResult = {
  success: true;
  projects: SerializedProject[];
};

export type ProjectGetResult = {
  success: true;
  project: SerializedProject;
};

export type ProjectsReadServiceDeps = {
  authz: AuthorizationService;
  repository: ProjectsReadRepository;
};

/**
 * Framework-neutral read use-cases for GET /api/projects and GET /api/projects/:id.
 * RBAC → Org ACL (list scope) → Resource ACL (detail) → repository.
 */
export class ProjectsReadService {
  constructor(private readonly deps: ProjectsReadServiceDeps) {}

  get authz(): AuthorizationService {
    return this.deps.authz;
  }

  async listProjects(user: AuthUser, q?: string): Promise<ProjectsListResult> {
    this.deps.authz.assertPermission(user, 'projects.read');
    const orgIds = await this.deps.authz.resolveUserOrgIds(user.uid);
    const projects = await this.deps.repository.listForUser(user.uid, orgIds, q);
    return {
      success: true,
      projects: projects.map((project) => serializeProject(project)),
    };
  }

  async getProjectById(user: AuthUser, projectId: string): Promise<ProjectGetResult> {
    const trimmed = projectId?.trim();
    if (!trimmed) {
      throw new ProjectsReadValidationError('Missing project ID');
    }

    const project = await this.deps.authz.assertProjectAccess(
      user,
      trimmed,
      'projects.read',
    );

    return {
      success: true,
      project: serializeProject(project as StoredProject),
    };
  }
}

export function createProjectsReadService(
  deps: ProjectsReadServiceDeps,
): ProjectsReadService {
  return new ProjectsReadService(deps);
}
