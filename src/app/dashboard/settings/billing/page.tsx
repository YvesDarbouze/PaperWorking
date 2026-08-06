'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { CancelSubscriptionModal } from '@/components/billing/CancelSubscriptionModal';

/* ═══════════════════════════════════════════════════════
   Billing & Subscription — Settings → Billing

   Layout is a single ~900px column, left-aligned to the settings nav:
     1. Current Plan hero      (plan, price, cycle, status, actions)
     2. Payment Method | Billing Info   (2-col from `sm`, stacked on mobile)
     3. Invoice history table
     4. Team upsell text link

   Removed in the August 2026 hardening pass:
     - Account Tier comparison bars  -> replaced by the team upsell link
     - RentCast "API Usage" card     -> moved to Settings → Integrations
     - "Change Your Plan" section    -> merged into the hero's Change Plan sheet
     - CloudStorageMeter             -> storage consumption is not a billing
                                        concern; Billing covers plan, payment,
                                        and invoices only
   ═══════════════════════════════════════════════════════ */

const PLAN_PRICING: Record<string, { label: string; price: string; period: string }> = {
  'Individual':      { label: 'Investor',        price: '$59', period: '/mo' },
  'Team':            { label: 'Investment Team', price: '$99', period: '/mo' },
  'Vendor Network':  { label: 'Vendor',          price: '$39', period: '/mo' },
  'None':            { label: 'No active plan',  price: '—',   period: ''    },
};

const PLAN_SWITCH_OPTIONS = [
  { id: 'individual', displayName: 'Investor',        monthlyPrice: 59, canonicalKey: 'Individual',    description: 'Solo flippers tired of spreadsheet chaos.' },
  { id: 'team',       displayName: 'Investment Team', monthlyPrice: 99, canonicalKey: 'Team',          description: 'Scaling REI businesses managing multiple deals.' },
  { id: 'vendor',     displayName: 'Vendor',          monthlyPrice: 39, canonicalKey: 'Vendor Network', description: 'Appraisers, Inspectors, GCs, and tradespeople.' },
];

const CANONICAL_PRICES: Record<string, number> = {
  'Individual': 59, 'Team': 99, 'Vendor Network': 39, 'None': 0,
};

/** Status pill: a subtle dot + label. Green only for genuinely active states. */
const STATUS_BADGE: Record<string, { label: string; dot: string; text: string }> = {
  active:   { label: 'Active',   dot: 'bg-emerald-400', text: 'text-emerald-400' },
  trialing: { label: 'Trial',    dot: 'bg-emerald-400', text: 'text-emerald-400' },
  past_due: { label: 'Past Due', dot: 'bg-amber-400',   text: 'text-amber-400' },
  canceled: { label: 'Canceled', dot: 'bg-amber-400',   text: 'text-amber-400' },
  inactive: { label: 'Inactive', dot: 'bg-amber-400',   text: 'text-amber-400' },
};

interface BillingInvoice {
  id: string;
  number: string | null;
  date: string;
  amount: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface PaymentMethodData {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: string;
}

interface BillingContact {
  companyName: string;
  billingEmail: string;
  billingAddress: string;
}

const EMPTY_CONTACT: BillingContact = { companyName: '', billingEmail: '', billingAddress: '' };

export default function BillingSettingsPage() {
  const { user, profile } = useAuth();

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]     = useState<string | null>(null);
  const [tokenError, setTokenError]       = useState<string | null>(null);

  const [invoices, setInvoices]               = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd]       = useState<number | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null);
  const [pmLoading, setPmLoading]         = useState(false);
  const [pmFetched, setPmFetched]         = useState(false);

  // Billing contact block — inline edit
  const [contact, setContact]           = useState<BillingContact>(EMPTY_CONTACT);
  const [contactDraft, setContactDraft] = useState<BillingContact>(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState(false);
  const [contactSaving, setContactSaving]   = useState(false);
  const [contactError, setContactError]     = useState<string | null>(null);

  // Plan change / cancel
  const [planSheetOpen, setPlanSheetOpen]   = useState(false);
  const [cancelOpen, setCancelOpen]         = useState(false);
  const [planChangeLoading, setPlanChangeLoading] = useState<string | null>(null);
  const [planChangeError, setPlanChangeError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokenError(null);
    setInvoicesLoading(true);
    setSubscriptionLoading(true);
    setPmLoading(true);

    user.getIdToken()
      .then((idToken: string) => {
        fetch('/api/stripe/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
          .then((r) => r.json())
          .then((data) => { if (data.invoices) setInvoices(data.invoices); })
          .catch(() => {})
          .finally(() => setInvoicesLoading(false));

        fetch('/api/stripe/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
          .then((r) => r.json())
          .then((data) => { if (data.currentPeriodEnd) setCurrentPeriodEnd(data.currentPeriodEnd); })
          .catch(() => {})
          .finally(() => setSubscriptionLoading(false));

        fetch('/api/stripe/payment-method', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
          .then((r) => r.json())
          .then((data) => { if (data.paymentMethod) setPaymentMethod(data.paymentMethod); })
          .catch(() => {})
          .finally(() => { setPmLoading(false); setPmFetched(true); });

        fetch('/api/settings/billing', { headers: { Authorization: `Bearer ${idToken}` } })
          .then((r) => r.json())
          .then((data) => {
            const next: BillingContact = {
              companyName:    data?.companyName    ?? '',
              billingEmail:   data?.billingEmail   ?? '',
              billingAddress: data?.billingAddress ?? '',
            };
            setContact(next);
            setContactDraft(next);
          })
          .catch(() => {});
      })
      .catch((err: unknown) => {
        console.error('Failed to retrieve authentication token:', err);
        setInvoicesLoading(false);
        setSubscriptionLoading(false);
        setPmLoading(false);
        setTokenError('Failed to refresh authentication token. Please refresh the page or log in again.');
      });
  }, [user]);

  const plan   = profile?.subscriptionPlan   ?? 'None';
  const status = profile?.subscriptionStatus ?? 'inactive';

  const lastFour  = paymentMethod?.last4 ?? (pmFetched ? null : profile?.lastFour);
  const cardBrand = paymentMethod?.brand ?? (pmFetched ? null : profile?.cardBrand);
  const expMonth  = paymentMethod?.expMonth;
  const expYear   = paymentMethod?.expYear;
  const hasCard   = pmFetched ? !!paymentMethod : !!(profile?.stripeCustomerId || plan !== 'None');

  const planInfo    = PLAN_PRICING[plan]   ?? PLAN_PRICING['None'];
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE['inactive'];
  const hasPlan     = plan !== 'None';
  const currentPrice = CANONICAL_PRICES[plan] ?? 0;

  const nextBillingStr = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : subscriptionLoading
      ? 'Loading…'
      : 'N/A';

  const isTrialing  = status === 'trialing';
  const trialEnd    = profile?.trialEnd;
  const trialEndStr = trialEnd
    ? new Date(trialEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const isCanceling = profile?.cancelAtPeriodEnd ?? false;

  /** Stripe-hosted portal — used for adding/updating cards and cancelling. */
  const openPortal = useCallback(async () => {
    if (!user) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to open billing portal.');
      window.location.assign(data.url);
    } catch (err: unknown) {
      setPortalError(err instanceof Error ? err.message : 'Failed to open billing portal.');
      setPortalLoading(false);
    }
  }, [user]);

  const handleChangePlan = async (targetPlanName: string) => {
    if (!user) return;
    setPlanChangeLoading(targetPlanName);
    setPlanChangeError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: targetPlanName,
          billingInterval: 'monthly',
          idToken,
          userId: user.uid,
          ...(user.email ? { userEmail: user.email } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start plan change.');
      window.location.assign(data.url);
    } catch (err: unknown) {
      setPlanChangeError(err instanceof Error ? err.message : 'Could not start plan change.');
      setPlanChangeLoading(null);
    }
  };

  const saveContact = async () => {
    if (!user) return;
    setContactSaving(true);
    setContactError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/settings/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(contactDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not save billing information.');
      const saved: BillingContact = {
        companyName:    data.companyName    ?? contactDraft.companyName,
        billingEmail:   data.billingEmail   ?? contactDraft.billingEmail,
        billingAddress: data.billingAddress ?? contactDraft.billingAddress,
      };
      setContact(saved);
      setContactDraft(saved);
      setEditingContact(false);
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : 'Could not save billing information.');
    } finally {
      setContactSaving(false);
    }
  };

  const cancelContactEdit = () => {
    setContactDraft(contact);
    setContactError(null);
    setEditingContact(false);
  };

  const fieldLabel = 'text-xs font-medium text-pw-muted uppercase tracking-[0.5px] mb-1';
  const inputCls =
    'w-full h-10 px-3 rounded-lg bg-pw-glass-bg/60 border border-pw-border text-sm text-pw-black ' +
    'focus:outline-none focus:border-pw-primary/60 transition-colors';

  return (
    <div className="w-full space-y-6" data-testid="billing-page">
      {tokenError && (
        <div className="text-xs bg-error/10 border border-error/30 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-error select-none">error</span>
          <span className="text-error">{tokenError}</span>
        </div>
      )}

      {/* ━━━ 1. Current Plan hero ━━━ */}
      <section
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
        data-testid="current-plan-card"
      >
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-pw-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-pw-muted mb-2">
                Current Plan
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-bold text-pw-black" data-testid="plan-name">
                  {planInfo.label}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${statusBadge.text}`}
                  data-testid="plan-status"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-sm text-pw-muted mt-2">
                {hasPlan ? (
                  <>
                    <span className="text-pw-black font-semibold">{planInfo.price}</span>
                    {planInfo.period} · Billed monthly · Next billing {nextBillingStr}
                  </>
                ) : (
                  'No active subscription. Choose a plan to unlock paid features.'
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {hasPlan ? (
                <button
                  onClick={() => setPlanSheetOpen(true)}
                  className="luminous-button h-10 px-5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                  data-testid="change-plan-btn"
                >
                  Change Plan
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="luminous-button h-10 px-5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  data-testid="choose-plan-btn"
                >
                  Choose a Plan
                </Link>
              )}
            </div>
          </div>

          {isTrialing && (
            <div className="mt-5 bg-pw-glass-bg/50 border border-pw-border rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-pw-muted text-lg mt-0.5">hourglass_top</span>
              <p className="text-sm text-pw-muted">
                <span className="text-pw-black font-semibold">Free trial active.</span>{' '}
                Your trial {trialEndStr ? `ends on ${trialEndStr}` : 'is active'}. You won&apos;t be charged until it ends.
              </p>
            </div>
          )}

          {isCanceling && !isTrialing && (
            <div className="mt-5 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-400 text-lg mt-0.5">warning</span>
              <div>
                <p className="text-sm text-pw-black font-semibold">Subscription canceling</p>
                <p className="text-sm text-pw-muted mt-0.5">
                  Your plan stays active until {nextBillingStr}. After that you&apos;ll lose access to paid features.
                </p>
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="mt-2 text-xs font-semibold text-pw-primary hover:underline disabled:opacity-50 cursor-pointer"
                >
                  Reactivate subscription →
                </button>
              </div>
            </div>
          )}

          {hasPlan && !isCanceling && (
            <div className="mt-5 pt-4 border-t border-pw-border/60">
              <button
                onClick={() => setCancelOpen(true)}
                className="text-xs font-medium text-pw-muted hover:text-error transition-colors cursor-pointer"
                data-testid="cancel-subscription-btn"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ━━━ 2. Payment Method | Billing Info ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">

        {/* Payment Method */}
        <section className="glass-card rounded-2xl p-6" data-testid="payment-method-card">
          <h3 className="text-base font-semibold text-pw-black mb-4">Payment Method</h3>

          {pmLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-14 bg-pw-glass-bg rounded-lg" />
              <div className="h-10 bg-pw-glass-bg rounded-lg" />
            </div>
          ) : hasCard && lastFour ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-pw-glass-bg/50 rounded-lg p-4 border border-pw-border">
                <div className="w-11 h-7 rounded bg-pw-glass-bg border border-white/10 flex items-center justify-center shrink-0">
                  <span className="font-mono text-[10px] font-bold text-pw-black/80">
                    {(cardBrand ?? 'CARD').toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-pw-black font-mono tracking-widest">•••• {lastFour}</p>
                  <p className="text-xs text-pw-muted mt-0.5">
                    {expMonth && expYear
                      ? `Expires ${String(expMonth).padStart(2, '0')}/${String(expYear).slice(-2)}`
                      : 'Expiry unavailable'}
                  </p>
                </div>
              </div>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="w-full h-10 px-4 rounded-lg border border-pw-border text-pw-black text-sm font-medium hover:bg-white/5 disabled:opacity-50 transition-all cursor-pointer"
                data-testid="update-payment-btn"
              >
                {portalLoading ? 'Opening…' : 'Update Payment Method'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-pw-muted">
                No payment method on file. Add a card to avoid interruption.
              </p>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="luminous-button w-full h-10 px-4 rounded-lg text-sm font-medium disabled:opacity-50 transition-all cursor-pointer"
                data-testid="add-payment-btn"
              >
                {portalLoading ? 'Opening…' : 'Add Payment Method'}
              </button>
            </div>
          )}

          {portalError && (
            <p className="text-xs text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2 mt-3">
              {portalError}
            </p>
          )}
        </section>

        {/* Billing Info — inline edit */}
        <section className="glass-card rounded-2xl p-6" data-testid="billing-info-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-pw-black">Billing Info</h3>
            {!editingContact && (
              <button
                onClick={() => setEditingContact(true)}
                className="text-pw-muted hover:text-pw-primary transition-colors p-1 cursor-pointer"
                aria-label="Edit billing info"
                data-testid="edit-billing-info-btn"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            )}
          </div>

          {editingContact ? (
            <div className="space-y-3" data-testid="billing-info-form">
              <div>
                <p className={fieldLabel}>Company Name</p>
                <input
                  className={inputCls}
                  value={contactDraft.companyName}
                  onChange={(e) => setContactDraft({ ...contactDraft, companyName: e.target.value })}
                  placeholder="Acme Capital LLC"
                  aria-label="Company Name"
                />
              </div>
              <div>
                <p className={fieldLabel}>Billing Email</p>
                <input
                  className={inputCls}
                  type="email"
                  value={contactDraft.billingEmail}
                  onChange={(e) => setContactDraft({ ...contactDraft, billingEmail: e.target.value })}
                  placeholder="ap@acme.com"
                  aria-label="Billing Email"
                />
              </div>
              <div>
                <p className={fieldLabel}>Billing Address</p>
                <textarea
                  className={`${inputCls} h-auto py-2 min-h-[64px] resize-y`}
                  value={contactDraft.billingAddress}
                  onChange={(e) => setContactDraft({ ...contactDraft, billingAddress: e.target.value })}
                  placeholder="123 Main St, Austin, TX 78701"
                  aria-label="Billing Address"
                />
              </div>

              {contactError && (
                <p className="text-xs text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2">
                  {contactError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveContact}
                  disabled={contactSaving}
                  className="luminous-button h-9 px-4 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
                  data-testid="save-billing-info-btn"
                >
                  {contactSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={cancelContactEdit}
                  disabled={contactSaving}
                  className="h-9 px-4 rounded-lg border border-pw-border text-pw-black text-xs font-semibold hover:bg-white/5 disabled:opacity-50 transition-all cursor-pointer"
                  data-testid="cancel-billing-info-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className={fieldLabel}>Company Name</p>
                <p className="text-sm text-pw-black">{contact.companyName || profile?.displayName || 'Not configured'}</p>
              </div>
              <div>
                <p className={fieldLabel}>Billing Email</p>
                <p className="text-sm text-pw-black break-all">
                  {contact.billingEmail || profile?.email || user?.email || '—'}
                </p>
              </div>
              <div>
                <p className={fieldLabel}>Billing Address</p>
                <p className="text-sm text-pw-black whitespace-pre-line">
                  {contact.billingAddress || 'Not configured'}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ━━━ 3. Invoice history ━━━ */}
      <section className="glass-card rounded-2xl p-6" data-testid="invoice-history">
        <h3 className="text-base font-semibold text-pw-black mb-4">Invoice History</h3>

        {invoicesLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-pw-glass-bg rounded" />
            <div className="h-10 bg-pw-glass-bg rounded" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-pw-muted py-6 text-center" data-testid="invoices-empty">
            No invoices yet. They will appear here after your first payment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-pw-border">
                  <th className="pb-3 text-xs font-semibold text-pw-muted uppercase tracking-wider">Date</th>
                  <th className="pb-3 text-right text-xs font-semibold text-pw-muted uppercase tracking-wider">Amount</th>
                  <th className="pb-3 pl-6 text-xs font-semibold text-pw-muted uppercase tracking-wider">Status</th>
                  <th className="pb-3 text-right text-xs font-semibold text-pw-muted uppercase tracking-wider">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const st = inv.status.toLowerCase();
                  const tone =
                    st === 'paid'
                      ? 'text-emerald-400'
                      : st === 'open' || st === 'pending'
                        ? 'text-amber-400'
                        : 'text-rose-400';
                  const label = st === 'open' ? 'Pending' : st.charAt(0).toUpperCase() + st.slice(1);
                  return (
                    <tr key={inv.id} className="border-b border-pw-border/50 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 text-sm text-pw-black">{inv.date}</td>
                      <td className="py-3 text-sm text-pw-black text-right font-mono tabular-nums">{inv.amount}</td>
                      <td className={`py-3 pl-6 text-sm font-medium ${tone}`}>{label}</td>
                      <td className="py-3 text-right">
                        {inv.pdfUrl ?? inv.hostedUrl ? (
                          <a
                            href={(inv.pdfUrl ?? inv.hostedUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-pw-muted hover:text-pw-primary transition-colors"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-sm text-pw-muted/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ━━━ 4. Team upsell — replaces the Account Tier comparison bars ━━━ */}
      {plan !== 'Team' && (
        <p className="text-sm text-pw-muted">
          Need team features?{' '}
          <button
            onClick={() => { setPlanSheetOpen(true); }}
            className="text-pw-primary font-medium hover:underline cursor-pointer"
            data-testid="team-upsell-link"
          >
            Upgrade to Team →
          </button>
        </p>
      )}

      {/* ─── Change Plan sheet (merged from the old bottom section) ─── */}
      {planSheetOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !planChangeLoading && setPlanSheetOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-pw-border bg-pw-surface shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Change plan"
            data-testid="change-plan-sheet"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-pw-black">Change Your Plan</h3>
              <button
                onClick={() => setPlanSheetOpen(false)}
                disabled={!!planChangeLoading}
                className="p-1 rounded-lg hover:bg-white/10 text-pw-muted disabled:opacity-50 cursor-pointer"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="text-xs text-pw-muted">
              Switch at any time. Stripe handles proration automatically at checkout.
            </p>

            {planChangeError && (
              <p className="text-xs text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2">
                {planChangeError}
              </p>
            )}

            <div className="space-y-2">
              {PLAN_SWITCH_OPTIONS.map((option) => {
                const isCurrent = plan === option.canonicalKey;
                const isUpgrade = option.monthlyPrice > currentPrice && !isCurrent;
                const isLoading = planChangeLoading === option.displayName;
                return (
                  <div
                    key={option.id}
                    className={`rounded-xl p-4 border flex items-center justify-between gap-4 ${
                      isCurrent ? 'bg-pw-primary/5 border-pw-primary/30' : 'bg-pw-glass-bg/30 border-pw-border'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-pw-black">{option.displayName}</p>
                      <p className="text-xs text-pw-muted mt-0.5">{option.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-sm font-bold text-pw-black tabular-nums">
                        ${option.monthlyPrice}
                        <span className="text-xs text-pw-muted font-normal">/mo</span>
                      </p>
                      <button
                        onClick={() => !isCurrent && handleChangePlan(option.displayName)}
                        disabled={isCurrent || !!planChangeLoading}
                        className={`h-9 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                          isCurrent
                            ? 'bg-pw-primary/10 text-pw-primary border border-pw-primary/20 cursor-default'
                            : isUpgrade
                              ? 'luminous-button cursor-pointer disabled:opacity-50'
                              : 'border border-pw-border text-pw-black hover:bg-white/5 cursor-pointer disabled:opacity-50'
                        }`}
                      >
                        {isLoading ? 'Opening…' : isCurrent ? 'Current' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation is completed in the Stripe-hosted portal — the modal
          surfaces the consequences and export options first. */}
      <CancelSubscriptionModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => { setCancelOpen(false); void openPortal(); }}
        isLoading={portalLoading}
      />
    </div>
  );
}
