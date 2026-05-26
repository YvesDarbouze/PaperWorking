'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useUserStore } from '@/store/userStore';
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

  const teamMembers = useUserStore((s) => s.teamMembers);
  const maxSeats = useUserStore((s) => s.maxSeats) || 10;
  const activeMembers = teamMembers.filter((m) => m.status !== 'removed');
  const seatsUsed = activeMembers.length;

  return (
    <div className="w-full space-y-8">
      {/* ─── Bento Grid Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md items-start">
        
        {/* Subscription Status Card */}
        <section className="lg:col-span-8 glass-card glass-card-bright p-8 rounded-2xl flex flex-col justify-between min-h-[280px]">
          <div>
            <div className="flex justify-between items-start mb-stack-lg">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-pw-primary/20 text-pw-primary text-[10px] font-extrabold uppercase tracking-widest mb-2 border border-pw-primary/20">Current Active Plan</span>
                <h3 className="font-headline-md text-headline-md text-pw-black">{planInfo.label}</h3>
                <p className="font-body-md text-body-md text-pw-muted">{planInfo.price}{planInfo.period} USD / month</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-pw-muted mb-1">Next Billing Date</p>
                <p className="font-label-md text-label-md text-pw-black">{nextBillingStr}</p>
              </div>
            </div>
            
            {/* Seat Usage */}
            {plan !== 'None' && (
              <div className="mb-stack-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-label-md text-label-md text-pw-black">Seat Usage</span>
                  <span className="font-label-md text-label-md text-pw-muted">
                    <span className="text-pw-primary font-bold">{seatsUsed}</span> / {maxSeats} seats used
                  </span>
                </div>
                <div className="w-full h-2 bg-pw-glass-bg border border-pw-border rounded-full overflow-hidden flex">
                  {/* Active Seats */}
                  <div className="h-full bg-pw-primary glow-accent" style={{ width: `${(seatsUsed / maxSeats) * 100}%` }}></div>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-stack-md mt-4">
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="luminous-button px-6 py-3 rounded-xl font-label-md text-label-md font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {portalLoading ? (
                <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm select-none">open_in_new</span>
              )}
              {portalLoading ? 'Synchronizing…' : 'Manage Subscription'}
            </button>
          </div>
        </section>

        {/* Payment Method Card */}
        <section className="lg:col-span-4 glass-card glass-card-bright p-8 rounded-2xl flex flex-col justify-between min-h-[280px]">
          <h4 className="font-label-md text-label-md text-pw-muted mb-4 uppercase tracking-wider">Payment Method</h4>
          
          {(profile?.stripeCustomerId || plan !== 'None') ? (
            <div className="flex-1 flex flex-col justify-center">
              <div className="relative w-full aspect-[1.58/1] rounded-xl overflow-hidden bg-gradient-to-br from-pw-glass-bg to-pw-glass-bg/60 p-6 border border-white/10 mb-4">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <span className="material-symbols-outlined text-[48px]">credit_card</span>
                </div>
                <div className="flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center border border-white/10">
                      <span className="material-symbols-outlined text-pw-primary">token</span>
                    </div>
                    <span className="font-bold text-pw-black italic">{cardBrand.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-[12px] text-pw-muted mb-1">Card Number</p>
                    <p className="font-headline-md text-pw-black tracking-widest text-[18px]">•••• •••• •••• {lastFour}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 hover:bg-white/5 hover:border-pw-primary/45 transition-all group cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] text-pw-muted group-hover:text-pw-primary transition-colors">add</span>
                <span className="font-label-md text-label-md text-pw-muted group-hover:text-pw-black transition-colors">Update Payment Method</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-pw-border rounded-2xl bg-pw-glass-bg/50 flex-1 flex flex-col justify-center items-center">
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

        {/* Cloud Storage Meter */}
        <div className="lg:col-span-12">
          <CloudStorageMeter />
        </div>

        {/* Invoices Table Area */}
        <section className="lg:col-span-12 glass-card glass-card-bright rounded-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
            <h4 className="font-label-md text-label-md text-pw-black">Recent Invoices</h4>
            {plan !== 'None' && invoices.length > 0 && (
              <button className="text-pw-primary font-label-md text-label-md flex items-center gap-1 hover:underline cursor-pointer">
                View all
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-8 py-4 font-label-sm text-label-sm text-pw-muted uppercase tracking-wider">Date</th>
                    <th className="px-8 py-4 font-label-sm text-label-sm text-pw-muted uppercase tracking-wider">Invoice ID</th>
                    <th className="px-8 py-4 font-label-sm text-label-sm text-pw-muted uppercase tracking-wider">Amount</th>
                    <th className="px-8 py-4 font-label-sm text-label-sm text-pw-muted uppercase tracking-wider">Status</th>
                    <th className="px-8 py-4 font-label-sm text-label-sm text-pw-muted uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-4 font-body-sm text-body-sm text-pw-black">{inv.date}</td>
                      <td className="px-8 py-4 font-body-sm text-body-sm text-pw-muted">{inv.number ?? inv.id.substring(0, 12)}</td>
                      <td className="px-8 py-4 font-body-sm text-body-sm text-pw-black">{inv.amount}</td>
                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.status === 'paid'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : inv.status === 'open'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-pw-glass-bg text-pw-muted border-pw-border'
                        }`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        {inv.pdfUrl ? (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-pw-muted hover:text-pw-primary inline-block"
                            title="Download PDF statement"
                          >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                          </a>
                        ) : (
                          <span className="p-2 text-pw-muted/20 inline-block">
                            <span className="material-symbols-outlined text-[20px]">download</span>
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
  );
}


