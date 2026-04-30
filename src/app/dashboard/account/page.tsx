'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ExternalLink,
  CreditCard,
} from 'lucide-react';
import { CloudStorageMeter } from '@/components/settings/CloudStorageMeter';

/* ═══════════════════════════════════════════════════════
   Account & Billing Page
   
   Route: /dashboard/account
   Displays organizational profile data and subscription 
   details with Stripe Customer Portal integration.
   ═══════════════════════════════════════════════════════ */

const PLAN_PRICING: Record<string, { label: string; price: string; period: string }> = {
  'Individual':      { label: 'Individual',          price: '$59',  period: '/mo' },
  'Team':            { label: 'Investor Team',       price: '$99',  period: '/mo' },
  'Lawyer Lead-Gen': { label: 'Service Professional', price: '$79', period: '/mo' },
  'None':            { label: 'No active plan',      price: '—',    period: ''    },
};

const STATUS_BADGE: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  active:   { label: 'Active',   cls: 'bg-green-50  text-green-700 border-green-200',  Icon: CheckCircle2  },
  past_due: { label: 'Past Due', cls: 'bg-amber-50  text-amber-700 border-amber-200',  Icon: AlertTriangle },
  canceled: { label: 'Canceled', cls: 'bg-red-50    text-red-700   border-red-200',     Icon: AlertTriangle },
  inactive: { label: 'Inactive', cls: 'bg-bg-primary  text-text-secondary  border-border-accent',   Icon: AlertTriangle },
};

export default function AccountPage() {
  const { user, profile } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const rawPlan = profile?.subscriptionPlan ?? 'None';
  
  // Map internal plans to the requested Basic/Pro/Enterprise display tiers
  const tierMap: Record<string, string> = {
    'Individual':      'Basic',
    'Team':            'Pro',
    'Lawyer Lead-Gen': 'Enterprise',
    'None':            'No active plan'
  };

  const planTier = tierMap[rawPlan] || 'Basic';
  const status = profile?.subscriptionStatus ?? 'inactive';
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE['inactive'];
  const StatusIcon = statusBadge.Icon;

  // Next billing date calculation
  const now = new Date();
  const nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextBillingStr = nextBilling.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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
    <div className="dashboard-context max-w-5xl mx-auto space-y-8 py-8">
      
      {/* Page Header */}
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--pw-black)' }}>Account & Billing</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Manage your organizational profile and institutional subscription details.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ─── Profile Details (LHS) ─── */}
        <section className="lg:col-span-7 bg-bg-surface border border-border-ui p-8 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <Building2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              Organizational Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Full Name</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{user?.displayName || profile?.displayName || '—'}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Email Address</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{user?.email || '—'}</p>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-border-ui/30">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Organization ID</p>
              <p className="text-xs font-mono bg-bg-primary px-3 py-1.5 inline-block border border-border-ui rounded-sm">
                {profile?.organizationId || '—'}
              </p>
            </div>
          </div>
        </section>


        {/* ─── Subscription Status (RHS) ─── */}
        <section className="lg:col-span-5 bg-bg-surface border border-border-ui p-8 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-8">
            <CreditCard className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              Subscription Tier
            </h2>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{planTier}</span>
              <span 
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border"
                style={{ 
                  backgroundColor: status === 'active' ? '#f0fdf4' : '#fff7ed',
                  color: status === 'active' ? '#166534' : '#9a3412',
                  borderColor: status === 'active' ? '#bbf7d0' : '#fed7aa'
                }}
              >
                <StatusIcon className="w-3 h-3" />
                {statusBadge.label}
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Account Standing
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t border-border-ui/30 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Next Billing Date</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{rawPlan !== 'None' ? nextBillingStr : '—'}</span>
            </div>
          </div>

          {portalError && (
            <p className="text-xs text-red-600 mb-4 font-bold uppercase tracking-tight">{portalError}</p>
          )}

          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="ag-button w-full !text-xs !py-3"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>{rawPlan !== 'None' ? 'Manage Billing' : 'View Plans'} <ExternalLink className="w-3.5 h-3.5" /></>
            )}
          </button>
        </section>
      </div>

      <CloudStorageMeter />
    </div>
  );
}
