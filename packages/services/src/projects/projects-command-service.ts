import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { ProjectsCommandValidationError } from './projects-command-errors.js';
import type {
  ProjectCommandRecord,
  ProjectsCommandRepository,
} from './projects-command-repository.js';

export type CreateProjectInput = {
  name?: string;
  /** UI alias — mapped to name when name is absent (browser wizard compat). */
  propertyName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  purchasePrice?: number;
  organizationId?: string;
  dealId?: string;
  dealSlug?: string;
};

export type UpdateProjectInput = Record<string, unknown>;

export type ProjectCreateResult = {
  success: true;
  project: ProjectCommandRecord;
};

export type ProjectUpdateResult = {
  success: true;
  project: ProjectCommandRecord;
};

export type ProjectsCommandServiceDeps = {
  authz: AuthorizationService;
  repository: ProjectsCommandRepository;
};

const PATCH_ALLOWED_FIELDS = [
  'name',
  'title',
  'address',
  'city',
  'state',
  'zip',
  'purchasePrice',
  'status',
  'visibility',
  'currentPhase',
  'dealId',
  'dealSlug',
] as const;

/**
 * Framework-neutral mutation use-cases for POST/PATCH /api/projects*.
 * CREATE: RBAC projects.create → trusted org resolution → repository.
 * UPDATE: RBAC projects.update → project/resource ACL → allowlisted patch → repository.
 */
export class ProjectsCommandService {
  constructor(private readonly deps: ProjectsCommandServiceDeps) {}

  private resolveCreateName(input: CreateProjectInput): string {
    const fromName = typeof input.name === 'string' ? input.name.trim() : '';
    if (fromName) return fromName;
    const fromProperty =
      typeof input.propertyName === 'string' ? input.propertyName.trim() : '';
    return fromProperty;
  }

  async createProject(user: AuthUser, input: CreateProjectInput): Promise<ProjectCreateResult> {
    this.deps.authz.assertPermission(user, 'projects.create');

    const name = this.resolveCreateName(input);
    if (!name) {
      throw new ProjectsCommandValidationError('name is required');
    }

    const organizationId = await this.deps.authz.resolveTrustedOrgId(
      user,
      input.organizationId,
    );

    let dealId: string | undefined;
    if (typeof input.dealId === 'string' && input.dealId.trim()) {
      await this.deps.authz.assertDealAccess(user, input.dealId.trim(), 'deals.update');
      dealId = input.dealId.trim();
    }

    const project = await this.deps.repository.create({
      name,
      address: input.address,
      city: input.city,
      state: input.state,
      zip: input.zip,
      purchasePrice: input.purchasePrice,
      organizationId,
      userId: user.uid,
      dealId,
      dealSlug: typeof input.dealSlug === 'string' ? input.dealSlug.trim() || undefined : undefined,
    });

    return { success: true, project };
  }

  async updateProject(
    user: AuthUser,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectUpdateResult> {
    const trimmed = projectId?.trim();
    if (!trimmed) {
      throw new ProjectsCommandValidationError('Missing project ID');
    }

    await this.deps.authz.assertProjectAccess(user, trimmed, 'projects.update');

    const patch: Record<string, unknown> = {};
    for (const key of PATCH_ALLOWED_FIELDS) {
      if (input[key] !== undefined) {
        patch[key] = input[key];
      }
    }

    if (typeof input.organizationId === 'string') {
      await this.deps.authz.assertOrgAccess(user, input.organizationId);
      patch.organizationId = input.organizationId;
    }

    if (typeof input.dealId === 'string' && input.dealId.trim()) {
      await this.deps.authz.assertDealAccess(user, input.dealId.trim(), 'deals.update');
      patch.dealId = input.dealId.trim();
    }

    const project = await this.deps.repository.update(trimmed, patch);
    return { success: true, project };
  }
}

export function createProjectsCommandService(
  deps: ProjectsCommandServiceDeps,
): ProjectsCommandService {
  return new ProjectsCommandService(deps);
}
