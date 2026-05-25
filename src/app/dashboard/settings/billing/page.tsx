'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

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
  active:   { label: 'Active',   cls: 'bg-[#57f1db]/10 text-[#57f1db] border-[#57f1db]/30 shadow-[0_0_15px_rgba(87,241,219,0.1)]', iconName: 'check_circle' },
  trialing: { label: 'Trial',    cls: 'bg-[#adc6ff]/10 text-[#adc6ff] border-[#adc6ff]/30', iconName: 'check_circle' },
  past_due: { label: 'Past Due', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30', iconName: 'warning' },
  canceled: { label: 'Canceled', cls: 'bg-red-500/10 text-red-400 border-red-500/30', iconName: 'warning' },
  inactive: { label: 'Inactive', cls: 'bg-white/5 text-[#8a9b9b] border-white/10', iconName: 'warning' },
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
    <div className="space-y-8 max-w-3xl">
      
      {/* ═══ Card 1: Subscription Overview ═══ */}
      <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#8a9b9b] mb-1">Current Subscription</h2>
            <p className="text-xl font-bold text-white">{planInfo.label}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border px-3 py-1 rounded-full ${statusBadge.cls}`}>
            <span className="material-symbols-outlined text-[12px] select-none">{statusBadge.iconName}</span>
            {statusBadge.label}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pt-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a9b9b] mb-2">Monthly Commitment</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-light text-white">{planInfo.price}</span>
              <span className="text-sm text-[#8a9b9b]">{planInfo.period}</span>
            </div>
          </div>
          
          {plan !== 'None' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a9b9b] mb-2">Next Billing Date</p>
              <p className="text-sm font-semibold text-white">{nextBillingStr}</p>
            </div>
          )}
        </div>

        <button
          onClick={openPortal}
          disabled={portalLoading}
          className="luminous-button w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#57f1db]/20 border border-[#57f1db]/30 text-[#57f1db] text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg hover:bg-[#57f1db]/30 transition-all disabled:opacity-50"
        >
          {portalLoading ? (
            <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-sm select-none">open_in_new</span>
          )}
          {portalLoading ? 'Synchronizing…' : 'Manage Subscription'}
        </button>
      </section>

      {/* ═══ Card 2: Payment Method (Credit Card Manager) ═══ */}
      <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#57f1db] mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">credit_card</span>
          Payment Method
        </h2>

        {(profile?.stripeCustomerId || plan !== 'None') ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 bg-black/30 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-9 bg-gradient-to-br from-gray-800 to-black rounded border border-gray-700 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold italic text-xs tracking-wider">VISA</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="tracking-widest text-[#8a9b9b]">•••• •••• ••••</span> 
                  <span>{lastFour}</span>
                </p>
                <p className="text-xs text-[#8a9b9b] flex items-center gap-1.5 mt-1">
                  <span className="material-symbols-outlined text-xs text-[#57f1db] select-none">lock</span> 
                  Secure Payment via Stripe
                </p>
              </div>
            </div>
            <button
              onClick={openPortal}
              className="text-xs font-bold text-[#57f1db] uppercase tracking-widest hover:underline px-4 py-2"
            >
              Update Card
            </button>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-2xl bg-black/10">
            <span className="material-symbols-outlined text-3xl text-[#8a9b9b] mb-2 select-none">credit_card</span>
            <p className="text-sm text-[#8a9b9b] mb-4">No payment method on file.</p>
            <Link href="/pricing" className="luminous-button inline-flex items-center justify-center gap-2 bg-[#57f1db]/20 border border-[#57f1db]/30 text-[#57f1db] text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg hover:bg-[#57f1db]/30 transition-all">
              Configure Payment
            </Link>
          </div>
        )}

        {portalError && (
          <p className="text-xs text-red-400 bg-red-950/20 border border-red-500/30 rounded-lg px-4 py-3 mt-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm select-none">error</span>
            {portalError}
          </p>
        )}
      </section>

      {/* ═══ Card 3: Billing Archive (Invoices) ═══ */}
      <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-white/5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#57f1db] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">receipt_long</span>
            Billing Archive
          </h2>
          {plan !== 'None' && invoices.length > 0 && (
            <button className="text-[10px] font-bold text-[#57f1db] uppercase tracking-widest hover:underline">
              Download All
            </button>
          )}
        </div>

        {invoicesLoading ? (
          <div className="flex items-center justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-2xl text-[#8a9b9b] select-none">progress_activity</span>
          </div>
        ) : plan === 'None' || invoices.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-3xl text-[#8a9b9b]/20 mb-2 select-none">description</span>
            <p className="text-sm text-[#8a9b9b]">No transactional history recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:-mx-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/20">
                  <th className="px-6 sm:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8a9b9b]">Statement</th>
                  <th className="px-6 sm:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8a9b9b]">Issue Date</th>
                  <th className="px-6 sm:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8a9b9b]">Amount</th>
                  <th className="px-6 sm:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8a9b9b]">Status</th>
                  <th className="px-6 sm:px-8 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 sm:px-8 py-4">
                      <span className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="material-symbols-outlined text-[#8a9b9b] text-lg select-none">description</span>
                        {inv.number ?? inv.id.substring(0, 12)}
                      </span>
                    </td>
                    <td className="px-6 sm:px-8 py-4 text-sm text-[#8a9b9b]">{inv.date}</td>
                    <td className="px-6 sm:px-8 py-4 text-sm font-bold text-white">{inv.amount}</td>
                    <td className="px-6 sm:px-8 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border rounded-sm ${
                        inv.status === 'paid'
                          ? 'bg-[#57f1db]/10 text-[#57f1db] border-[#57f1db]/20'
                          : inv.status === 'open'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-white/5 text-[#8a9b9b] border-white/5'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 sm:px-8 py-4 text-right">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#8a9b9b] hover:text-[#57f1db] transition-colors inline-block"
                          title="Download PDF statement"
                        >
                          <span className="material-symbols-outlined text-lg select-none">download</span>
                        </a>
                      ) : (
                        <span className="p-2 text-white/20 inline-block">
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
  );
}

