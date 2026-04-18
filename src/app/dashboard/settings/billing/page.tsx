'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, Loader2, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  'Individual':      { label: 'Individual',           color: 'text-pw-fg' },
  'Team':            { label: 'Investor Team',         color: 'text-pw-black' },
  'Lawyer Lead-Gen': { label: 'Service Professional',  color: 'text-pw-fg' },
  'None':            { label: 'No active plan',        color: 'text-pw-muted' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  active:   { label: 'Active',   cls: 'bg-green-50  text-green-700 border-green-200',  Icon: CheckCircle2    },
  past_due: { label: 'Past Due', cls: 'bg-amber-50  text-amber-700 border-amber-200',  Icon: AlertTriangle   },
  canceled: { label: 'Canceled', cls: 'bg-red-50    text-red-700   border-red-200',    Icon: AlertTriangle   },
  inactive: { label: 'Inactive', cls: 'bg-gray-100  text-pw-muted  border-pw-border',  Icon: AlertTriangle   },
};

export default function BillingSettingsPage() {
  const { user, profile } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]     = useState<string | null>(null);

  const plan   = profile?.subscriptionPlan   ?? 'None';
  const status = profile?.subscriptionStatus ?? 'inactive';

  const planInfo   = PLAN_LABELS[plan]   ?? PLAN_LABELS['None'];
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE['inactive'];
  const StatusIcon  = statusBadge.Icon;

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
    <div className="min-h-screen bg-pw-bg">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Back nav */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-pw-muted hover:text-pw-black transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-light tracking-tight text-pw-black mb-1">Billing &amp; Subscription</h1>
        <p className="text-sm text-pw-muted mb-10">Manage your plan, payment method, and invoices.</p>

        {/* Current Plan Card */}
        <section className="bg-white border border-pw-border p-6 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-5">Current Plan</h2>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-2xl font-medium ${planInfo.color}`}>{planInfo.label}</p>
              {plan === 'None' && (
                <p className="text-sm text-pw-muted mt-1">
                  You don't have an active subscription.{' '}
                  <Link href="/pricing" className="underline hover:text-pw-black transition-colors">
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
        </section>

        {/* Manage Billing */}
        <section className="bg-white border border-pw-border p-6 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-5">Payment Method &amp; Invoices</h2>

          <p className="text-sm text-pw-fg mb-5 leading-relaxed">
            Update your saved card, download past invoices, or cancel your subscription through the Stripe billing portal. Changes take effect immediately.
          </p>

          {portalError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 mb-4">
              {portalError}
            </p>
          )}

          {profile?.stripeCustomerId ? (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50"
            >
              {portalLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Opening portal…</>
              ) : (
                <><CreditCard className="w-4 h-4" /> Manage Billing <ExternalLink className="w-3.5 h-3.5 ml-1" /></>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-pw-muted">No billing account found. Subscribe to a plan to set up payment.</p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition"
              >
                View Plans →
              </Link>
            </div>
          )}
        </section>

        {/* Plan Details */}
        {plan !== 'None' && (
          <section className="bg-white border border-pw-border p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-5">Account Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-pw-muted">Account email</dt>
                <dd className="text-pw-black font-medium">{user?.email ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-pw-muted">Subscription plan</dt>
                <dd className="text-pw-black font-medium">{planInfo.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-pw-muted">Billing status</dt>
                <dd className="text-pw-black font-medium capitalize">{status.replace('_', ' ')}</dd>
              </div>
              {plan === 'Team' && (
                <div className="flex justify-between">
                  <dt className="text-pw-muted">Team seats</dt>
                  <dd className="text-pw-black font-medium">
                    <Link href="/dashboard/settings/team" className="underline hover:text-pw-muted transition-colors">
                      Manage team members →
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

      </div>
    </div>
  );
}
