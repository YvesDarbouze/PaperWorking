import {
  handleBillingDelete,
  handleBillingGet,
  handleBillingPost,
  handleBillingPut,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

type Ctx = { params: Promise<{ action?: string[] }> };

const billingStore = new Map<
  string,
  {
    paymentMethods: Array<{
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }>;
    invoices: Array<Record<string, unknown>>;
    subscriptionPlan: string;
    subscriptionStatus: string;
  }
>();

function defaultBilling(uid: string) {
  return (
    billingStore.get(uid) ?? {
      paymentMethods: [
        {
          id: 'pm_1',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2028,
          isDefault: true,
        },
      ],
      invoices: [
        { id: 'inv_001', number: 'INV-001', date: '2026-07-03', amount: 59, status: 'Paid' },
        { id: 'inv_002', number: 'INV-002', date: '2026-06-03', amount: 59, status: 'Paid' },
      ],
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
    }
  );
}

function billingDeps(uid: string) {
  return {
    requireAuth: async () => ({ uid }),
    loadUser: async (id: string) => defaultBilling(id),
    updateUser: async (id: string, patch: Record<string, unknown>) => {
      const current = defaultBilling(id);
      const next = {
        ...current,
        ...patch,
        paymentMethods:
          (patch.paymentMethods as typeof current.paymentMethods) ?? current.paymentMethods,
        invoices: (patch.invoices as typeof current.invoices) ?? current.invoices,
        subscriptionPlan: String(patch.subscriptionPlan ?? current.subscriptionPlan),
        subscriptionStatus: String(patch.subscriptionStatus ?? current.subscriptionStatus),
      };
      billingStore.set(id, next);
    },
  };
}

export async function GET(_request: Request, context: Ctx) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }
  const { action = [] } = await context.params;

  // Convenience summary for Billing UI when calling /api/billing
  if (action.length === 0) {
    const data = defaultBilling(auth.uid);
    return toNextResponse({
      status: 200,
      body: {
        success: true,
        plan: data.subscriptionPlan,
        status: data.subscriptionStatus,
        monthlyPrice: 59,
        paymentMethods: data.paymentMethods,
        invoices: data.invoices,
        billingEmail: 'alex@paperworking.test',
      },
    });
  }

  const result = await handleBillingGet(action, billingDeps(auth.uid));
  return toNextResponse(result);
}

export async function POST(request: Request, context: Ctx) {
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
  const result = await handleBillingPost(action, body, billingDeps(auth.uid));
  return toNextResponse(result);
}

export async function PUT(request: Request, context: Ctx) {
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
  const result = await handleBillingPut(action, body, billingDeps(auth.uid));
  return toNextResponse(result);
}

export async function DELETE(request: Request, context: Ctx) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }
  const { action = [] } = await context.params;
  const url = new URL(request.url);
  const result = await handleBillingDelete(
    action,
    { id: url.searchParams.get('id') },
    billingDeps(auth.uid),
  );
  return toNextResponse(result);
}
