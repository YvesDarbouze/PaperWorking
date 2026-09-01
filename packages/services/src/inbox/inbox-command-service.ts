import type { AuthUser } from '@paperworking/authz';
import { InboxItemNotFoundError } from './inbox-command-errors.js';
import type { InboxCommandRepository, InboxItemUpdateData } from './inbox-command-repository.js';
import type { InboxItemRecord } from './serialize-inbox-thread.js';

export type InboxPatchInput = {
  read?: boolean;
  archived?: boolean;
  title?: string;
  body?: string;
  href?: string;
};

export type InboxUpdateResult = {
  success: true;
  item: InboxItemRecord;
};

export type InboxDeleteResult = {
  success: true;
  deleted: true;
};

export type InboxCommandServiceDeps = {
  repository: InboxCommandRepository;
};

/**
 * Framework-neutral mutation use-cases for PATCH/DELETE /api/inbox/:id.
 * User ownership ACL: recipientUid === authUser.uid (no RBAC, no org ACL).
 */
export class InboxCommandService {
  constructor(private readonly deps: InboxCommandServiceDeps) {}

  async updateInboxItem(
    user: AuthUser,
    itemId: string,
    input: InboxPatchInput,
  ): Promise<InboxUpdateResult> {
    const existing = await this.deps.repository.findOwnedItem(user.uid, itemId);
    if (!existing) {
      throw new InboxItemNotFoundError();
    }

    const existingMeta =
      existing.metadata && typeof existing.metadata === 'object'
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};

    if (typeof input.archived === 'boolean') {
      existingMeta.archived = input.archived;
    }

    const data: InboxItemUpdateData = {
      read:
        typeof input.read === 'boolean'
          ? input.read
          : typeof input.archived === 'boolean' && input.archived
            ? true
            : undefined,
      title: typeof input.title === 'string' ? input.title : undefined,
      body: typeof input.body === 'string' ? input.body : undefined,
      href: typeof input.href === 'string' ? input.href : undefined,
      metadata: Object.keys(existingMeta).length ? existingMeta : undefined,
    };

    const item = await this.deps.repository.updateOwnedItem(user.uid, itemId, data);
    if (!item) {
      throw new InboxItemNotFoundError();
    }

    return { success: true, item };
  }

  async deleteInboxItem(user: AuthUser, itemId: string): Promise<InboxDeleteResult> {
    const deleted = await this.deps.repository.deleteOwnedItem(user.uid, itemId);
    if (!deleted) {
      throw new InboxItemNotFoundError();
    }
    return { success: true, deleted: true };
  }
}

export function createInboxCommandService(deps: InboxCommandServiceDeps): InboxCommandService {
  return new InboxCommandService(deps);
}
