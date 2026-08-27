import {
  handleSettingsDelete,
  handleSettingsGet,
  handleSettingsPost,
  handleSettingsPut,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { listOrgMembers, ORG_ID } from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

type Ctx = { params: Promise<{ section?: string[] }> };

const settingsUserStore = new Map<string, Record<string, unknown>>();

function defaultUser(uid: string): Record<string, unknown> {
  return (
    settingsUserStore.get(uid) ?? {
      displayName: 'Alex Morgan',
      email: 'alex@paperworking.test',
      role: 'Lead Investor',
      organizationId: ORG_ID,
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
      timezone: 'America/New_York',
      phone: '+1 (512) 555-0142',
      companyName: 'PaperWorking Capital',
      twoFaEnabled: false,
    }
  );
}

function settingsDeps(uid: string) {
  return {
    requireAuth: async () => ({ uid }),
    loadUser: async (id: string) => defaultUser(id),
    loadOrg: async () => ({
      id: ORG_ID,
      name: 'PaperWorking Preview Org',
      logoUrl: '',
    }),
    updateUser: async (id: string, patch: Record<string, unknown>) => {
      const next = { ...defaultUser(id), ...patch };
      settingsUserStore.set(id, next);
      return next;
    },
    updateOrg: async (_orgId: string, patch: Record<string, unknown>) => patch,
    listTeam: async (orgId: string) => listOrgMembers(orgId),
    createTeamInvite: async () => undefined,
    removeTeamMember: async () => undefined,
    listConnectedIntegrations: async () => ['google-drive'],
    resolveOrgId: () => ORG_ID,
  };
}

export async function GET(request: Request, context: Ctx) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  const { section = [] } = await context.params;
  const url = new URL(request.url);
  const result = await handleSettingsGet(
    section,
    { id: url.searchParams.get('id') },
    Object.fromEntries(request.headers.entries()),
    settingsDeps(auth.uid),
  );
  return toNextResponse(result);
}

export async function PUT(request: Request, context: Ctx) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  const { section = [] } = await context.params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await handleSettingsPut(
    section,
    body,
    Object.fromEntries(request.headers.entries()),
    settingsDeps(auth.uid),
  );
  return toNextResponse(result);
}

export async function POST(request: Request, context: Ctx) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  const { section = [] } = await context.params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await handleSettingsPost(section, body, settingsDeps(auth.uid));
  return toNextResponse(result);
}

export async function DELETE(request: Request, context: Ctx) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  const { section = [] } = await context.params;
  const url = new URL(request.url);
  const result = await handleSettingsDelete(
    section,
    { id: url.searchParams.get('id') },
    settingsDeps(auth.uid),
  );
  return toNextResponse(result);
}
