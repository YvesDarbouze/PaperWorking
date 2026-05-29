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
      {/* ─── 12-Column Bento Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ━━━ 1. Hero Plan Card (col-span-8) ━━━ */}
        <section className="lg:col-span-8 glass-card rounded-2xl p-8 relative overflow-hidden min-h-[280px] flex flex-col justify-between">
          {/* Glow blob */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-pw-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <span className="inline-block px-3 py-1 bg-pw-primary/10 text-pw-primary text-[10px] font-extrabold uppercase tracking-widest rounded-full border border-pw-primary/20 mb-3">
                  Current Plan
                </span>
                <h3 className="text-3xl font-bold text-pw-black flex items-center gap-3">
                  {planInfo.label}
                  <span className="material-symbols-outlined text-pw-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </h3>
              </div>
              <div className="text-left md:text-right">
                <p className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-1">Next Billing Date</p>
                <p className="font-headline-md text-headline-md text-pw-black">{nextBillingStr}</p>
                <p className="font-body-md text-body-md text-pw-muted mt-1">{planInfo.price}{planInfo.period} USD / month</p>
              </div>
            </div>

            {/* Seat Usage Meter */}
            {plan !== 'None' && (
              <div className="bg-pw-glass-bg/50 rounded-lg p-6 border border-white/5">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h4 className="font-label-md text-label-md text-pw-black mb-1">Seat Usage</h4>
                    <p className="font-body-sm text-body-sm text-pw-muted">
                      <span className="text-pw-primary font-bold">{seatsUsed}</span> of {maxSeats} Active Seats
                    </p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-3 w-full rounded-full bg-pw-glass-bg overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-pw-primary rounded-full shadow-[0_0_12px_theme(colors.pw-primary/0.5)] transition-all duration-500"
                    style={{ width: `${(seatsUsed / maxSeats) * 100}%` }}
                  />
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <button className="font-label-md text-label-md text-pw-muted hover:text-pw-black flex items-center gap-2 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">group_add</span> Manage Team
                  </button>
                  <button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="luminous-button px-6 py-2.5 rounded-lg font-label-md text-label-md font-bold disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {portalLoading ? (
                      <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px] select-none">add</span>
                    )}
                    {portalLoading ? 'Synchronizing…' : 'Add Seats'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Manage Subscription button for 'None' plan or secondary action */}
          {plan === 'None' && (
            <div className="flex flex-col sm:flex-row gap-4 mt-6 relative z-10">
              <Link href="/pricing" className="luminous-button inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl">
                Choose a Plan
              </Link>
            </div>
          )}
        </section>

        {/* ━━━ 2. Payment Method (col-span-4) ━━━ */}
        <section className="lg:col-span-4 glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[280px]">
          <h4 className="font-headline-md text-headline-md text-pw-black mb-6">Payment Method</h4>

          {(profile?.stripeCustomerId || plan !== 'None') ? (
            <div className="flex-1 flex flex-col justify-between">
              {/* Card display */}
              <div className="bg-pw-glass-bg/50 rounded-lg p-5 border border-white/5 flex items-start gap-4 mb-4 relative overflow-hidden group">
                {/* Abstract blob effect */}
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-pw-primary/20 rounded-full blur-xl group-hover:bg-pw-primary/30 transition-colors" />
                <div className="w-12 h-8 bg-pw-glass-bg rounded flex items-center justify-center border border-white/10 shrink-0 mt-1">
                  <span className="font-mono text-xs font-bold italic text-pw-black/80">{cardBrand.toUpperCase()}</span>
                </div>
                <div className="flex-1 relative z-10">
                  <p className="font-label-md text-label-md text-pw-black flex items-center gap-2">
                    <span className="font-mono tracking-widest">•••• {lastFour}</span>
                    <span className="px-2 py-0.5 bg-pw-primary/10 text-pw-primary text-[10px] font-bold rounded-full border border-pw-primary/20">DEFAULT</span>
                  </p>
                  <p className="font-body-sm text-body-sm text-pw-muted mt-1">Expires 12/26</p>
                </div>
              </div>

              {/* Update button */}
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="w-full py-3 rounded-lg border border-white/10 text-pw-black font-label-md text-label-md hover:bg-white/5 hover:border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
                Update Payment Method
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

        {/* ━━━ 3. Billing Info (col-span-4) ━━━ */}
        <section className="lg:col-span-4 glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-headline-md text-headline-md text-pw-black">Billing Info</h4>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="text-pw-muted hover:text-pw-primary transition-colors p-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-1">Company Name</p>
              <p className="font-body-md text-body-md text-pw-black">{profile?.displayName ?? 'Not configured'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-1">Billing Email</p>
              <p className="font-body-md text-body-md text-pw-black">{profile?.email ?? user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge.cls}`}>
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{statusBadge.iconName}</span>
                {statusBadge.label}
              </span>
            </div>
          </div>
        </section>

        {/* ━━━ 4. Billing History (col-span-8) ━━━ */}
        <section className="lg:col-span-8 glass-card rounded-2xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-pw-black">Billing History</h3>
            {plan !== 'None' && invoices.length > 0 && (
              <button className="font-label-md text-label-md text-pw-primary flex items-center gap-2 hover:text-pw-primary/80 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">download</span>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-4 pl-4 text-xs font-semibold text-pw-muted uppercase tracking-wider">Date</th>
                    <th className="pb-4 text-xs font-semibold text-pw-muted uppercase tracking-wider">Invoice ID</th>
                    <th className="pb-4 text-right text-xs font-semibold text-pw-muted uppercase tracking-wider">Amount</th>
                    <th className="pb-4 text-xs font-semibold text-pw-muted uppercase tracking-wider">Status</th>
                    <th className="pb-4 text-center text-xs font-semibold text-pw-muted uppercase tracking-wider w-16">Invoice</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pl-4 text-pw-black">{inv.date}</td>
                      <td className="py-4 text-pw-muted">{inv.number ?? inv.id.substring(0, 12)}</td>
                      <td className="py-4 text-right text-pw-black">{inv.amount}</td>
                      <td className="py-4">
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
                      <td className="py-4 text-center">
                        {inv.pdfUrl ? (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pw-muted hover:text-pw-primary transition-colors p-1 rounded-md hover:bg-white/5 inline-block"
                            title="Download PDF statement"
                          >
                            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                          </a>
                        ) : (
                          <span className="p-1 text-pw-muted/20 inline-block">
                            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
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

        {/* ━━━ 5. Cloud Storage Meter (col-span-12) ━━━ */}
        <div className="lg:col-span-12">
          <CloudStorageMeter />
        </div>

      </div>
    </div>
  );
}
