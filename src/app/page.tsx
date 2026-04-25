'use client';

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingFooter from '@/components/landing/LandingFooter';
import PlatformOverview from '@/components/landing/PlatformOverview';
import PricingSection from '@/components/landing/PricingSection';
import CheckoutModal from '@/components/pricing/CheckoutModal';

export default function ParallaxLandingPage() {
  const containerRef = useRef(null);
  const [activePlanSelection, setActivePlanSelection] = useState<string | null>(null);
  
  // Track scroll within the full page
  const { scrollY } = useScroll();

  // The hero section's height is roughly 100vh.
  // Transform the Y position to move it down slower than the scroll speed 
  // (creating a deep parallax effect).
  const heroY = useTransform(scrollY, [0, 1000], [0, 400]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  return (
    <div className="bg-[var(--pw-bg)] min-h-screen text-[var(--pw-fg)]">
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
        <PricingSection onSelectPlan={setActivePlanSelection} />

        {/* Footer */}
        <LandingFooter />
      </div>

      {/* ── Modal Layer ── */}
      {activePlanSelection && (
        <CheckoutModal
          planIdentifier={activePlanSelection}
          onClose={() => setActivePlanSelection(null)}
        />
      )}
    </div>
  );
}
