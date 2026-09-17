import { type NextRequest, NextResponse } from 'next/server';
import {
  handleSettingsGet,
  handleSettingsPut,
  handleSettingsPost,
  handleSettingsDelete,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  requireDevSessionAuth,
  isDevAuthFailure,
} from '@/lib/projects/dev-session-auth';
import {
  getUserProfile,
  updateUserProfile,
  getUserBilling,
  updateUserBilling,
  getUserSecurity,
  updateUserSecurity,
} from '@/lib/settings/settings-store';

interface RouteContext {
  params: Promise<{ section?: string[] }>;
}

async function getAuthContext() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) return auth;
  return { uid: auth.uid };
}

function createSettingsDeps() {
  return {
    requireAuth: async () => getAuthContext(),
    loadUser: async (uid: string) => {
      const profile = await getUserProfile(uid);
      const billing = await getUserBilling(uid);
      return {
        ...profile,
        subscriptionPlan: billing.plan,
        subscriptionStatus: billing.subscriptionStatus,
        paymentMethods: billing.paymentMethods,
        invoices: billing.invoices,
      };
    },
    updateUser: async (uid: string, patch: Record<string, unknown>) => {
      if (patch.subscriptionPlan || patch.subscriptionStatus || patch.paymentMethods) {
        await updateUserBilling(uid, {
          ...(patch.subscriptionPlan ? { plan: String(patch.subscriptionPlan) } : {}),
          ...(patch.subscriptionStatus ? { subscriptionStatus: String(patch.subscriptionStatus), status: String(patch.subscriptionStatus) } : {}),
          ...(patch.paymentMethods ? { paymentMethods: patch.paymentMethods as any } : {}),
        });
      }
      return updateUserProfile(uid, patch);
    },
    loadOrg: async () => {
      const auth = await getAuthContext();
      const sec = !isDevAuthFailure(auth) ? await getUserSecurity(auth.uid) : {};
      return {
        name: 'Apex Capital Partners LLC',
        timezone: 'America/Chicago',
        targetCapRate: 5.5,
        targetCoc: 8.0,
        minDscr: 1.25,
        maxPurchasePrice: 500000,
        ...sec,
      };
    },
    updateOrg: async (_orgId: string, patch: Record<string, unknown>) => {
      const auth = await getAuthContext();
      if (!isDevAuthFailure(auth)) {
        await updateUserSecurity(auth.uid, patch);
      }
      return patch;
    },
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { section: sectionPath = [] } = await context.params;
  const auth = await getAuthContext();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  // Fallback for root /api/settings
  if (sectionPath.length === 0) {
    const profile = await getUserProfile(auth.uid);
    const billing = await getUserBilling(auth.uid);
    const security = await getUserSecurity(auth.uid);
    return NextResponse.json({
      status: 'ok',
      profile,
      billing,
      security,
    });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = { id: searchParams.get('id') };
  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const result = await handleSettingsGet(sectionPath, query, headers, createSettingsDeps());
  return toNextResponse(result);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { section: sectionPath = [] } = await context.params;
  const auth = await getAuthContext();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await handleSettingsPut(sectionPath, body, createSettingsDeps());
    return toNextResponse(result);
  } catch (err: any) {
    console.error(`[SettingsAPI] PUT /api/settings/${sectionPath.join('/')} failed:`, err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Database persistence failure. Please retry.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { section: sectionPath = [] } = await context.params;
  const auth = await getAuthContext();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await handleSettingsPost(sectionPath, body, createSettingsDeps());
    return toNextResponse(result);
  } catch (err: any) {
    console.error(`[SettingsAPI] POST /api/settings/${sectionPath.join('/')} failed:`, err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Database persistence failure. Please retry.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { section: sectionPath = [] } = await context.params;
  const auth = await getAuthContext();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await handleSettingsDelete(sectionPath, body, createSettingsDeps());
    return toNextResponse(result);
  } catch (err: any) {
    console.error(`[SettingsAPI] DELETE /api/settings/${sectionPath.join('/')} failed:`, err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Database persistence failure. Please retry.' },
      { status: 500 },
    );
  }
}
