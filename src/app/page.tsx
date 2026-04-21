'use client';

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingFooter from '@/components/landing/LandingFooter';
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
        
        {/* Placeholder: How it Works */}
        <section id="how-it-works" className="py-32 px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--pw-black)]">
              Engineered for the REI Lifecycle
            </h2>
            <p className="text-lg text-[var(--pw-subtle)] max-w-2xl mx-auto leading-relaxed">
              PaperWorking replaces fragmented spreadsheets and legacy CRMs with a unified operating system mapped directly to real estate investment phases. Let the platform enforce standard operating procedures.
            </p>
            
            <div className="mx-auto w-full max-w-3xl h-80 rounded-3xl border-2 border-dashed border-[var(--pw-border)] flex items-center justify-center bg-[var(--pw-surface)]">
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-[var(--pw-border)] animate-pulse" />
                <span className="text-[var(--pw-subtle)] font-mono text-xs uppercase tracking-widest">
                  How It Works Interactive Component
                </span>
              </div>
            </div>
          </div>
        </section>

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
