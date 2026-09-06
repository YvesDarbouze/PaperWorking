import { createHash, randomUUID } from 'node:crypto';
import type { AuthUser, AuthorizationService } from '@paperworking/authz';
import { assertAdminUser } from './assert-admin.js';
import {
  formatAccountTypeLabel,
  normalizeAdminAssignableAccountType,
  type AdminAssignableAccountType,
} from './admin-account-types.js';
import type { AdminReadRepository, AdminUserListRow } from './admin-read-repository.js';

export type AdminUserCommandRepository = {
  updateUserAccountType(input: {
    documentId: string;
    accountType: AdminAssignableAccountType;
    clearPlatformAdminRole: boolean;
  }): Promise<void>;
  writeAuditLog(data: {
    actorUid: string;
    actorEmail: string;
    actorRole: string;
    action: string;
    targetResource: string;
    targetResourceId?: string;
    status: string;
    entryHash: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
};

export type AdminUserCommandServiceDeps = {
  authz: AuthorizationService;
  readRepository: AdminReadRepository;
  commandRepository: AdminUserCommandRepository;
};

function buildAuditHash(parts: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 24);
}

function previousAccountType(row: AdminUserListRow): string {
  return (row.accountType || 'investor').trim().toLowerCase();
}

/**
 * PATCH admin user account type — DB-authoritative platform tier change + audit log.
 */
export class AdminUserCommandService {
  constructor(private readonly deps: AdminUserCommandServiceDeps) {}

  async updateAccountType(
    actor: AuthUser,
    lookupId: string,
    nextAccountTypeRaw: unknown,
  ): Promise<{
    success: true;
    user: {
      id: string;
      documentId: string;
      email: string;
      accountType: AdminAssignableAccountType;
      accountTypeLabel: string;
    };
  }> {
    assertAdminUser(actor, this.deps.authz);

    const nextAccountType = normalizeAdminAssignableAccountType(nextAccountTypeRaw);
    if (!nextAccountType) {
      throw new AdminUserCommandError('Invalid accountType', 400);
    }

    const target = await this.deps.readRepository.findUserByLookupId(lookupId);
    if (!target) {
      throw new AdminUserCommandError('User not found', 404);
    }

    const previous = previousAccountType(target);
    if (previous === nextAccountType) {
      return {
        success: true,
        user: {
          id: target.id,
          documentId: target.documentId,
          email: target.email,
          accountType: nextAccountType,
          accountTypeLabel: formatAccountTypeLabel(nextAccountType),
        },
      };
    }

    if (
      previous === 'admin' &&
      nextAccountType !== 'admin' &&
      (target.id === actor.uid || target.email === actor.email)
    ) {
      throw new AdminUserCommandError('Cannot remove your own platform admin access', 403);
    }

    const clearPlatformAdminRole =
      nextAccountType !== 'admin' && (target.jobTitle || '').trim().toLowerCase() === 'admin';

    await this.deps.commandRepository.updateUserAccountType({
      documentId: target.documentId,
      accountType: nextAccountType,
      clearPlatformAdminRole,
    });

    await this.deps.commandRepository.writeAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email || 'unknown',
      actorRole: actor.accountType || 'admin',
      action: 'user.accountType.update',
      targetResource: 'user',
      targetResourceId: target.documentId,
      status: 'success',
      entryHash: buildAuditHash({
        actorUid: actor.uid,
        targetDocumentId: target.documentId,
        previousAccountType: previous,
        nextAccountType,
        at: new Date().toISOString(),
        nonce: randomUUID(),
      }),
      metadata: {
        targetUid: target.id,
        targetEmail: target.email,
        previousAccountType: previous,
        nextAccountType,
        previousJobTitle: target.jobTitle,
        previousOrgRole: target.orgRole,
      },
    });

    return {
      success: true,
      user: {
        id: target.id,
        documentId: target.documentId,
        email: target.email,
        accountType: nextAccountType,
        accountTypeLabel: formatAccountTypeLabel(nextAccountType),
      },
    };
  }
}

export class AdminUserCommandError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AdminUserCommandError';
  }
}

export function createAdminUserCommandService(
  deps: AdminUserCommandServiceDeps,
): AdminUserCommandService {
  return new AdminUserCommandService(deps);
}
