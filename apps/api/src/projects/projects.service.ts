import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import {
  ProjectsRepository,
  SUBCOLLECTION_ALLOWLIST,
  type SubcollectionName,
} from './projects.repository.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly repo: ProjectsRepository,
    private readonly authz: AuthorizationService,
  ) {}

  async list(user: AuthUser, q?: string) {
    this.authz.assertPermission(user, 'projects.read');
    const orgIds = await this.authz.resolveUserOrgIds(user.uid);
    const projects = await this.repo.list(user.uid, q, orgIds);
    return { success: true, projects };
  }

  async create(
    user: AuthUser,
    body: {
      name: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      purchasePrice?: number;
      organizationId?: string;
    },
  ) {
    this.authz.assertPermission(user, 'projects.create');
    const organizationId = await this.authz.resolveTrustedOrgId(
      user,
      body.organizationId,
    );
    const project = await this.repo.create({
      ...body,
      organizationId,
      userId: user.uid,
    });
    return { success: true, project };
  }

  async getById(user: AuthUser, id: string) {
    const project = await this.authz.assertProjectAccess(user, id, 'projects.read');
    return { success: true, project };
  }

  async patch(user: AuthUser, id: string, body: Record<string, unknown>) {
    await this.authz.assertProjectAccess(user, id, 'projects.update');
    const allowed = [
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
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    // organizationId changes must be membership-verified
    if (typeof body.organizationId === 'string') {
      await this.authz.assertOrgAccess(user, body.organizationId);
      patch.organizationId = body.organizationId;
    }
    const project = await this.repo.update(id, patch);
    return { success: true, project };
  }

  async currentKpis(user: AuthUser, id: string) {
    const project = await this.authz.assertProjectAccess(user, id, 'projects.read');
    const purchasePrice = project.purchasePrice ?? 0;
    return {
      success: true,
      projectId: id,
      kpis: {
        purchasePrice,
        // Heuristic multipliers removed — formulas unknown; do not present as real.
        estimatedArv: null,
        estimatedEquity: null,
        estimatedCashNeeded: null,
        estimatedArvStatus: 'unavailable',
        estimatedEquityStatus: 'unavailable',
        estimatedCashNeededStatus: 'unavailable',
        currentPhase: this.repo.phaseNumberToName(project.currentPhase),
        incomplete: true,
      },
    };
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
    await this.authz.assertProjectAccess(user, projectId, 'projects.read');
    const documents = await this.repo.listDocuments(projectId);
    return { success: true, documents };
  }

  async createDocument(
    projectId: string,
    body: {
      name: string;
      mimeType?: string;
      storageKey?: string;
      sizeBytes?: number;
      metadata?: Record<string, unknown>;
    },
    user: AuthUser,
  ) {
    await this.authz.assertProjectAccess(user, projectId, 'projects.update');
    const document = await this.repo.createDocument(projectId, {
      ...body,
      uploadedBy: user.uid,
    });
    return { success: true, document };
  }

  async downloadDocument(user: AuthUser, projectId: string, docId: string) {
    await this.authz.assertProjectAccess(user, projectId, 'projects.read');
    const document = await this.repo.getDocument(projectId, docId);
    return {
      success: true,
      document: {
        id: document.id,
        name: document.name,
        mimeType: document.mimeType,
        storageKey: document.storageKey,
        sizeBytes: document.sizeBytes,
        metadata: document.metadata,
      },
    };
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
}
