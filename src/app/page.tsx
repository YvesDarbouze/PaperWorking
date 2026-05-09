'use client';

import { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingFooter from '@/components/landing/LandingFooter';
import PlatformOverview from '@/components/landing/PlatformOverview';
import PricingSection from '@/components/landing/PricingSection';
import { useAuth } from '@/context/AuthContext';

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

  const handleSelectPlan = async (planIdentifier: string) => {
    setIsProcessing(planIdentifier);
    const interval = planIdentifier.toLowerCase().includes('annual') ? 'annual' : 'monthly';
    const parts = planIdentifier.split(' ');
    const plan = parts.slice(0, -1).join(' ');

    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingInterval: interval,
          userId: user?.uid,
          userEmail: user?.email,
          idToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      alert(err.message);
      setIsProcessing(null);
    }
  };

  return (
    <div className="bg-[var(--pw-bg)] min-h-screen text-[var(--pw-fg)] relative">
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
      <div className="relative z-10 w-full bg-[var(--pw-bg)] border-t border-[var(--pw-border)] shadow-2xl">
        
        {/* ── How It Works — Platform Overview (Primary Sales Funnel) ── */}
        <PlatformOverview />

        {/* ── Pricing — Full Section (Cards + Comparison + Testimonials + FAQ) ── */}
        <PricingSection onSelectPlan={handleSelectPlan} />

        {/* Footer */}
        <LandingFooter />
      </div>

    </div>
  );
}
