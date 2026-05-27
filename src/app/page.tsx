'use client';

import { useState, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingFooter from '@/components/landing/LandingFooter';
import PlatformOverview from '@/components/landing/PlatformOverview';
import PricingSection from '@/components/landing/PricingSection';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { CustomToaster } from '@/components/ui/CustomToaster';

export default function ParallaxLandingPage() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Track scroll within the full page
  const { scrollY } = useScroll();

  // The hero section's height is roughly 100vh.
  // Transform the Y position to move it down slower than the scroll speed 
  // (creating a deep parallax effect).
  const heroY = useTransform(scrollY, [0, 1000], [0, 400]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);

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
    <div className="marketing-context bg-bg-primary min-h-screen text-text-primary relative">
      {/* Loader Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pw-black/60 backdrop-blur-md">
          <div className="bg-bg-surface p-6 shadow-2xl flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-pw-accent border-t-transparent animate-spin mb-4" />
            <p className="text-text-primary font-medium">Redirecting to Secure Checkout...</p>
          </div>
        </div>
      )}
      <LandingHeader />

      {/* 
        This is the fixed height container for the hero. 
        It reserves the space in the document flow while allowing the 
        internal motion.div to parallax effectively.
      */}
      <div className="relative h-screen w-full overflow-hidden">
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 w-full h-full flex flex-col justify-center"
        >
          <LandingHero />
        </motion.div>
      </div>

      {/* Foreground Content Layer - Scrolls normally over the fading background */}
      <div className="relative z-10 w-full bg-bg-primary border-t border-pw-border shadow-2xl">
        
        {/* ── How It Works — Platform Overview (Primary Sales Funnel) ── */}
        <PlatformOverview />

        {/* ── Pricing — Full Section (Cards + Comparison + Testimonials + FAQ) ── */}
        <PricingSection onSelectPlan={handleSelectPlan} />

        {/* Footer */}
        <LandingFooter />
      </div>

      <CustomToaster position="bottom-center" />
    </div>
  );
}
