import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorizationService as CoreAuthorizationService,
  AuthzForbiddenError,
  AuthzNotFoundError,
  type Permission,
  type StoredDeal,
  type StoredProject,
} from '@paperworking/authz';
import { createAuthzStore } from '@paperworking/database';
import type { AuthUser } from '../auth/auth.types.js';

function mapAuthzError(error: unknown): never {
  if (error instanceof AuthzForbiddenError) {
    throw new ForbiddenException(error.payload);
  }
  if (error instanceof AuthzNotFoundError) {
    throw new NotFoundException(error.payload);
  }
  throw error;
}

/**
 * Nest adapter for @paperworking/authz AuthorizationService.
 * Preserves V1 RBAC behavior via runtime authz router (Firestore).
 */
@Injectable()
export class AuthorizationService {
  private readonly core: CoreAuthorizationService<StoredProject, StoredDeal>;

  constructor() {
    this.core = new CoreAuthorizationService(createAuthzStore());
  }

  hasPermission(user: AuthUser, permission: Permission): boolean {
    return this.core.hasPermission(user, permission);
  }

  assertPermission(user: AuthUser, permission: Permission): void {
    try {
      this.core.assertPermission(user, permission);
    } catch (error) {
      mapAuthzError(error);
    }
  }

  resolveUserOrgIds(userId: string): Promise<string[]> {
    return this.core.resolveUserOrgIds(userId);
  }

  async assertOrgAccess(user: AuthUser, organizationId: string): Promise<void> {
    try {
      await this.core.assertOrgAccess(user, organizationId);
    } catch (error) {
      mapAuthzError(error);
    }
  }

  resolveTrustedOrgId(
    user: AuthUser,
    clientOrgId?: string | null,
  ): Promise<string | undefined> {
    return this.core.resolveTrustedOrgId(user, clientOrgId);
  }

  async assertProjectAccess(
    user: AuthUser,
    projectId: string,
    permission: Extract<
      Permission,
      'projects.read' | 'projects.update' | 'projects.delete' | 'projects.create'
    > = 'projects.read',
  ) {
    try {
      return await this.core.assertProjectAccess(user, projectId, permission);
    } catch (error) {
      mapAuthzError(error);
    }
  }

  async assertDealAccess(
    user: AuthUser,
    dealId: string,
    permission: Extract<
      Permission,
      'deals.read' | 'deals.update' | 'deals.delete' | 'deals.create'
    > = 'deals.read',
  ) {
    try {
      return await this.core.assertDealAccess(user, dealId, permission);
    } catch (error) {
      mapAuthzError(error);
    }
  }

  async assertAssigneeInProjectScope(
    user: AuthUser,
    projectId: string,
    assigneeId: string,
  ): Promise<void> {
    try {
      await this.core.assertAssigneeInProjectScope(user, projectId, assigneeId);
    } catch (error) {
      mapAuthzError(error);
    }
  }

  resolveInboxRecipientUid(
    user: AuthUser,
    requestedRecipientUid?: string | null,
  ): Promise<string> {
    return this.core.resolveInboxRecipientUid(user, requestedRecipientUid).catch(mapAuthzError);
  }

  async assertMessageRecipientAllowed(
    user: AuthUser,
    recipientId: string,
    threadId?: string | null,
  ): Promise<void> {
    try {
      await this.core.assertMessageRecipientAllowed(user, recipientId, threadId);
    } catch (error) {
      mapAuthzError(error);
    }
  }

  async assertTeamManage(user: AuthUser, organizationId: string): Promise<void> {
    try {
      await this.core.assertTeamManage(user, organizationId);
    } catch (error) {
      mapAuthzError(error);
    }
  }

  async assertThreadAccess(user: AuthUser, threadId: string): Promise<void> {
    try {
      await this.core.assertThreadAccess(user, threadId);
    } catch (error) {
      mapAuthzError(error);
    }
  }

  accessibleProjectsWhere(user: AuthUser): Promise<Record<string, unknown>> {
    return this.core.accessibleProjectsWhere(user);
  }
}
