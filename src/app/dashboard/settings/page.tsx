'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, Lock, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   Settings Index Page - Payment Method Management UI
   Route: /dashboard/settings
   ═══════════════════════════════════════════════════════ */

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Use the last 4 digits from profile if available, else fallback to 1234
  const lastFour = profile?.lastFour ?? '1234';
  const hasPaymentMethod = profile?.stripeCustomerId || profile?.subscriptionPlan !== 'None';

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-text-primary mb-1">Settings</h1>
        <p className="text-sm text-text-secondary">Manage your payment methods and billing preferences.</p>
      </div>

      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-5">Payment Method</h2>

        {hasPaymentMethod ? (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-bg-primary border border-border-accent gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-9 bg-gradient-to-br from-gray-800 to-black rounded border border-gray-700 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold italic text-xs tracking-wider">VISA</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                    <span className="tracking-widest text-text-secondary">**** **** ****</span> 
                    <span>{lastFour}</span>
                  </p>
                  <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
                    <Lock className="w-3 h-3 text-green-600" /> Securely stored by Stripe
                  </p>
                </div>
              </div>

              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50"
              >
                {portalLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <>Update Payment Method <ExternalLink className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {portalError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 mt-3">
                {portalError}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">No payment method on file. Update your payment method to subscribe or maintain services.</p>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50"
            >
              {portalLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <>Add Payment Method <ExternalLink className="w-3.5 h-3.5" /></>
              )}
            </button>
            {portalError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 mt-3">
                {portalError}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
