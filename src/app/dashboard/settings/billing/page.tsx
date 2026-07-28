'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { CloudStorageMeter } from '@/components/settings/CloudStorageMeter';
import AccountTierSettings from '@/components/settings/AccountTierSettings';
import { billingTokens, panelStyle, statusStyle } from '@/components/settings/billingTheme';

/* Billing — subscription & payment ops desk */

const PLAN_PRICING: Record<string, { label: string; price: string; period: string }> = {
  'Individual':      { label: 'Investor',         price: '$59', period: '/mo' },
  'Team':            { label: 'Investment Team',  price: '$99', period: '/mo' },
  'Vendor Network':  { label: 'Vendor',           price: '$39', period: '/mo' },
  'None':            { label: 'No active plan',   price: '—',   period: ''    },
};

// Plans available for switching — names and prices from live Stripe catalog
const PLAN_SWITCH_OPTIONS = [
  { id: 'individual', displayName: 'Investor',         monthlyPrice: 59, canonicalKey: 'Individual',     description: 'Solo flippers tired of spreadsheet chaos.' },
  { id: 'team',       displayName: 'Investment Team',  monthlyPrice: 99, canonicalKey: 'Team',           description: 'Scaling REI businesses managing multiple deals.' },
  { id: 'vendor',     displayName: 'Vendor',           monthlyPrice: 39, canonicalKey: 'Vendor Network', description: 'Appraisers, Inspectors, GCs, and tradespeople.' },
];

const CANONICAL_PRICES: Record<string, number> = {
  'Individual': 59, 'Team': 99, 'Vendor Network': 39, 'None': 0,
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  canceled: 'Canceled',
  inactive: 'Inactive',
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

export default function BillingSettingsPage() {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [portalLoading, setPortalLoading]     = useState(false);
  const [portalError, setPortalError]         = useState<string | null>(null);
  const [planChangeLoading, setPlanChangeLoading] = useState<string | null>(null);
  const [planChangeError, setPlanChangeError]     = useState<string | null>(null);
  const [tokenError, setTokenError]               = useState<string | null>(null);
  const [invoices, setInvoices]           = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<number | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null);
  const [pmLoading, setPmLoading]         = useState(false);
  const [pmFetched, setPmFetched]         = useState(false);
  const [rentcastUsage, setRentcastUsage] = useState<{ count: number; limit: number } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokenError(null);
    setInvoicesLoading(true);
    setSubscriptionLoading(true);
    setPmLoading(true);
    setUsageLoading(true);
    
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

        fetch('/api/admin/rentcast-usage', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              setRentcastUsage({ count: data.count, limit: data.limit });
            }
          })
          .catch((err: unknown) => console.error(err))
          .finally(() => setUsageLoading(false));
      })
      .catch((err: unknown) => {
        console.error('Failed to retrieve authentication token:', err);
        setInvoicesLoading(false);
        setSubscriptionLoading(false);
        setPmLoading(false);
        setUsageLoading(false);
        setTokenError('Failed to refresh authentication token. Please refresh the page or log in again.');
      });
  }, [user]);

  const plan    = profile?.subscriptionPlan   ?? 'None';
  const status  = profile?.subscriptionStatus ?? 'inactive';

  // Prefer live Stripe data, fall back to profile, show nothing while loading
  const lastFour  = paymentMethod?.last4  ?? (pmFetched ? null : profile?.lastFour);
  const cardBrand = paymentMethod?.brand  ?? (pmFetched ? null : profile?.cardBrand);
  const expMonth  = paymentMethod?.expMonth;
  const expYear   = paymentMethod?.expYear;
  const hasCard   = pmFetched ? !!paymentMethod : !!(profile?.stripeCustomerId || plan !== 'None');

  const planInfo    = PLAN_PRICING[plan]   ?? PLAN_PRICING['None'];
  const statusLabel = STATUS_LABEL[status] ?? STATUS_LABEL['inactive'];

  // Format next billing date from actual stripe subscription data
  const nextBillingStr = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : subscriptionLoading
      ? 'Loading...'
      : 'N/A';

  // Trial & cancellation state
  const isTrialing = status === 'trialing';
  const trialEnd = profile?.trialEnd;
  const trialEndStr = trialEnd
    ? new Date(trialEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const isCanceling = profile?.cancelAtPeriodEnd ?? false;

  const handleDownloadAll = () => {
    const downloadable = invoices.filter((inv) => inv.pdfUrl ?? inv.hostedUrl);
    downloadable.forEach((inv, i) => {
      const url = (inv.pdfUrl ?? inv.hostedUrl)!;
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), i * 300);
    });
  };

  const openPortal = async () => {
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
  };

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

  const currentPrice = CANONICAL_PRICES[plan] ?? 0;

  // maxSeats is derived from the Firestore-authoritative plan, not Zustand.
  // The actual used-seat count lives in organizations/{orgId}/teamMembers;
  // that data is managed on the Team settings page.
  const maxSeats = plan === 'Team' ? 10 : 1;

  const t = billingTokens(isDark);
  const panel = panelStyle(t);
  const subStatus = statusStyle(t, status);

  return (
    <div className="w-full space-y-6" style={{ color: t.body }}>
      <header className="pb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <p className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1" style={{ color: t.accent }}>
          Subscription
        </p>
        <h2 className="text-[1.35rem] font-semibold tracking-tight" style={{ color: t.heading }}>
          Billing
        </h2>
        <p className="text-sm mt-1.5 leading-relaxed max-w-xl" style={{ color: t.muted }}>
          Plan status, payment method, invoices, and usage for this workspace.
        </p>
      </header>

      {tokenError && (
        <div
          className="text-xs px-4 py-3 flex items-center gap-2"
          style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.alert }}
        >
          <span className="material-symbols-outlined text-[16px] select-none">error</span>
          <span>{tokenError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* Current plan */}
        <section className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between min-h-[260px]" style={panel}>
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-6">
              <div>
                <span
                  className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] mb-2"
                  style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.border}`, borderRadius: 2 }}
                >
                  Current plan
                </span>
                <h3 className="text-2xl font-semibold tracking-tight" style={{ color: t.heading }}>
                  {planInfo.label}
                </h3>
              </div>
              <div className="text-left md:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: t.muted }}>
                  Next billing date
                </p>
                <p className="text-lg font-semibold tabular-nums" style={{ color: t.heading }}>{nextBillingStr}</p>
                <p className="text-sm mt-1" style={{ color: t.muted }}>
                  {planInfo.price}{planInfo.period} USD
                </p>
              </div>
            </div>

            {isTrialing && (
              <div
                className="px-4 py-3.5 mb-5 flex items-start gap-3"
                style={{ background: t.accentMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
              >
                <span className="material-symbols-outlined text-xl mt-0.5 select-none" style={{ color: t.accent }}>hourglass_top</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.heading }}>Free trial active</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.muted }}>
                    Your trial {trialEndStr ? `ends on ${trialEndStr}` : 'is active'}. You won't be charged until it ends.
                  </p>
                </div>
              </div>
            )}

            {isCanceling && !isTrialing && (
              <div
                className="px-4 py-3.5 mb-5 flex items-start gap-3"
                style={{ background: t.warnMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
              >
                <span className="material-symbols-outlined text-xl mt-0.5 select-none" style={{ color: t.warn }}>warning</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.heading }}>Subscription canceling</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.muted }}>
                    Active until {nextBillingStr}. After that, paid features will end.
                  </p>
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="pw-interactive-custom mt-2 text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'transparent', border: 'none', padding: 0, color: t.accent }}
                  >
                    Reactivate subscription →
                  </button>
                </div>
              </div>
            )}

            {plan !== 'None' && (
              <div className="p-4" style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-1" style={{ color: t.heading }}>Seat limit</h4>
                    <p className="text-xs leading-relaxed" style={{ color: t.muted }}>
                      Up to{' '}
                      <span className="font-semibold tabular-nums" style={{ color: t.accent }}>{maxSeats}</span>{' '}
                      {maxSeats === 1 ? 'seat' : 'seats'} on this plan
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <Link
                    href="/dashboard/settings/team"
                    className="text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    style={{ color: t.muted }}
                  >
                    <span className="material-symbols-outlined text-[16px]">group_add</span>
                    Manage team
                  </Link>
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="pw-interactive-custom flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                    style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 16px' }}
                  >
                    {portalLoading ? (
                      <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] select-none">add</span>
                    )}
                    {portalLoading ? 'Synchronizing…' : 'Add seats'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {plan === 'None' && (
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Link
                href="/pricing"
                className="pw-interactive-custom inline-flex items-center justify-center text-sm font-semibold"
                style={{ background: t.ctaBg, color: t.ctaFg, borderRadius: 2, padding: '8px 16px' }}
              >
                Choose a plan
              </Link>
            </div>
          )}
        </section>

        {/* Payment method */}
        <section className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between min-h-[260px]" style={panel}>
          <h4 className="text-base font-semibold mb-5" style={{ color: t.heading }}>Payment method</h4>

          {pmLoading ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="p-4 flex items-start gap-4 mb-4 animate-pulse" style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}>
                <div className="w-12 h-8 shrink-0 mt-1" style={{ background: t.surfaceHigh, borderRadius: 2 }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32" style={{ background: t.surfaceHigh, borderRadius: 2 }} />
                  <div className="h-3 w-20" style={{ background: t.surfaceHigh, borderRadius: 2 }} />
                </div>
              </div>
              <div className="h-10 animate-pulse" style={{ background: t.surfaceMuted, borderRadius: 2 }} />
            </div>
          ) : hasCard && lastFour ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="p-4 flex items-start gap-4 mb-4" style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}>
                <div
                  className="w-12 h-8 flex items-center justify-center shrink-0 mt-1"
                  style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 }}
                >
                  <span className="font-mono text-[10px] font-bold" style={{ color: t.heading }}>
                    {(cardBrand ?? 'Card').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-2 flex-wrap" style={{ color: t.heading }}>
                    <span className="font-mono tracking-widest">•••• {lastFour}</span>
                    <span
                      className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                      style={{ background: t.accentMuted, color: t.accent, borderRadius: 2 }}
                    >
                      Default
                    </span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: t.muted }}>
                    {expMonth && expYear
                      ? `Expires ${String(expMonth).padStart(2, '0')}/${String(expYear).slice(-2)}`
                      : 'Expiry unavailable'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openPortal}
                disabled={portalLoading}
                className="pw-interactive-custom w-full flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 16px', color: t.heading }}
              >
                <span className="material-symbols-outlined text-[16px]">credit_card</span>
                Update payment method
              </button>
            </div>
          ) : (
            <div
              className="text-center py-8 flex-1 flex flex-col justify-center items-center"
              style={{ border: `1px dashed ${t.border}`, borderRadius: 2, background: t.surfaceMuted }}
            >
              <span className="material-symbols-outlined text-3xl mb-2 select-none" style={{ color: t.muted }}>credit_card</span>
              <p className="text-sm mb-4" style={{ color: t.muted }}>No payment method on file.</p>
              <Link
                href="/pricing"
                className="pw-interactive-custom inline-flex items-center justify-center text-sm font-semibold"
                style={{ background: t.ctaBg, color: t.ctaFg, borderRadius: 2, padding: '8px 16px' }}
              >
                Configure payment
              </Link>
            </div>
          )}

          {portalError && (
            <p
              className="text-xs px-3 py-2.5 mt-4 flex items-center gap-2"
              style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.alert }}
            >
              <span className="material-symbols-outlined text-sm select-none">error</span>
              {portalError}
            </p>
          )}
        </section>

        {/* Billing info */}
        <section className="lg:col-span-4 p-5 sm:p-6" style={panel}>
          <div className="flex justify-between items-center mb-5">
            <h4 className="text-base font-semibold" style={{ color: t.heading }}>Billing info</h4>
            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className="pw-interactive-custom p-1"
              style={{ background: 'transparent', border: 'none', color: t.muted }}
              aria-label="Edit billing info"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: t.muted }}>Company name</p>
              <p className="text-sm" style={{ color: t.heading }}>{profile?.displayName ?? 'Not configured'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: t.muted }}>Billing email</p>
              <p className="text-sm" style={{ color: t.heading }}>{profile?.email ?? user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: t.muted }}>Status</p>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: subStatus.bg, color: subStatus.fg, border: `1px solid ${t.border}`, borderRadius: 2 }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: subStatus.fg }}
                />
                {statusLabel}
              </span>
            </div>
          </div>
        </section>

        <div className="lg:col-span-4">
          <AccountTierSettings />
        </div>

        {/* API usage */}
        <section className="lg:col-span-4 p-5 sm:p-6 min-h-[200px] flex flex-col justify-between" style={panel}>
          <div>
            <div className="flex justify-between items-center mb-5">
              <h4 className="text-base font-semibold" style={{ color: t.heading }}>API usage</h4>
              <span className="material-symbols-outlined text-xl select-none" style={{ color: t.muted }}>api</span>
            </div>

            {usageLoading ? (
              <div className="flex items-center justify-center py-6">
                <span className="material-symbols-outlined animate-spin text-xl select-none" style={{ color: t.muted }}>progress_activity</span>
              </div>
            ) : rentcastUsage ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: t.muted }}>
                    RentCast API volume
                  </p>
                  <p className="text-2xl font-semibold tabular-nums" style={{ color: t.heading }}>
                    <span style={{ color: t.accent }}>{rentcastUsage.count}</span>
                    <span className="text-sm font-normal" style={{ color: t.muted }}> / {rentcastUsage.limit} calls</span>
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: t.muted }}>
                    Safety threshold for automated sourcing API spend.
                  </p>
                </div>

                <div className="h-1.5 w-full overflow-hidden" style={{ background: t.surfaceHigh, borderRadius: 1 }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.min((rentcastUsage.count / rentcastUsage.limit) * 100, 100)}%`,
                      background:
                        rentcastUsage.count >= rentcastUsage.limit * 0.9
                          ? t.alert
                          : rentcastUsage.count >= rentcastUsage.limit * 0.7
                          ? t.warn
                          : t.accent,
                      borderRadius: 1,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: t.muted }}>Usage data currently unavailable.</p>
            )}
          </div>
        </section>

        {/* Change plan */}
        <section className="lg:col-span-12 p-5 sm:p-6" style={panel}>
          <h3 className="text-base font-semibold mb-1" style={{ color: t.heading }}>Change your plan</h3>
          <p className="text-xs mb-5 leading-relaxed" style={{ color: t.muted }}>
            Switch anytime. Checkout handles proration through Stripe.
          </p>

          {planChangeError && (
            <p
              className="text-xs px-3 py-2.5 mb-5 flex items-center gap-2"
              style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.alert }}
            >
              <span className="material-symbols-outlined text-sm select-none">error</span>
              {planChangeError}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLAN_SWITCH_OPTIONS.map((option) => {
              const isCurrent  = plan === option.canonicalKey;
              const isUpgrade  = option.monthlyPrice > currentPrice && !isCurrent;
              const isLoading  = planChangeLoading === option.displayName;

              const buttonLabel = isCurrent
                ? 'Current plan'
                : isUpgrade
                  ? `Upgrade to ${option.displayName}`
                  : `Downgrade to ${option.displayName}`;

              return (
                <div
                  key={option.id}
                  className="p-5"
                  style={{
                    background: isCurrent ? t.accentMuted : t.surfaceMuted,
                    border: `1px solid ${isCurrent ? t.accent : t.border}`,
                    borderRadius: 2,
                  }}
                >
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: t.heading }}>{option.displayName}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.muted }}>{option.description}</p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums shrink-0" style={{ color: t.heading }}>
                      ${option.monthlyPrice}
                      <span className="text-xs font-normal" style={{ color: t.muted }}>/mo</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => !isCurrent && handleChangePlan(option.displayName)}
                    disabled={isCurrent || isLoading || !!planChangeLoading}
                    className="pw-interactive-custom w-full flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-55"
                    style={
                      isCurrent
                        ? { background: t.surface, color: t.accent, border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 14px' }
                        : isUpgrade
                          ? { background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 14px' }
                          : { background: 'transparent', color: t.heading, border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 14px' }
                    }
                  >
                    {isLoading && (
                      <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                    )}
                    {buttonLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Billing history */}
        <section className="lg:col-span-8 p-5 sm:p-6" style={panel}>
          <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
            <h3 className="text-base font-semibold" style={{ color: t.heading }}>Billing history</h3>
            {plan !== 'None' && invoices.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                className="pw-interactive-custom flex items-center justify-center gap-2 text-xs font-semibold"
                style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.border}`, borderRadius: 2, padding: '6px 12px' }}
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download all
              </button>
            )}
          </div>

          {invoicesLoading ? (
            <div className="flex items-center justify-center py-10">
              <span className="material-symbols-outlined animate-spin text-2xl select-none" style={{ color: t.muted }}>progress_activity</span>
            </div>
          ) : plan === 'None' || invoices.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-3xl mb-2 select-none opacity-30" style={{ color: t.muted }}>description</span>
              <p className="text-sm" style={{ color: t.muted }}>No invoices yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.divider}` }}>
                    {['Date', 'Invoice ID', 'Amount', 'Status', 'Invoice'].map((h, i) => (
                      <th
                        key={h}
                        className={`pb-3 text-[10px] font-semibold uppercase tracking-[0.12em] ${i === 0 ? 'pl-3' : ''} ${i === 2 ? 'text-right' : ''} ${i === 4 ? 'text-center w-16' : ''}`}
                        style={{ color: t.muted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {invoices.map((inv) => {
                    const invSt = statusStyle(t, inv.status);
                    return (
                      <tr
                        key={inv.id}
                        style={{ borderBottom: `1px solid ${t.divider}` }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="py-3 pl-3" style={{ color: t.heading }}>{inv.date}</td>
                        <td className="py-3" style={{ color: t.muted }}>{inv.number ?? inv.id.substring(0, 12)}</td>
                        <td className="py-3 text-right tabular-nums" style={{ color: t.heading }}>{inv.amount}</td>
                        <td className="py-3">
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ background: invSt.bg, color: invSt.fg, border: `1px solid ${t.border}`, borderRadius: 2 }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {inv.pdfUrl ? (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block p-1"
                              style={{ color: t.muted }}
                              title="Download PDF statement"
                            >
                              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                            </a>
                          ) : (
                            <span className="p-1 inline-block opacity-25" style={{ color: t.muted }}>
                              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                            </span>
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

        <div className="lg:col-span-12">
          <CloudStorageMeter />
        </div>
      </div>
    </div>
  );
}
