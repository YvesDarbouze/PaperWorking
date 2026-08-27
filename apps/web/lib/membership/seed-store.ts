/**
 * In-memory membership seed — mirrors approved Firestore collections:
 * - organizationMembers (SoT for org roster)
 * - projectMembers (SoT for project RBAC)
 * - taskAssignments
 * - messageThreads + messages
 *
 * Used by Next.js API adapters until live Firestore wiring replaces seed.
 * Does NOT delete packageShareTokens / support_taxonomy / real prod data.
 */

export type OrgMemberSeed = {
  id: string;
  organizationId: string;
  userId?: string;
  email: string;
  displayName: string;
  role: string;
  status: 'invited' | 'active' | 'removed' | 'suspended';
  invitedBy?: string;
  invitedAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMemberSeed = {
  id: string;
  projectId: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'TEAM_LEAD' | 'TEAM_MEMBER' | 'VENDOR';
  status: 'invited' | 'active' | 'removed' | 'suspended';
  displayName?: string;
  email?: string;
  invitedBy?: string;
  invitedAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskAssignmentSeed = {
  id: string;
  projectId: string;
  organizationId: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assigneeId: string;
  assignerId: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageThreadSeed = {
  id: string;
  participantUids: string[];
  participantKey: string;
  type: 'direct' | 'project' | 'deal';
  projectId?: string;
  organizationId?: string;
  subject?: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  lastSenderUid?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageSeed = {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  attachmentProjectId?: string | null;
};

const now = '2026-08-26T00:00:00.000Z';

export const ORG_ID = 'org-1';

export let ORGANIZATION_MEMBERS: OrgMemberSeed[] = [
  {
    id: `${ORG_ID}_dev-user-1`,
    organizationId: ORG_ID,
    userId: 'dev-user-1',
    email: 'alex@paperworking.test',
    displayName: 'Alex Morgan',
    role: 'CEO',
    status: 'active',
    invitedAt: now,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: `${ORG_ID}_member-2`,
    organizationId: ORG_ID,
    userId: 'member-2',
    email: 'jordan@paperworking.test',
    displayName: 'Jordan Lee',
    role: 'Deal Lead',
    status: 'active',
    invitedAt: now,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: `${ORG_ID}_member-3`,
    organizationId: ORG_ID,
    email: 'sam@paperworking.test',
    displayName: 'Sam Rivera',
    role: 'Contributor',
    status: 'invited',
    invitedBy: 'dev-user-1',
    invitedAt: '2026-08-20T14:00:00.000Z',
    createdAt: '2026-08-20T14:00:00.000Z',
    updatedAt: '2026-08-20T14:00:00.000Z',
  },
  {
    id: `${ORG_ID}_member-4`,
    organizationId: ORG_ID,
    userId: 'member-4',
    email: 'casey@paperworking.test',
    displayName: 'Casey Nguyen',
    role: 'CFO',
    status: 'active',
    invitedAt: now,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  },
];

export let PROJECT_MEMBERS: ProjectMemberSeed[] = [
  {
    id: 'proj-1_dev-user-1',
    projectId: 'proj-1',
    userId: 'dev-user-1',
    organizationId: ORG_ID,
    role: 'OWNER',
    status: 'active',
    displayName: 'Alex Morgan',
    email: 'alex@paperworking.test',
    invitedAt: now,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'proj-1_member-2',
    projectId: 'proj-1',
    userId: 'member-2',
    organizationId: ORG_ID,
    role: 'TEAM_LEAD',
    status: 'active',
    displayName: 'Jordan Lee',
    email: 'jordan@paperworking.test',
    invitedBy: 'dev-user-1',
    invitedAt: now,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'proj-2_dev-user-1',
    projectId: 'proj-2',
    userId: 'dev-user-1',
    organizationId: ORG_ID,
    role: 'OWNER',
    status: 'active',
    displayName: 'Alex Morgan',
    email: 'alex@paperworking.test',
    invitedAt: now,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'proj-2_member-4',
    projectId: 'proj-2',
    userId: 'member-4',
    organizationId: ORG_ID,
    role: 'TEAM_MEMBER',
    status: 'active',
    displayName: 'Casey Nguyen',
    email: 'casey@paperworking.test',
    invitedBy: 'dev-user-1',
    invitedAt: now,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  },
];

export let TASK_ASSIGNMENTS: TaskAssignmentSeed[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    organizationId: ORG_ID,
    title: 'Upload LOI package',
    description: 'Signed LOI, POF letter, entity W-9',
    status: 'open',
    priority: 'high',
    assigneeId: 'dev-user-1',
    assignerId: 'member-2',
    dueAt: '2026-08-28T00:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  },
];

export let MESSAGE_THREADS: MessageThreadSeed[] = [
  {
    id: 'thread-msg-1',
    participantUids: ['dev-user-1', 'member-2'],
    participantKey: 'dev-user-1_member-2',
    type: 'project',
    projectId: 'proj-1',
    organizationId: ORG_ID,
    subject: 'LOI package review',
    lastMessagePreview: 'Can you upload the W-9 today?',
    lastMessageAt: now,
    lastSenderUid: 'member-2',
    createdBy: 'member-2',
    createdAt: now,
    updatedAt: now,
  },
];

export let MESSAGES: MessageSeed[] = [
  {
    id: 'msg-1',
    threadId: 'thread-msg-1',
    senderId: 'member-2',
    recipientId: 'dev-user-1',
    subject: 'LOI package review',
    body: 'Can you upload the W-9 today?',
    read: false,
    createdAt: now,
    attachmentProjectId: 'proj-1',
  },
];

export function listOrgMembers(orgId: string) {
  const members = ORGANIZATION_MEMBERS.filter(
    (m) => m.organizationId === orgId && m.status !== 'removed',
  );
  const invites = members.filter((m) => m.status === 'invited');
  return {
    members: members.map((m) => ({
      id: m.userId ?? m.id,
      membershipId: m.id,
      name: m.displayName,
      email: m.email,
      role: m.role,
      status: m.status === 'active' ? 'Active' : m.status === 'invited' ? 'Invited' : m.status,
      type: 'Internal',
    })),
    invites: invites.map((m) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      status: 'Invited',
      invitedAt: m.invitedAt,
    })),
  };
}

export function createOrgInvite(input: {
  orgId: string;
  email: string;
  role: string;
  invitedBy: string;
}) {
  const id = `${input.orgId}_invite_${Date.now()}`;
  const stamp = new Date().toISOString();
  ORGANIZATION_MEMBERS = [
    ...ORGANIZATION_MEMBERS,
    {
      id,
      organizationId: input.orgId,
      email: input.email,
      displayName: input.email.split('@')[0] ?? input.email,
      role: input.role,
      status: 'invited',
      invitedBy: input.invitedBy,
      invitedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
  return { inviteId: id };
}

export function updateOrgMemberRole(memberId: string, role: string) {
  ORGANIZATION_MEMBERS = ORGANIZATION_MEMBERS.map((m) => {
    if (m.id === memberId || m.userId === memberId) {
      return { ...m, role, updatedAt: new Date().toISOString() };
    }
    return m;
  });
}

export function reactivateOrgMember(memberId: string) {
  ORGANIZATION_MEMBERS = ORGANIZATION_MEMBERS.map((m) => {
    if (m.id === memberId || m.userId === memberId) {
      return { ...m, status: 'active', updatedAt: new Date().toISOString() };
    }
    return m;
  });
}

export function removeOrgMember(memberId: string, hardDelete: boolean) {
  if (hardDelete) {
    ORGANIZATION_MEMBERS = ORGANIZATION_MEMBERS.filter(
      (m) => m.id !== memberId && m.userId !== memberId,
    );
    return;
  }
  ORGANIZATION_MEMBERS = ORGANIZATION_MEMBERS.map((m) => {
    if (m.id === memberId || m.userId === memberId) {
      return { ...m, status: 'removed', updatedAt: new Date().toISOString() };
    }
    return m;
  });
}

export function findOrgMember(memberId: string) {
  return (
    ORGANIZATION_MEMBERS.find((m) => m.id === memberId || m.userId === memberId) ?? null
  );
}

export function orgHasEmail(orgId: string, email: string) {
  const needle = email.trim().toLowerCase();
  return ORGANIZATION_MEMBERS.some(
    (m) =>
      m.organizationId === orgId &&
      m.email.toLowerCase() === needle &&
      m.status !== 'removed',
  );
}

export function listProjectMembers(projectId?: string, userId?: string) {
  return PROJECT_MEMBERS.filter((m) => {
    if (m.status === 'removed') return false;
    if (projectId && m.projectId !== projectId) return false;
    if (userId && m.userId !== userId) return false;
    return true;
  });
}

export function upsertProjectMember(input: Omit<ProjectMemberSeed, 'createdAt' | 'updatedAt' | 'invitedAt'> & {
  invitedAt?: string;
}) {
  const stamp = new Date().toISOString();
  const existing = PROJECT_MEMBERS.findIndex((m) => m.id === input.id);
  const doc: ProjectMemberSeed = {
    ...input,
    invitedAt: input.invitedAt ?? stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
  if (existing >= 0) {
    PROJECT_MEMBERS = PROJECT_MEMBERS.map((m, i) =>
      i === existing ? { ...doc, createdAt: m.createdAt } : m,
    );
  } else {
    PROJECT_MEMBERS = [...PROJECT_MEMBERS, doc];
  }
  return doc;
}

export function createTaskAssignment(input: {
  taskId: string;
  assigneeUid: string;
  projectId: string | null;
  assignedBy: string;
  title?: string;
}) {
  const stamp = new Date().toISOString();
  const id = input.taskId || `task_${Date.now()}`;
  const doc: TaskAssignmentSeed = {
    id,
    projectId: input.projectId ?? 'unscoped',
    organizationId: ORG_ID,
    title: input.title ?? `Assigned task ${id}`,
    status: 'open',
    priority: 'normal',
    assigneeId: input.assigneeUid,
    assignerId: input.assignedBy,
    createdAt: stamp,
    updatedAt: stamp,
  };
  TASK_ASSIGNMENTS = [...TASK_ASSIGNMENTS, doc];
  return id;
}

export function listMessages(query: { userId?: string | null; threadId?: string | null }) {
  return MESSAGES.filter((m) => {
    if (query.threadId && m.threadId !== query.threadId) return false;
    if (query.userId && m.senderId !== query.userId && m.recipientId !== query.userId) {
      return false;
    }
    return true;
  });
}

export function createMessage(input: {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  attachmentProjectId: string | null;
}) {
  const stamp = new Date().toISOString();
  const message: MessageSeed = {
    ...input,
    read: false,
    createdAt: stamp,
  };
  MESSAGES = [...MESSAGES, message];

  const existingThread = MESSAGE_THREADS.find((t) => t.id === input.threadId);
  if (existingThread) {
    MESSAGE_THREADS = MESSAGE_THREADS.map((t) =>
      t.id === input.threadId
        ? {
            ...t,
            lastMessagePreview: input.body.slice(0, 120),
            lastMessageAt: stamp,
            lastSenderUid: input.senderId,
            updatedAt: stamp,
          }
        : t,
    );
  } else {
    const participants = [input.senderId, input.recipientId].sort();
    MESSAGE_THREADS = [
      ...MESSAGE_THREADS,
      {
        id: input.threadId,
        participantUids: participants,
        participantKey: participants.join('_'),
        type: input.attachmentProjectId ? 'project' : 'direct',
        projectId: input.attachmentProjectId ?? undefined,
        organizationId: ORG_ID,
        subject: input.subject,
        lastMessagePreview: input.body.slice(0, 120),
        lastMessageAt: stamp,
        lastSenderUid: input.senderId,
        createdBy: input.senderId,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ];
  }

  return message;
}

export function listMessageThreads(userId?: string) {
  if (!userId) return MESSAGE_THREADS;
  return MESSAGE_THREADS.filter((t) => t.participantUids.includes(userId));
}
