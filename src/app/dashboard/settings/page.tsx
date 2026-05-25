'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

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
    <div className="max-w-3xl space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-white mb-2" style={{ textShadow: '0 0 20px rgba(87,241,219,0.1)' }}>Settings</h1>
        <p className="text-sm text-[#8a9b9b]">Manage your payment methods and billing preferences.</p>
      </div>

      <section className="glass-card p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#57f1db] mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">credit_card</span>
          Payment Method
        </h2>

        {hasPaymentMethod ? (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-black/30 border border-white/10 rounded-xl gap-4">
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
                    Securely stored by Stripe
                  </p>
                </div>
              </div>

              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="luminous-button w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#57f1db]/20 border border-[#57f1db]/30 text-[#57f1db] text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg hover:bg-[#57f1db]/30 transition-all disabled:opacity-50"
              >
                {portalLoading ? (
                  <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm select-none">open_in_new</span>
                )}
                {portalLoading ? 'Processing…' : 'Update Payment Method'}
              </button>
            </div>

            {portalError && (
              <p className="text-xs text-red-400 bg-red-950/20 border border-red-500/30 rounded-lg px-4 py-3 mt-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm select-none">error</span>
                {portalError}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#8a9b9b]">No payment method on file. Update your payment method to subscribe or maintain services.</p>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="luminous-button inline-flex items-center justify-center gap-2 bg-[#57f1db]/20 border border-[#57f1db]/30 text-[#57f1db] text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg hover:bg-[#57f1db]/30 transition-all disabled:opacity-50"
            >
              {portalLoading ? (
                <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm select-none">open_in_new</span>
              )}
              {portalLoading ? 'Processing…' : 'Add Payment Method'}
            </button>
            {portalError && (
              <p className="text-xs text-red-400 bg-red-950/20 border border-red-500/30 rounded-lg px-4 py-3 mt-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm select-none">error</span>
                {portalError}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

