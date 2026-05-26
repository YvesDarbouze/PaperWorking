'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { CloudStorageMeter } from '@/components/settings/CloudStorageMeter';

/* ═══════════════════════════════════════════════════════
   Billing & Subscription Settings (Luminous Glass Terminal)
   ═══════════════════════════════════════════════════════ */

const PLAN_PRICING: Record<string, { label: string; price: string; period: string }> = {
  'Individual':      { label: 'Individual',          price: '$59',  period: '/mo' },
  'Team':            { label: 'Investor Team',       price: '$99',  period: '/mo' },
  'Vendor Network':  { label: 'Vendor Marketplace',  price: '$39',  period: '/mo' },
  'None':            { label: 'No active plan',      price: '—',    period: ''    },
};

const STATUS_BADGE: Record<string, { label: string; cls: string; iconName: string }> = {
  active:   { label: 'Active',   cls: 'bg-pw-primary/10 text-pw-primary border-pw-primary/30 shadow-sm shadow-pw-primary/10', iconName: 'check_circle' },
  trialing: { label: 'Trial',    cls: 'bg-pw-primary/10 text-pw-primary border-pw-primary/30', iconName: 'check_circle' },
  past_due: { label: 'Past Due', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30', iconName: 'warning' },
  canceled: { label: 'Canceled', cls: 'bg-error/10 text-error border-error/30', iconName: 'warning' },
  inactive: { label: 'Inactive', cls: 'bg-pw-glass-bg text-pw-muted border-pw-border', iconName: 'warning' },
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

export default function BillingSettingsPage() {
  const { user, profile } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]     = useState<string | null>(null);
  const [invoices, setInvoices]           = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<number | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    setInvoicesLoading(true);
    setSubscriptionLoading(true);
    
    user.getIdToken().then((idToken) => {
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
    });
  }, [user]);

  const plan    = profile?.subscriptionPlan   ?? 'None';
  const status  = profile?.subscriptionStatus ?? 'inactive';
  const lastFour = profile?.lastFour ?? '4242';
  const cardBrand = profile?.cardBrand ?? 'Visa';

  const planInfo    = PLAN_PRICING[plan]   ?? PLAN_PRICING['None'];
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE['inactive'];

  // Format next billing date from actual stripe subscription data
  const nextBillingStr = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : subscriptionLoading
      ? 'Loading...'
      : 'N/A';

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
      window.location.href = data.url;
    } catch (err: any) {
      setPortalError(err.message);
      setPortalLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* ─── Grid Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Plan and Payment */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Card 1: Subscription Overview */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-pw-border/50">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-1">Current Subscription</h2>
                <p className="text-xl font-bold text-pw-black">{planInfo.label}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest border px-3 py-1 rounded-full ${statusBadge.cls}`}>
                <span className="material-symbols-outlined text-sm select-none">{statusBadge.iconName}</span>
                {statusBadge.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 pt-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-2">Monthly Commitment</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-light text-pw-black">{planInfo.price}</span>
                  <span className="text-sm text-pw-muted">{planInfo.period}</span>
                </div>
              </div>
              
              {plan !== 'None' && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-2">Next Billing Date</p>
                  <p className="text-sm font-semibold text-pw-black">{nextBillingStr}</p>
                </div>
              )}
            </div>

            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="luminous-button w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {portalLoading ? (
                <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm select-none">open_in_new</span>
              )}
              {portalLoading ? 'Synchronizing…' : 'Manage Subscription'}
            </button>
          </section>

          {/* Card 2: Payment Method */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pw-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">credit_card</span>
              Payment Method
            </h2>

            {(profile?.stripeCustomerId || plan !== 'None') ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-pw-glass-bg border border-pw-border rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-9 bg-gradient-to-br from-pw-black/10 to-pw-black/20 rounded border border-pw-border flex items-center justify-center shadow-sm">
                    <span className="text-pw-black font-bold italic text-xs tracking-wider">VISA</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-pw-black flex items-center gap-2">
                      <span className="tracking-widest text-pw-muted">•••• •••• ••••</span> 
                      <span>{lastFour}</span>
                    </p>
                    <p className="text-xs text-pw-muted flex items-center gap-1.5 mt-1">
                      <span className="material-symbols-outlined text-xs text-pw-primary select-none">lock</span> 
                      Secure Payment via Stripe
                    </p>
                  </div>
                </div>
                <button
                  onClick={openPortal}
                  className="text-xs font-bold text-pw-primary uppercase tracking-widest hover:underline px-4 py-2 cursor-pointer"
                >
                  Update Card
                </button>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-pw-border rounded-2xl bg-pw-glass-bg/50">
                <span className="material-symbols-outlined text-3xl text-pw-muted mb-2 select-none">credit_card</span>
                <p className="text-sm text-pw-muted mb-4">No payment method on file.</p>
                <Link href="/pricing" className="luminous-button inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg">
                  Configure Payment
                </Link>
              </div>
            )}

            {portalError && (
              <p className="text-xs text-error bg-error/10 border border-error/30 rounded-lg px-4 py-3 mt-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm select-none">error</span>
                {portalError}
              </p>
            )}
          </section>

          <CloudStorageMeter />
        </div>

        {/* Right Column: Billing Archive */}
        <div className="lg:col-span-5 space-y-8">
          <section className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-pw-border/50">
              <h2 className="text-xs font-bold uppercase tracking-widest text-pw-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-base">receipt_long</span>
                Billing Archive
              </h2>
              {plan !== 'None' && invoices.length > 0 && (
                <button className="text-xs font-bold text-pw-primary uppercase tracking-widest hover:underline cursor-pointer">
                  Download All
                </button>
              )}
            </div>

            {invoicesLoading ? (
              <div className="flex items-center justify-center py-10">
                <span className="material-symbols-outlined animate-spin text-2xl text-pw-muted select-none">progress_activity</span>
              </div>
            ) : plan === 'None' || invoices.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-3xl text-pw-muted/20 mb-2 select-none">description</span>
                <p className="text-sm text-pw-muted">No transactional history recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 sm:-mx-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-pw-border bg-pw-glass-bg">
                      <th className="px-6 sm:px-8 py-3 text-xs font-bold uppercase tracking-widest text-pw-muted">Statement</th>
                      <th className="px-6 sm:px-8 py-3 text-xs font-bold uppercase tracking-widest text-pw-muted">Issue Date</th>
                      <th className="px-6 sm:px-8 py-3 text-xs font-bold uppercase tracking-widest text-pw-muted">Amount</th>
                      <th className="px-6 sm:px-8 py-3 text-xs font-bold uppercase tracking-widest text-pw-muted">Status</th>
                      <th className="px-6 sm:px-8 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pw-border/50">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="group hover:bg-pw-glass-bg transition-colors">
                        <td className="px-6 sm:px-8 py-3.5">
                          <span className="flex items-center gap-2 text-sm font-semibold text-pw-black">
                            <span className="material-symbols-outlined text-pw-muted text-lg select-none">description</span>
                            {inv.number ?? inv.id.substring(0, 12)}
                          </span>
                        </td>
                        <td className="px-6 sm:px-8 py-3.5 text-xs text-pw-muted">{inv.date}</td>
                        <td className="px-6 sm:px-8 py-3.5 text-sm font-bold text-pw-black">{inv.amount}</td>
                        <td className="px-6 sm:px-8 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border rounded-sm ${
                            inv.status === 'paid'
                              ? 'bg-pw-primary/10 text-pw-primary border-pw-primary/20'
                              : inv.status === 'open'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-pw-glass-bg text-pw-muted border-pw-border'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 sm:px-8 py-3.5 text-right">
                          {inv.pdfUrl ? (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-pw-muted hover:text-pw-primary transition-colors inline-block"
                              title="Download PDF statement"
                            >
                              <span className="material-symbols-outlined text-lg select-none">download</span>
                            </a>
                          ) : (
                            <span className="p-2 text-pw-muted/20 inline-block">
                              <span className="material-symbols-outlined text-lg select-none">download</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

