'use client';

import { useState, useCallback } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingFooter from '@/components/landing/LandingFooter';
import PlatformOverview from '@/components/landing/PlatformOverview';
import PricingSection from '@/components/landing/PricingSection';
import HeroDashboard from '@/components/landing/HeroDashboard';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { CustomToaster } from '@/components/ui/CustomToaster';

/* ═══════════════════════════════════════════════════════
   Landing Page — Stitch-aligned redesign.

   Layout order matches "PaperWorking Landing Page (Desktop Redesign)":
   1. Nav (LandingHeader)
   2. Hero (centered, text-only)
   3. Dashboard Preview (standalone showcase)
   4. REIL Phases + Risk Mitigation (PlatformOverview)
   5. Pricing
   6. Footer
   ═══════════════════════════════════════════════════════ */

export default function LandingPage() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

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

    try {
      // Guest checkout: CC is always required by Stripe (payment_method_collection: 'always')
      // Trial + auto-charge handled server-side. No login required at this step.
      const body: Record<string, string> = { plan, billingInterval: interval };

      if (user) {
        try {
          body.idToken = await user.getIdToken();
          body.userId = user.uid;
          if (user.email) body.userEmail = user.email;
        } catch { /* non-fatal — proceed as guest */ }
      }

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
  }, [user]);

  return (
    <div className="marketing-context bg-background min-h-screen text-on-background relative">
      {/* Loader Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-surface-container p-6 rounded-xl shadow-2xl flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-on-surface font-medium">Redirecting to Secure Checkout...</p>
          </div>
        </div>
      )}

      <LandingHeader />

      {/* ── Hero — Centered text-only ── */}
      <LandingHero />

      {/* ── Dashboard Preview — Standalone showcase below hero ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-gutter-desktop -mt-8 mb-32">
        {/* Glow halo */}
        <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent rounded-3xl blur-3xl opacity-50 pointer-events-none" />

        {/* Dashboard shell */}
        <div className="relative glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-black/40">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-4 font-label-sm text-label-sm text-on-surface-variant/60 uppercase tracking-widest">
              paperworking.co — Command Center
            </span>
          </div>
          <HeroDashboard />
        </div>
      </section>

      {/* ── Foreground Content ── */}
      <div className="relative z-10 w-full">

        {/* ── How It Works — REIL Phases + Risk Mitigation ── */}
        <PlatformOverview />

        {/* ── Pricing ── */}
        <PricingSection onSelectPlan={handleSelectPlan} />

        {/* ── Footer ── */}
        <LandingFooter />
      </div>

      <CustomToaster position="bottom-center" />
    </div>
  );
}
