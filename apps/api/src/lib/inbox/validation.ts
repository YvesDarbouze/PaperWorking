export const INBOX_ACTIONS = ['confirm_paid', 'mark_late', 'search_again'] as const;

export type InboxAction = (typeof INBOX_ACTIONS)[number];

export interface CreateInboxItemBody {
  recipientUid?: unknown;
  organizationId?: unknown;
  type?: unknown;
  category?: unknown;
  title?: unknown;
  body?: unknown;
  senderName?: unknown;
  senderUid?: unknown;
  projectId?: unknown;
  projectName?: unknown;
  invitationId?: unknown;
  threadId?: unknown;
  actionUrl?: unknown;
  expiresAt?: unknown;
}

export interface CreateInboxItemInput {
  recipientUid: string;
  organizationId: string;
  type: string;
  category: string;
  title: string;
  itemBody: string;
  senderName: string;
  senderUid?: string;
  projectId?: string | null;
  projectName?: string | null;
  invitationId?: string | null;
  threadId?: string | null;
  actionUrl?: string | null;
  expiresAt?: string | null;
}

export function validateCreateInboxItemBody(
  body: CreateInboxItemBody,
): { ok: true; value: CreateInboxItemInput } | { ok: false; error: string } {
  const recipientUid = typeof body.recipientUid === 'string' ? body.recipientUid : '';
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
  const type = typeof body.type === 'string' ? body.type : '';
  const category = typeof body.category === 'string' ? body.category : '';
  const title = typeof body.title === 'string' ? body.title : '';
  const itemBody = typeof body.body === 'string' ? body.body : '';
  const senderName = typeof body.senderName === 'string' ? body.senderName : '';

  if (!recipientUid || !organizationId || !type || !category || !title || !itemBody || !senderName) {
    return {
      ok: false,
      error: 'Missing required fields: recipientUid, organizationId, type, category, title, body, senderName',
    };
  }

  return {
    ok: true,
    value: {
      recipientUid,
      organizationId,
      type,
      category,
      title,
      itemBody,
      senderName,
      senderUid: typeof body.senderUid === 'string' ? body.senderUid : undefined,
      projectId: typeof body.projectId === 'string' ? body.projectId : null,
      projectName: typeof body.projectName === 'string' ? body.projectName : null,
      invitationId: typeof body.invitationId === 'string' ? body.invitationId : null,
      threadId: typeof body.threadId === 'string' ? body.threadId : null,
      actionUrl: typeof body.actionUrl === 'string' ? body.actionUrl : null,
      expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
    },
  };
}

export function buildInboxItemDocument(
  input: CreateInboxItemInput,
  senderUid: string,
  itemId: string,
): Record<string, unknown> {
  return {
    id: itemId,
    recipientUid: input.recipientUid,
    organizationId: input.organizationId,
    type: input.type,
    category: input.category,
    title: input.title,
    body: input.itemBody,
    senderUid: input.senderUid || senderUid,
    senderName: input.senderName,
    senderAvatarInitial: input.senderName[0]?.toUpperCase() || 'P',
    projectId: input.projectId,
    projectName: input.projectName,
    invitationId: input.invitationId,
    threadId: input.threadId,
    actionUrl: input.actionUrl,
    read: false,
    archived: false,
    createdAt: new Date().toISOString(),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
  };
}

export function generateInboxItemId(now: () => number = Date.now): string {
  return `inb_${now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export interface UpdateInboxItemBody {
  read?: unknown;
  archived?: unknown;
  actionTaken?: unknown;
}

export function buildInboxItemUpdate(
  body: UpdateInboxItemBody,
): Record<string, unknown> | null {
  const updateData: Record<string, unknown> = {};

  if (typeof body.read === 'boolean') {
    updateData.read = body.read;
    if (body.read) {
      updateData.readAt = new Date().toISOString();
    }
  }
  if (typeof body.archived === 'boolean') {
    updateData.archived = body.archived;
  }
  if (typeof body.actionTaken === 'string' && body.actionTaken.trim()) {
    updateData.actionTaken = body.actionTaken;
  }

  return Object.keys(updateData).length > 0 ? updateData : null;
}

export function isInboxAction(value: unknown): value is InboxAction {
  return typeof value === 'string' && INBOX_ACTIONS.includes(value as InboxAction);
}

export function appendProjectNote(
  existingNotes: unknown,
  noteText: string,
): string | string[] {
  if (Array.isArray(existingNotes)) {
    return [...existingNotes, noteText];
  }
  if (typeof existingNotes === 'string' && existingNotes) {
    return `${existingNotes}\n${noteText}`;
  }
  return [noteText];
}

export function isInboxBackfillAdmin(user: { orgRole?: string } | null): boolean {
  return user?.orgRole === 'Lead Investor' || user?.orgRole === 'Admin';
}
