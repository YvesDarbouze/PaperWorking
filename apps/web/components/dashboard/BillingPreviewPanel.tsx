'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface BillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface BillingInvoice {
  id: string;
  number: string;
  date: string;
  amount: string;
  status: string;
  pdfUrl?: string;
}

interface BillingData {
  plan: string;
  price: string;
  monthlyPrice?: number;
  status: string;
  subscriptionStatus: string;
  nextBillingDate: string;
  trialEnds?: string;
  billingEmail?: string;
  companyName?: string;
  billingAddress?: string;
  stripeConfigured?: boolean;
  paymentMethods: BillingPaymentMethod[];
  invoices: BillingInvoice[];
}

export default function BillingPreviewPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paywall = searchParams.get('paywall');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingData | null>(null);

  // Modals state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Team');
  const [planUpdating, setPlanUpdating] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardLast4, setCardLast4] = useState('');
  const [cardUpdating, setCardUpdating] = useState(false);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing');
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=billing');
        return;
      }
      if (!res.ok) {
        let errorMsg = `Failed to load subscription & billing records (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson && typeof errJson.error === 'string') {
            errorMsg = errJson.error;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error connecting to billing service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleChangePlan = async () => {
    setPlanUpdating(true);
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=billing');
        return;
      }
      if (!res.ok) throw new Error('Failed to update plan');
      setShowPlanModal(false);
      setActionSuccess(`Subscription updated to ${selectedPlan} tier.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setPlanUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=billing');
        return;
      }
      if (!res.ok) throw new Error('Failed to cancel subscription');
      setShowCancelModal(false);
      setActionSuccess('Cancellation scheduled at the end of the current billing cycle.');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpdateCard = async () => {
    if (!cardLast4 || cardLast4.length !== 4) return;
    setCardUpdating(true);
    try {
      const res = await fetch('/api/billing/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: {
            brand: 'visa',
            last4: cardLast4,
            expMonth: 12,
            expYear: 2029,
          },
        }),
      });
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings?section=billing');
        return;
      }
      if (!res.ok) throw new Error('Failed to update card');
      setShowCardModal(false);
      setCardLast4('');
      setActionSuccess('Payment method updated successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment card');
    } finally {
      setCardUpdating(false);
    }
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    window.open(`/api/billing/invoices/${invoiceId}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="material-symbols-outlined animate-spin text-[var(--accent)]">
            progress_activity
          </span>
          Loading subscription &amp; invoices…
        </div>
      </div>
    );
  }

  // Loud Error State with Retry (never a silent shell)
  if (error || !data) {
    return (
      <div className="w-full space-y-6" data-testid="billing-error-container">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Billing &amp; Subscriptions</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage your subscription plan, payment methods, and invoices.
          </p>
        </div>

        <div
          data-testid="billing-error-banner"
          className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--danger)]">
              error
            </span>
            <div className="flex-1">
              <h3 className="text-base font-bold text-[var(--danger)]">
                Unable to load billing data
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {error || 'An unexpected error occurred while communicating with the billing service.'}
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={fetchBilling}
                  data-testid="billing-retry-button"
                  data-variant="primary"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultPm = data.paymentMethods.find((pm) => pm.isDefault) || data.paymentMethods[0];

  return (
    <div className="w-full space-y-6" data-testid="billing-preview-panel">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Billing &amp; Subscriptions</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {data.plan} plan · <span className="capitalize">{data.status}</span>
        </p>
      </div>

      {paywall === 'deals' && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Deals Marketplace Locked
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Deals Marketplace access requires an active operator subscription. Upgrade your tier to browse and post deals.
          </p>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {actionSuccess}
        </div>
      )}

      {/* Current Plan Overview (Single Primary Action) */}
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Current Plan
            </p>
            <h3 className="mt-1 text-2xl font-bold text-[var(--text-primary)]" data-testid="billing-plan-name">
              {data.plan}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {data.price} · Renewal date: {new Date(data.nextBillingDate).toLocaleDateString()}
            </p>
          </div>
          {data.stripeConfigured ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowPlanModal(true)}
                data-variant="primary"
                data-testid="billing-change-plan-btn"
              >
                Change Plan
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                data-testid="billing-cancel-btn"
                className="text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger)]/10"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div data-testid="billing-self-hosted-note" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Self-Hosted / Managed:</span> Stripe payments unconfigured in this environment. Tiers are managed directly by your workspace administrator.
            </div>
          )}
        </div>
      </section>

      {/* Payment Method & Billing Info Grid */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Payment Method
          </h3>
          {defaultPm ? (
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[var(--accent)]">
                credit_card
              </span>
              <div>
                <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">
                  {defaultPm.brand} ending in {defaultPm.last4}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Expires {defaultPm.expMonth}/{defaultPm.expYear}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No payment method on file.</p>
          )}
          {data.stripeConfigured && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCardModal(true)}
                data-testid="billing-update-card-btn"
              >
                Update Card
              </Button>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Billing Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Billing Email</dt>
              <dd className="text-[var(--text-primary)] font-medium">{data.billingEmail || 'alex@apexcap.internal'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Subscription Status</dt>
              <dd className="capitalize text-emerald-400 font-bold">{data.subscriptionStatus}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Organization</dt>
              <dd className="text-[var(--text-primary)]">{data.companyName || 'Apex Capital Partners'}</dd>
            </div>
          </dl>
        </article>
      </section>

      {/* Invoices History Table */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Invoice History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-[var(--text-primary)]">
                    {inv.number}
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {new Date(inv.date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 font-mono text-[var(--text-primary)]">{inv.amount}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold capitalize text-emerald-400">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => handleDownloadInvoice(inv.id)}
                      className="text-xs text-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Download PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Plan Selection Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Change Subscription Plan</h3>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {['Individual', 'Pro Portfolio', 'Team'].map((p) => (
                <label
                  key={p}
                  className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                    selectedPlan === p
                      ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === p}
                      onChange={() => setSelectedPlan(p)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{p}</span>
                  </div>
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {p === 'Individual' ? '$59/mo' : p === 'Pro Portfolio' ? '$79/mo' : '$99/mo'}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowPlanModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleChangePlan}
                disabled={planUpdating}
              >
                {planUpdating ? 'Updating…' : 'Confirm Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--danger)]">Cancel Subscription</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Your subscription will remain active until the end of your current billing period ({new Date(data.nextBillingDate).toLocaleDateString()}). Afterwards, premium marketplace tools will be locked.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCancelModal(false)}>
                Keep Plan
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Cancelling…' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Update Card Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Update Payment Card</h3>
            <div>
              <label htmlFor="card-last4" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Last 4 Digits of New Card
              </label>
              <input
                id="card-last4"
                type="text"
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                placeholder="4242"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCardModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleUpdateCard}
                disabled={cardUpdating || cardLast4.length !== 4}
              >
                {cardUpdating ? 'Saving…' : 'Save Card'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
