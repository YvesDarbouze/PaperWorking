import {
  handleTeamDelete,
  handleTeamGet,
  handleTeamPost,
  handleTeamPut,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  createOrgInvite,
  findOrgMember,
  listOrgMembers,
  ORG_ID,
  orgHasEmail,
  reactivateOrgMember,
  removeOrgMember,
  updateOrgMemberRole,
} from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

type RouteContext = { params: Promise<{ action?: string[] }> };

function teamDeps(uid: string) {
  return {
    requireAuth: async () => ({ uid }),
    loadContext: async () => ({
      orgId: ORG_ID,
      userData: { displayName: 'Alex Morgan', email: 'alex@paperworking.test', role: 'CEO' },
    }),
    listMembers: async (orgId: string) => listOrgMembers(orgId),
    createInvite: async (input: {
      orgId: string;
      email: string;
      role: string;
      invitedBy: string;
    }) => createOrgInvite(input),
    loadMember: async (memberId: string) => {
      const m = findOrgMember(memberId);
      if (!m) return null;
      return { id: m.userId ?? m.id, role: m.role, status: m.status };
    },
    listMembersForAdminCheck: async (orgId: string) =>
      listOrgMembers(orgId).members.map((m) => ({
        id: String(m.id),
        role: String(m.role),
        status: String(m.status).toLowerCase() === 'active' ? 'active' : String(m.status),
      })),
    updateRole: async (memberId: string, role: string) => updateOrgMemberRole(memberId, role),
    reactivateMember: async (memberId: string) => reactivateOrgMember(memberId),
    removeMember: async (memberId: string, hardDelete: boolean) =>
      removeOrgMember(memberId, hardDelete),
    checkExistingMember: async (orgId: string, email: string) => orgHasEmail(orgId, email),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }
  const { action = [] } = await context.params;
  const result = await handleTeamGet(action, teamDeps(auth.uid));
  return toNextResponse(result);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }
  const { action = [] } = await context.params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const result = await handleTeamPost(action, body, teamDeps(auth.uid));
  return toNextResponse(result);
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }
  const { action = [] } = await context.params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const result = await handleTeamPut(action, body, teamDeps(auth.uid));
  return toNextResponse(result);
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }
  const { action = [] } = await context.params;
  const url = new URL(request.url);
  const result = await handleTeamDelete(
    action,
    { hard: url.searchParams.get('hard') },
    teamDeps(auth.uid),
  );
  return toNextResponse(result);
}
