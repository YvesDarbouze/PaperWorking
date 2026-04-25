'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, Loader2, ExternalLink, Download, FileText, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════
   Billing & Subscription Settings

   Refactored to render inside the settings layout shell.
   Four cards:
   1. Current Plan Overview — tier + pricing + next billing
   2. Payment Method — masked card on file
   3. Invoice History — downloadable table
   4. Account Details — summary info
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

// Placeholder invoices for demo
const MOCK_INVOICES = [
  { id: 'INV-2026-04', date: 'Apr 1, 2026', amount: '$59.00', status: 'Paid' },
  { id: 'INV-2026-03', date: 'Mar 1, 2026', amount: '$59.00', status: 'Paid' },
  { id: 'INV-2026-02', date: 'Feb 1, 2026', amount: '$59.00', status: 'Paid' },
  { id: 'INV-2026-01', date: 'Jan 1, 2026', amount: '$59.00', status: 'Paid' },
  { id: 'INV-2025-12', date: 'Dec 1, 2025', amount: '$59.00', status: 'Paid' },
];

export default function BillingSettingsPage() {
  const { user, profile } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]     = useState<string | null>(null);

  const plan    = profile?.subscriptionPlan   ?? 'None';
  const status  = profile?.subscriptionStatus ?? 'inactive';
  const lastFour = profile?.lastFour ?? '4242';

  const planInfo    = PLAN_PRICING[plan]   ?? PLAN_PRICING['None'];
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE['inactive'];
  const StatusIcon  = statusBadge.Icon;

  // Calculate next billing date (mock: 1st of next month)
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
    <div className="space-y-6">

      {/* ═══ Card 1: Current Plan Overview ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-5">Current Plan</h2>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light text-text-primary">{planInfo.price}</span>
              <span className="text-sm text-text-secondary">{planInfo.period}</span>
            </div>
            <p className="text-sm font-medium text-text-primary mt-1">{planInfo.label}</p>
            {plan !== 'None' && (
              <p className="text-xs text-text-secondary mt-2">
                Next billing date: <span className="font-medium text-text-primary">{nextBillingStr}</span>
              </p>
            )}
            {plan === 'None' && (
              <p className="text-sm text-text-secondary mt-2">
                You don&apos;t have an active subscription.{' '}
                <Link href="/pricing" className="underline hover:text-text-primary transition-colors">
                  View plans →
                </Link>
              </p>
            )}
          </div>

          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1 ${statusBadge.cls}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusBadge.label}
          </span>
        </div>

        {status === 'past_due' && (
          <div className="mt-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Your last payment failed. Update your payment method to keep your account active.
          </div>
        )}

        {plan !== 'None' && (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="mt-5 inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50"
          >
            {portalLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</>
            ) : (
              <>Upgrade / Change Plan <ExternalLink className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </section>

      {/* ═══ Card 2: Payment Method ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-5">Payment Method</h2>

        {profile?.stripeCustomerId || plan !== 'None' ? (
          <>
            <div className="flex items-center gap-4 p-4 bg-bg-primary border border-border-accent">
              <div className="w-12 h-8 bg-gradient-to-r from-pw-fg to-pw-muted rounded flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Visa ending in {lastFour}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Secured by Stripe
                </p>
              </div>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="text-xs font-medium text-text-primary underline hover:text-text-primary transition-colors"
              >
                Update
              </button>
            </div>

            {portalError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 mt-3">
                {portalError}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">No payment method on file. Subscribe to a plan to set up payment.</p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition"
            >
              View Plans →
            </Link>
          </div>
        )}
      </section>

      {/* ═══ Card 3: Invoice History ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-5">Invoice History</h2>

        {plan === 'None' ? (
          <p className="text-sm text-text-secondary py-4">No invoices yet. Invoices will appear here once you subscribe.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-accent">
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-2 pr-4">Invoice</th>
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-2 pr-4">Date</th>
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-2 pr-4">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-2 pr-4">Status</th>
                  <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wider py-2">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pw-border">
                {MOCK_INVOICES.map((inv) => (
                  <tr key={inv.id} className="hover:bg-bg-primary/50 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1.5 text-text-primary font-medium">
                        <FileText className="w-3.5 h-3.5 text-text-secondary" />
                        {inv.id}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-text-secondary">{inv.date}</td>
                    <td className="py-3 pr-4 text-text-primary font-medium">{inv.amount}</td>
                    <td className="py-3 pr-4">
                      <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="p-1.5 text-text-secondary hover:text-text-primary transition-colors" title="Download PDF">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══ Card 4: Account Details ═══ */}
      {plan !== 'None' && (
        <section className="bg-bg-surface border border-border-accent p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-5">Account Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Account email</dt>
              <dd className="text-text-primary font-medium">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Subscription plan</dt>
              <dd className="text-text-primary font-medium">{planInfo.label}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Billing status</dt>
              <dd className="text-text-primary font-medium capitalize">{status.replace('_', ' ')}</dd>
            </div>
            {plan === 'Team' && (
              <div className="flex justify-between">
                <dt className="text-text-secondary">Team seats</dt>
                <dd className="text-text-primary font-medium">
                  <Link href="/dashboard/settings/team" className="underline hover:text-text-secondary transition-colors">
                    Manage team members →
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  );
}
