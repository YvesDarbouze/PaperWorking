'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import HeroDashboard from '@/components/landing/HeroDashboard';
import LandingFooter from '@/components/landing/LandingFooter';
import PlatformOverview from '@/components/landing/PlatformOverview';
import TestimonialSlider from '@/components/landing/TestimonialSlider';
import FinalCTA from '@/components/landing/FinalCTA';
import PricingSection from '@/components/landing/PricingSection';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { CustomToaster } from '@/components/ui/CustomToaster';
import { useSearchParams } from 'next/navigation';

/* ═══════════════════════════════════════════════════════
   Landing Page — Stitch-aligned redesign.

   Layout order matches "PaperWorking Landing Page (Desktop Redesign)":
   1. Nav (LandingHeader)
   2. Hero (centered, text-only)
   3. Dashboard Preview (standalone showcase)
   4. REIL Phases + Risk Mitigation (PlatformOverview)
   5. Pricing (PricingSection)
   6. Footer
   ═══════════════════════════════════════════════════════ */

function SuccessModal() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams?.get('success') === 'true') {
      setShow(true);
    }
  }, [searchParams]);
  
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-surface-container border border-outline/20 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-on-surface mb-3 tracking-tight">Welcome to PaperWorking</h2>
        <p className="text-on-surface-variant mb-8 text-sm leading-relaxed">
          Your 14-day free trial is active. Check your email for login instructions and next steps.
        </p>
        
        <button
          onClick={() => setShow(false)}
          className="luminous-button w-full"
        >
          <span>Get Started</span>
        </button>
      </div>
    </div>
  );
}

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

      {/* Success Modal Overlay */}
      <Suspense fallback={null}>
        <SuccessModal />
      </Suspense>

      <LandingHeader />

      {/* ── Hero — Centered text-only ── */}
      <LandingHero />

      {/* ── Dashboard Preview (standalone showcase) ── */}
      <section id="dashboard" className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-gutter-desktop mb-32 -mt-16">
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
          {/* Subtle light effect top border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent z-20" />
          <HeroDashboard />
        </div>
      </section>

      {/* ── Foreground Content ── */}
      <div className="relative z-10 w-full">

        {/* ── How It Works — REIL Phases ── */}
        <PlatformOverview />

        {/* ── Testimonials ── */}
        <TestimonialSlider />

        {/* ── Final CTA — Risk Mitigation Reframe ── */}
        <FinalCTA />

        {/* ── Pricing ── */}
        <PricingSection onSelectPlan={handleSelectPlan} />

        {/* ── How It Works link anchors / styling fallback support ── */}
        <LandingFooter />
      </div>

      <CustomToaster position="bottom-center" />
    </div>
  );
}
