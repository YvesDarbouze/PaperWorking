import { bffFetch, bffJson } from '@/lib/api/bff-fetch';

export type BillingPreviewData = {
  plan: string;
  status: string;
  monthlyPrice: number;
  paymentMethod: string;
  billingEmail: string;
  invoices: Array<{ id: string; date: string; amount: number; status: string }>;
  trialEnds?: string;
};

function mapBillingPreview(data: Record<string, unknown>): BillingPreviewData {
  const subscription =
    data.subscription && typeof data.subscription === 'object'
      ? (data.subscription as Record<string, unknown>)
      : null;
  const methods = Array.isArray(data.paymentMethods)
    ? (data.paymentMethods as Array<Record<string, unknown>>)
    : [];
  const defaultPm = methods.find((m) => m.isDefault) ?? methods[0];
  const paymentMethod = defaultPm
    ? `${String(defaultPm.brand ?? 'card').toUpperCase()} •••• ${String(defaultPm.last4 ?? '••••')}`
    : 'No payment method';

  const invoices = Array.isArray(data.invoices)
    ? (data.invoices as Array<Record<string, unknown>>).map((inv) => ({
        id: String(inv.number ?? inv.id ?? 'inv'),
        date: String(inv.date ?? ''),
        amount: Number(inv.amount ?? 0),
        status: String(inv.status ?? ''),
      }))
    : [];

  return {
    plan: String(data.plan ?? subscription?.plan ?? data.subscriptionPlan ?? '—'),
    status: String(data.status ?? subscription?.status ?? data.subscriptionStatus ?? '—'),
    monthlyPrice: Number(data.monthlyPrice ?? 0),
    paymentMethod,
    billingEmail: String(data.billingEmail ?? ''),
    invoices,
    trialEnds: undefined,
  };
}

/** GET /api/billing via same-origin BFF (Phase B15). */
export async function getBillingSummaryFromBff(): Promise<BillingPreviewData> {
  const data = await bffJson<Record<string, unknown>>('/api/billing', {
    credentials: 'include',
    cache: 'no-store',
  });
  return mapBillingPreview(data);
}

/** GET /api/stripe/session-status via same-origin BFF (Phase B15). */
export async function getStripeSessionStatusFromBff(sessionId: string) {
  const res = await bffFetch(
    `/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`,
    { credentials: 'include', cache: 'no-store' },
  );
  return res.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

/** POST /api/stripe/checkout via same-origin BFF (Phase B15). */
export async function createStripeCheckoutFromBff(input: {
  plan?: string;
  billingInterval?: 'monthly' | 'annual';
  successUrl?: string;
  cancelUrl?: string;
}) {
  const res = await bffFetch('/api/stripe/checkout', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return {
    ok: res.ok,
    body: (await res.json().catch(() => ({}))) as Record<string, unknown>,
  };
}

/** POST /api/stripe/portal via same-origin BFF (Phase B15). */
export async function createStripePortalFromBff(returnUrl?: string) {
  const res = await bffFetch('/api/stripe/portal', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ returnUrl }),
  });
  return {
    ok: res.ok,
    body: (await res.json().catch(() => ({}))) as Record<string, unknown>,
  };
}

/** POST /api/billing/cancel via same-origin BFF (Phase B15). */
export async function cancelBillingSubscriptionFromBff() {
  const res = await bffFetch('/api/billing/cancel', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({}),
  });
  return {
    ok: res.ok,
    body: (await res.json().catch(() => ({}))) as Record<string, unknown>,
  };
}
