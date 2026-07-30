'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import PricingSection from '@/components/landing/PricingSection';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CustomToaster } from '@/components/ui/CustomToaster';
import { buildSignupForPricingLoginUrl } from '@/lib/auth/postAuthRedirect';

export default function PricingClient() {
  const { user } = useAuth();
  const { isSubscribed } = useBilling();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const resumedRef = useRef(false);

  useEffect(() => {
    if (!user || !isSubscribed) return;
    sessionStorage.removeItem('pw_pending_plan');
    router.replace('/dashboard');
  }, [user, isSubscribed, router]);

  // COMPLIANCE NOTE (Pricing Prompt 7):
  // Monthly-billing code path (lines below handling ' monthly' suffix) is wired to the
  // Stripe checkout API route (/api/stripe/checkout, billingInterval: 'monthly').
  // The monthly/annual toggle UI has been removed from PricingSection.tsx — the page
  // is now annual-only. PricingSection.handleSelect() always passes "${stripeKey} Annual",
  // so the monthly branch is never triggered from the current UI.
  // CODE LEFT INTACT pending business decision (do not remove without confirming monthly
  // Stripe price IDs are deactivated or no longer needed). — 2026-07-29
  const handleSelectPlan = useCallback(async (planIdentifier: string) => {
    setIsProcessing(planIdentifier);

    const lower = planIdentifier.toLowerCase();
    const isAnnual = lower.endsWith(' annual');
    const isMonthly = lower.endsWith(' monthly');
    const interval = isAnnual ? 'annual' : 'monthly';
    const plan = isAnnual
      ? planIdentifier.slice(0, -' Annual'.length)
      : isMonthly
        ? planIdentifier.slice(0, -' Monthly'.length)
        : planIdentifier;

    if (!user) {
      sessionStorage.setItem('pw_pending_plan', JSON.stringify({ plan, interval, identifier: planIdentifier }));
      setIsProcessing(null);
      router.push(buildSignupForPricingLoginUrl());
      return;
    }

    try {
      const body: Record<string, string> = { plan, billingInterval: interval };
      body.idToken = await user.getIdToken();
      body.userId = user.uid;
      if (user.email) body.userEmail = user.email;

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      console.error('[Checkout]', err);
      toast.error((err instanceof Error ? err.message : null) || 'Something went wrong. Please try again.', {
        id: 'checkout-error',
        duration: 6000,
      });
      setIsProcessing(null);
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || isSubscribed || resumedRef.current) return;
    const raw = sessionStorage.getItem('pw_pending_plan');
    if (!raw) return;
    resumedRef.current = true;
    sessionStorage.removeItem('pw_pending_plan');
    try {
      const { identifier } = JSON.parse(raw);
      if (identifier) handleSelectPlan(identifier);
    } catch { /* malformed — ignore */ }
  }, [user, isSubscribed, handleSelectPlan]);

  return (
    <div className="marketing-context min-h-screen font-sans text-on-surface relative bg-background">
      {/* Loader Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pw-black/60 backdrop-blur-md">
          <div className="bg-bg-surface p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-pw-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-primary font-medium">Redirecting to Secure Checkout...</p>
          </div>
        </div>
      )}

      <LandingHeader />
      <PricingSection onSelectPlan={handleSelectPlan} />
      <LandingFooter />

      <CustomToaster position="bottom-center" />
    </div>
  );
}
