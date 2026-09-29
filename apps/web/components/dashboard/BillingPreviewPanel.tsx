'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  CircleNotch,
  WarningCircle,
  CheckCircle,
  CreditCard,
  X,
} from '@/components/icons/PhosphorIcons';

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
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CircleNotch className="h-5 w-5 animate-spin text-primary" />
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
          <h2 className="text-xl font-bold text-foreground">Billing &amp; Subscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your subscription plan, payment methods, and invoices.
          </p>
        </div>

        <div
          data-testid="billing-error-banner"
          className="rounded-none border border-destructive/30 bg-destructive/10 p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <WarningCircle className="h-6 w-6 text-destructive shrink-0" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-destructive">
                Unable to load billing data
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
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
        <h2 className="text-xl font-bold text-foreground">Billing &amp; Subscriptions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.plan} plan · <span className="capitalize">{data.status}</span>
        </p>
      </div>

      {paywall === 'deals' && (
        <div className="rounded-none border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Deals Marketplace Locked
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Deals Marketplace access requires an active operator subscription. Upgrade your tier to browse and post deals.
          </p>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-none border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          {actionSuccess}
        </div>
      )}

      {/* Current Plan Overview (Single Primary Action) */}
      <section className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Plan
            </p>
            <h3 className="mt-1 text-2xl font-bold text-foreground" data-testid="billing-plan-name">
              {data.plan}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
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
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div data-testid="billing-self-hosted-note" className="rounded-none border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Self-Hosted / Managed:</span> Stripe payments unconfigured in this environment. Tiers are managed directly by your workspace administrator.
            </div>
          )}
        </div>
      </section>

      {/* Payment Method & Billing Info Grid */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Payment Method
          </h3>
          {defaultPm ? (
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-foreground shrink-0" />
              <div>
                <p className="text-sm font-semibold capitalize text-foreground">
                  {defaultPm.brand} ending in {defaultPm.last4}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {defaultPm.expMonth}/{defaultPm.expYear}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payment method on file.</p>
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

        <article className="rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Billing Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Billing Email</dt>
              <dd className="text-foreground font-medium">{data.billingEmail || 'alex@apexcap.internal'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Subscription Status</dt>
              <dd className="capitalize text-emerald-400 font-bold">{data.subscriptionStatus}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Organization</dt>
              <dd className="text-foreground">{data.companyName || 'Apex Capital Partners'}</dd>
            </div>
          </dl>
        </article>
      </section>

      {/* Invoices History Table */}
      <section className="overflow-hidden rounded-none border border-border bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Invoice History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-foreground">
                    {inv.number}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(inv.date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 font-mono text-foreground">{inv.amount}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-none bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold capitalize text-emerald-400">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => handleDownloadInvoice(inv.id)}
                      className="text-xs text-foreground hover:text-foreground"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-none border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Change Subscription Plan</h3>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {['Individual', 'Pro Portfolio', 'Team'].map((p) => (
                <label
                  key={p}
                  className={`flex items-center justify-between rounded-none border p-3 cursor-pointer transition-all ${
                    selectedPlan === p
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === p}
                      onChange={() => setSelectedPlan(p)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-semibold text-foreground">{p}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p === 'Individual' ? '$59/mo' : p === 'Pro Portfolio' ? '$79/mo' : '$99/mo'}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-none border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-destructive">Cancel Subscription</h3>
            <p className="text-sm text-muted-foreground">
              Your subscription will remain active until the end of your current billing period ({new Date(data.nextBillingDate).toLocaleDateString()}). Afterwards, premium marketplace tools will be locked.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-none border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Update Payment Card</h3>
            <div>
              <label htmlFor="card-last4" className="block text-xs font-semibold text-muted-foreground mb-1">
                Last 4 Digits of New Card
              </label>
              <input
                id="card-last4"
                type="text"
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                placeholder="4242"
                className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-ring sm:text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
