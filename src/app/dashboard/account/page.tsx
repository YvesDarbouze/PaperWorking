'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { CloudStorageMeter } from '@/components/settings/CloudStorageMeter';

/* ═══════════════════════════════════════════════════════
   Account & Billing Page (Luminous Glass Terminal)
   Route: /dashboard/account
   ═══════════════════════════════════════════════════════ */

const PLAN_PRICING: Record<string, { label: string; price: string; period: string }> = {
  'Individual':      { label: 'Individual',          price: '$59',  period: '/mo' },
  'Team':            { label: 'Investor Team',       price: '$99',  period: '/mo' },
  'Vendor Network':  { label: 'Vendor Marketplace',  price: '$39',  period: '/mo' },
  'None':            { label: 'No active plan',      price: '—',    period: ''    },
};

const STATUS_BADGE: Record<string, { label: string; cls: string; iconName: string }> = {
  active:   { label: 'Active',   cls: 'bg-[#57f1db]/10 text-[#57f1db] border-[#57f1db]/30 shadow-[0_0_15px_rgba(87,241,219,0.1)]',  iconName: 'check_circle'  },
  trialing: { label: 'Trial',    cls: 'bg-[#adc6ff]/10 text-[#adc6ff] border-[#adc6ff]/30',   iconName: 'check_circle'  },
  past_due: { label: 'Past Due', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',  iconName: 'warning' },
  canceled: { label: 'Canceled', cls: 'bg-red-500/10 text-red-400 border-red-500/30',     iconName: 'warning' },
  inactive: { label: 'Inactive', cls: 'bg-white/5 text-[#8a9b9b] border-white/10',   iconName: 'warning' },
};

export default function AccountPage() {
  const { user, profile } = useAuth();
  const { activeTenantId } = useTenant();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const rawPlan = profile?.subscriptionPlan ?? 'None';
  
  // Map internal plans to the requested Basic/Pro/Enterprise display tiers
  const tierMap: Record<string, string> = {
    'Individual':      'Basic',
    'Team':            'Pro',
    'Vendor Network':  'Vendor',
    'None':            'No active plan'
  };

  const planTier = tierMap[rawPlan] || 'Basic';
  const status = profile?.subscriptionStatus ?? 'inactive';
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE['inactive'];

  // Next billing date calculation
  const now = new Date();
  const nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextBillingStr = nextBilling.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const openPortal = async () => {
    if (!user) return;

    // Users without a subscription should go to the pricing page
    if (rawPlan === 'None' || status === 'inactive') {
      window.location.href = '/pricing';
      return;
    }

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
    <div className="dashboard-context max-w-5xl mx-auto space-y-8 py-8 px-4 sm:px-6">
      
      {/* Page Header */}
      <header className="pb-4 border-b border-white/5">
        <h1 className="text-2xl font-light text-white mb-2" style={{ textShadow: '0 0 20px rgba(87,241,219,0.1)' }}>Account & Billing</h1>
        <p className="text-sm text-[#8a9b9b]">
          Manage your organizational profile, subscription plan, and cloud document capacities.
        </p>
      </header>

      {/* ─── Cancellation Banner ─── */}
      {profile?.cancelAtPeriodEnd && (
        <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-amber-400 select-none">warning</span>
            <div>
              <p className="text-sm font-bold text-amber-400">
                Your subscription is scheduled to cancel
              </p>
              <p className="text-xs text-[#8a9b9b] mt-0.5">
                You'll retain access until{' '}
                <strong className="text-white">
                  {profile.currentPeriodEnd
                    ? new Date(profile.currentPeriodEnd).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'the end of your billing period'}
                </strong>
                . Reactivate anytime from the billing portal.
              </p>
            </div>
          </div>
          <button
            onClick={openPortal}
            className="px-4 py-2 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors flex-shrink-0 cursor-pointer"
          >
            Reactivate
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ─── Profile Details (LHS) ─── */}
        <section className="lg:col-span-7 glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-8 text-[#57f1db]">
            <span className="material-symbols-outlined text-lg select-none">domain</span>
            <h2 className="text-xs font-bold uppercase tracking-widest">
              Organizational Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-[#8a9b9b]">Full Name</p>
              <p className="text-sm font-semibold text-white">{user?.displayName || profile?.displayName || '—'}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-[#8a9b9b]">Email Address</p>
              <p className="text-sm font-semibold text-white">{user?.email || '—'}</p>
            </div>

            <div className="md:col-span-2 pt-6 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-[#8a9b9b]">Organization ID</p>
              <p className="text-xs font-mono bg-black/40 text-[#57f1db] px-4 py-2 inline-block border border-white/10 rounded-lg shadow-[0_0_10px_rgba(87,241,219,0.05)]">
                {activeTenantId || '—'}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Subscription Status (RHS) ─── */}
        <section className="lg:col-span-5 glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col">
          <div className="flex items-center gap-2 mb-8 text-[#57f1db]">
            <span className="material-symbols-outlined text-lg select-none">credit_card</span>
            <h2 className="text-xs font-bold uppercase tracking-widest">
              Subscription Tier
            </h2>
          </div>

          <div className="mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-light text-white">{planTier}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase tracking-widest border rounded-full ${statusBadge.cls}`}>
                <span className="material-symbols-outlined text-[12px] select-none">{statusBadge.iconName}</span>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9b9b]">
              Account Standing
            </p>
          </div>

          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-semibold text-[#8a9b9b]">Next Billing Date</span>
            <span className="text-sm font-bold text-white">{rawPlan !== 'None' ? nextBillingStr : '—'}</span>
          </div>

          {portalError && (
            <p className="text-xs text-red-400 mb-4 font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs select-none">error</span>
              {portalError}
            </p>
          )}

          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="luminous-button w-full inline-flex items-center justify-center gap-2 bg-[#57f1db]/20 border border-[#57f1db]/30 text-[#57f1db] text-xs font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-[#57f1db]/30 transition-all disabled:opacity-50"
          >
            {portalLoading ? (
              <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm select-none">open_in_new</span>
            )}
            {portalLoading ? 'Processing…' : (rawPlan !== 'None' ? 'Manage Billing' : 'View Plans')}
          </button>
        </section>
      </div>

      <CloudStorageMeter />
    </div>
  );
}

