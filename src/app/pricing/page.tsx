'use client';

import { useState, useEffect, useCallback } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import PricingSection from '@/components/landing/PricingSection';
import { useAuth } from '@/context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

/**
 * /pricing — Standalone pricing page.
 *
 * Uses the SAME PricingSection component as the landing page (/#pricing)
 * to guarantee visual parity. The only additional logic here is:
 *   1. Auto-resume checkout after login (pw_pending_plan in sessionStorage)
 *   2. Stripe checkout initiation (handleSelectPlan)
 */
export default function PricingPage() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // ── Auto-resume checkout after login ──────────────────────────
  // If the user just authenticated with a pending plan intent in
  // sessionStorage, automatically trigger the Stripe checkout.
  useEffect(() => {
    if (!user) return;
    const raw = sessionStorage.getItem('pw_pending_plan');
    if (!raw) return;

    try {
      const { plan, interval, identifier } = JSON.parse(raw);
      sessionStorage.removeItem('pw_pending_plan');
      handleSelectPlan(identifier || `${plan} ${interval === 'annual' ? 'Annual' : 'Monthly'}`);
    } catch {
      sessionStorage.removeItem('pw_pending_plan');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Plan selection / Stripe checkout ──────────────────────────
  const handleSelectPlan = useCallback(async (planIdentifier: string) => {
    setIsProcessing(planIdentifier);

    // Parse "Vendor Marketplace Annual" → plan="Vendor Marketplace", interval="annual"
    const lower = planIdentifier.toLowerCase();
    const isAnnual = lower.endsWith(' annual');
    const isMonthly = lower.endsWith(' monthly');
    const interval = isAnnual ? 'annual' : 'monthly';
    const plan = isAnnual
      ? planIdentifier.slice(0, -' Annual'.length)
      : isMonthly
        ? planIdentifier.slice(0, -' Monthly'.length)
        : planIdentifier;

    // Unauthenticated → save intent and route through login
    if (!user) {
      sessionStorage.setItem('pw_pending_plan', JSON.stringify({ plan, interval, identifier: planIdentifier }));
      const type = plan === 'Vendor Marketplace' ? 'vendor' : 'investor';
      window.location.href = `/register?type=${type}&redirectTo=/pricing`;
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingInterval: interval,
          userId: user.uid,
          userEmail: user.email,
          idToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err: any) {
      console.error('[Checkout]', err);
      toast.error(err.message || 'Something went wrong. Please try again.', {
        id: 'checkout-error',
        duration: 6000,
      });
      setIsProcessing(null);
    }
  }, [user]);

  return (
    <div className="min-h-screen font-sans text-[var(--pw-fg)] relative" style={{ backgroundColor: '#f2f2f2' }}>

      {/* Loader Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pw-black/60 backdrop-blur-md">
          <div className="bg-bg-surface p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-pw-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-primary font-medium">Redirecting to Secure Checkout...</p>
          </div>
        </div>
      )}

      {/* Same header as the landing page */}
      <LandingHeader />

      {/* Same PricingSection as the landing page (/#pricing) */}
      <PricingSection onSelectPlan={handleSelectPlan} />

      {/* Same footer as the landing page */}
      <LandingFooter />

      <Toaster position="bottom-center" />
    </div>
  );
}
