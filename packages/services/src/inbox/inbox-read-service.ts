import type { AuthUser } from '@paperworking/authz';
import type { InboxReadRepository } from './inbox-read-repository.js';
import {
  serializeInboxThread,
  type InboxListResult,
} from './serialize-inbox-thread.js';

export type InboxReadServiceDeps = {
  repository: InboxReadRepository;
};

/**
 * Framework-neutral read use-case for GET /api/inbox.
 * User ownership ACL: rows filtered to recipientUid === authUser.uid (no org-wide inbox).
 */
export class InboxReadService {
  constructor(private readonly deps: InboxReadServiceDeps) {}

  async listInbox(user: AuthUser): Promise<InboxListResult> {
    const items = await this.deps.repository.listForRecipient(user.uid);
    const threads = items.map(serializeInboxThread);
    return { success: true, items, threads };
  }
}

export function createInboxReadService(deps: InboxReadServiceDeps): InboxReadService {
  return new InboxReadService(deps);
}
