import { type NextRequest, NextResponse } from 'next/server';
import {
  handleBillingGet,
  handleBillingPost,
  handleBillingPut,
  handleBillingDelete,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  requireDevSessionAuth,
  isDevAuthFailure,
} from '@/lib/projects/dev-session-auth';
import {
  getUserBilling,
  updateUserBilling,
} from '@/lib/settings/settings-store';

interface RouteContext {
  params: Promise<{ action?: string[] }>;
}

async function getAuthContext() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) return auth;
  return { uid: auth.uid };
}

function createBillingDeps() {
  return {
    requireAuth: async () => getAuthContext(),
    loadUser: async (uid: string) => {
      const billing = await getUserBilling(uid);
      return {
        paymentMethods: billing.paymentMethods as any,
        invoices: billing.invoices as any,
      };
    },
    updateUser: async (uid: string, patch: Record<string, unknown>) => {
      await updateUserBilling(uid, patch as any);
    },
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { action: actionPath = [] } = await context.params;
  const auth = await getAuthContext();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  // Root /api/billing returns full billing summary
  if (actionPath.length === 0) {
    const billing = await getUserBilling(auth.uid);
    return NextResponse.json({
      ...billing,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    });
  }

  const result = await handleBillingGet(actionPath, createBillingDeps());
  return toNextResponse(result);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { action: actionPath = [] } = await context.params;
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

  const result = await handleBillingPost(actionPath, body, createBillingDeps());
  return toNextResponse(result);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { action: actionPath = [] } = await context.params;
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

  const result = await handleBillingPut(actionPath, body, createBillingDeps());
  return toNextResponse(result);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { action: actionPath = [] } = await context.params;
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

  const result = await handleBillingDelete(actionPath, body, createBillingDeps());
  return toNextResponse(result);
}
