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
  const { isSubscribed } = useBilling();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const resumedRef = useRef(false);

  // ── Already-paying accounts never need the pricing page ────────
  // Landing here (stale `pw_pending_plan`, a Stripe checkout cancel_url bounce,
  // or just navigating back) should never re-trigger a new Checkout Session —
  // send them straight to their portfolio instead.
  useEffect(() => {
    if (!user || !isSubscribed) return;
    sessionStorage.removeItem('pw_pending_plan');
    router.replace('/dashboard');
  }, [user, isSubscribed, router]);

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

    // Require an account before Stripe Checkout: client_reference_id must be a
    // real Firebase uid so the subscription attaches to an account deterministically.
    // Guest checkout (pay first, register later) was removed — it relied on a
    // fragile email match to reconcile the purchase with an account, which
    // silently orphaned the subscription whenever the sign-up email differed
    // from the checkout email.
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

  // ── Auto-resume checkout after login ───────────────────────────
  // If the user just came back from /login with a pending plan selection
  // (stashed above, or by the legacy ?plan= deep link in login/page.tsx),
  // fire the checkout immediately instead of making them click again.
  useEffect(() => {
    if (!user || isSubscribed || resumedRef.current) return;
    const raw = sessionStorage.getItem('pw_pending_plan');
    if (!raw) return;
    resumedRef.current = true;
    sessionStorage.removeItem('pw_pending_plan');
    try {
      const { identifier } = JSON.parse(raw);
      if (identifier) handleSelectPlan(identifier);
    } catch { /* malformed — ignore, user can just click again */ }
  }, [user, isSubscribed, handleSelectPlan]);

  return (
    <div className="min-h-screen font-sans text-on-surface relative bg-background dark">

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

      <CustomToaster position="bottom-center" />
    </div>
  );
}
