'use client';

import React, { useState } from 'react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import VideoHero from '@/components/marketing/VideoHero';
import TrustBanner from '@/components/marketing/TrustBanner';
import ValuePropGrid from '@/components/marketing/ValuePropGrid';
import ProcessTimeline from '@/components/landing/ProcessTimeline';
import PricingCards from '@/components/pricing/PricingCards';
import CheckoutModal from '@/components/pricing/CheckoutModal';
import Logo from '@/components/brand/Logo';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   PaperWorking — Landing Page (Phase 8: News & Content Integration)
   ═══════════════════════════════════════════════════════════════ */

export default function Home() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [activePlanSelection, setActivePlanSelection] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-pw-bg">
      {/* 1. Global Navigation */}
      <MarketingNavbar />
      
      <main className="flex-1">
        {/* 2. Cinematic Hero Section */}
        <VideoHero />

        {/* 3. Trusted By Banner ( Grayscale institutional trust ) */}
        <TrustBanner />

        {/* 4. Strategic Value Proposition Grid */}
        <ValuePropGrid />

        {/* 5. Process Lifecycle — Visual Timeline */}
        <div id="process" className="bg-pw-bg">
           <ProcessTimeline />
        </div>

        {/* 6. Pricing Section — High-Trust Context */}
        <section id="pricing" className="scroll-mt-20 py-24 sm:py-32 bg-pw-bg">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-20">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400 mb-6">
                Institutional Scalability
              </p>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-gray-900 leading-[0.95] mb-8">
                Operating at scale <br className="hidden sm:block" />
                requires professional tools.
              </h2>
              <p className="mt-4 text-gray-500 max-w-xl mx-auto leading-relaxed text-sm">
                Start with a 14-day free trial. Transition your entire portfolio 
                with zero downtime.
              </p>
            </div>

            <PricingCards
              isAnnual={isAnnual}
              onToggleAnnual={setIsAnnual}
              onSelectPlan={setActivePlanSelection}
            />
          </div>
        </section>
      </main>

      {/* 7. Modal Layer */}
      {activePlanSelection && (
        <CheckoutModal
          planIdentifier={activePlanSelection}
          onClose={() => setActivePlanSelection(null)}
        />
      )}

      {/* 8. Minimalist Global Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="flex items-center">
            <Logo size="sm" className="text-black" />
            <span className="ml-8 text-xs font-bold text-gray-400 uppercase tracking-widest">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex space-x-10">
            <Link href="#" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Terms of Service</Link>
            <Link href="#" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Contact Press</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
