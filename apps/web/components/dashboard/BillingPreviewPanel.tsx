'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { loadBillingPreview } from '@/lib/data';

type BillingView = {
  plan: string;
  status: string;
  monthlyPrice: number;
  paymentMethod: string;
  billingEmail: string;
  invoices: Array<{ id: string; date: string; amount: number; status: string }>;
  trialEnds?: string;
};

const EMPTY_BILLING: BillingView = {
  plan: '—',
  status: '—',
  monthlyPrice: 0,
  paymentMethod: 'No payment method',
  billingEmail: '',
  invoices: [],
};

export default function BillingPreviewPanel() {
  const searchParams = useSearchParams();
  const paywall = searchParams.get('paywall');
  const checkoutSessionId = searchParams.get('session_id');
  const [billing, setBilling] = useState<BillingView>(EMPTY_BILLING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshBilling = useCallback(async () => {
    const data = await loadBillingPreview();
    setBilling({
      plan: data.plan ?? '—',
      status: data.status ?? '—',
      monthlyPrice: data.monthlyPrice ?? 0,
      paymentMethod: data.paymentMethod ?? 'No payment method',
      billingEmail: data.billingEmail ?? '',
      invoices: Array.isArray(data.invoices) ? data.invoices : [],
      trialEnds: data.trialEnds,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // After Stripe redirect: verify session ownership on Nest — never invent paid status.
        if (checkoutSessionId) {
          const statusRes = await apiFetch(
            `/api/stripe/session-status?session_id=${encodeURIComponent(checkoutSessionId)}`,
            { credentials: 'include', cache: 'no-store' },
          );
          const statusBody = (await statusRes.json().catch(() => ({}))) as {
            error?: string;
            payment_status?: string;
            status?: string;
          };
          if (!statusRes.ok) {
            if (!cancelled) {
              setActionMsg(statusBody.error ?? 'Checkout session could not be verified');
            }
          } else if (!cancelled) {
            setActionMsg(
              `Checkout ${statusBody.status ?? 'complete'} · payment ${statusBody.payment_status ?? 'unknown'}`,
            );
          }
        }
        await refreshBilling();
      } catch (err) {
        if (!cancelled) {
          setBilling(EMPTY_BILLING);
          setError(err instanceof Error ? err.message : 'Failed to load billing');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutSessionId, refreshBilling]);

  async function startCheckout() {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          successUrl:
            typeof window !== 'undefined'
              ? `${window.location.origin}/billing?success=1`
              : undefined,
          cancelUrl:
            typeof window !== 'undefined'
              ? `${window.location.origin}/billing?canceled=1`
              : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        mock?: boolean;
      };
      if (!res.ok || !body.url) {
        setActionMsg(body.error ?? 'Checkout unavailable — Stripe may not be configured');
        return;
      }
      window.location.href = body.url;
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch('/api/stripe/portal', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          returnUrl:
            typeof window !== 'undefined' ? `${window.location.origin}/billing` : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.url) {
        setActionMsg(body.error ?? 'Customer portal unavailable');
        return;
      }
      window.location.href = body.url;
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Portal failed');
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubscription() {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch('/api/billing/cancel', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        subscriptionStatus?: string;
      };
      if (!res.ok) {
        setActionMsg(body.error ?? 'Cancel failed');
        return;
      }
      setActionMsg(`Subscription ${body.subscriptionStatus ?? 'canceled'}`);
      await refreshBilling();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-white/50">
        Loading billing…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
        Unable to load billing: {error}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#fdfffc]">Billing</h2>
        <p className="mt-1 text-sm text-white/45">
          {billing.plan} plan · {billing.status}
        </p>
      </div>

      {actionMsg ? (
        <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-sm text-white/75">
          {actionMsg}
        </div>
      ) : null}

      {paywall === 'deals' ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-300">
            Deals Marketplace locked
          </p>
          <p className="mt-2 text-sm text-white/75">
            Deals Marketplace requires an active subscription. Upgrade or complete checkout to unlock
            Discover & syndicate.
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[#121014]/90 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
              Current plan
            </p>
            <h2 className="mt-1 text-3xl font-bold text-[#fdfffc]">{billing.plan}</h2>
            <p className="mt-2 text-sm text-white/55">
              ${billing.monthlyPrice}/mo
              {billing.trialEnds ? ` · Trial ends ${billing.trialEnds}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCheckout()}
              className="rounded-lg border border-white/12 px-3.5 py-2 text-[12px] font-semibold text-white/75 disabled:opacity-50"
            >
              Change plan
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelSubscription()}
              className="rounded-lg border border-rose-400/25 px-3.5 py-2 text-[12px] font-semibold text-rose-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#121014]/90 p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
            Payment method
          </h3>
          <p className="text-sm text-white/75">{billing.paymentMethod}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void openPortal()}
            className="mt-4 rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/70 disabled:opacity-50"
          >
            Update card
          </button>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#121014]/90 p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
            Billing info
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Email</dt>
              <dd className="text-white/85">{billing.billingEmail || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Status</dt>
              <dd className="capitalize text-emerald-300">{billing.status}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121014]/90">
        <div className="border-b border-white/8 px-5 py-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">Invoices</h3>
        </div>
        {billing.invoices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/45">No invoices yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-5 py-2.5 font-medium">Invoice</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {billing.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-white/8">
                  <td className="px-5 py-3 font-mono text-xs text-white/70">{invoice.id}</td>
                  <td className="px-5 py-3 text-white/65">{invoice.date}</td>
                  <td className="px-5 py-3 text-white/85">${invoice.amount}</td>
                  <td className="px-5 py-3 text-white/65">{invoice.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#454955]/40 to-[#121014] p-5">
        <h3 className="text-lg font-semibold text-[#fdfffc]">Need more seats?</h3>
        <p className="mt-2 text-sm text-white/65">
          Investment Team unlocks additional collaborators, vendor marketplace access, and deal
          syndication tools.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-bold text-slate-950 no-underline"
        >
          View team plans
        </Link>
      </section>
    </div>
  );
}
