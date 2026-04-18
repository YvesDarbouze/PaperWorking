'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';

import PricingCards from '@/components/pricing/PricingCards';
import FeatureComparisonTable from '@/components/pricing/FeatureComparisonTable';
import ProfessionalPricingSection from '@/components/pricing/LawyerPricingSection';
import SocialProofBar from '@/components/pricing/SocialProofBar';
import PricingFAQ from '@/components/pricing/PricingFAQ';
import CheckoutModal from '@/components/pricing/CheckoutModal';
import StickyMobileCTA from '@/components/pricing/StickyMobileCTA';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [activePlanSelection, setActivePlanSelection] = useState<string | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Track when pricing cards scroll out of view
  const cardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyCTA(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Recommended plan data (the anchored tier)
  const recommendedPlan = 'Investor Team';
  const recommendedPrice = isAnnual ? '$999/yr' : '$99/mo';
  const recommendedPlanLabel = `${recommendedPlan} ${isAnnual ? 'Annual' : 'Monthly'}`;

  return (
    <div className="min-h-screen bg-pw-bg font-sans text-pw-fg selection:bg-pw-black selection:text-pw-white relative">
      
      {/* Dynamic Checkout Overlay */}
      {activePlanSelection && (
         <CheckoutModal 
            planIdentifier={activePlanSelection} 
            onClose={() => setActivePlanSelection(null)} 
         />
      )}

      {/* Header — matches landing page nav */}
      <header className="sticky top-0 z-50 w-full bg-pw-bg/90 backdrop-blur-md border-b border-pw-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Logo href="/" size="sm" />
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-sm font-medium text-pw-muted hover:text-pw-black transition-colors">
              Log In
            </Link>
            <button
               className="ag-button !py-2 !px-6"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="w-full">
        {/* Hero */}
        <section className="pt-24 pb-16 sm:pt-32 sm:pb-20 border-b border-pw-border">
          <div className="mx-auto max-w-4xl text-center px-6 lg:px-8">
             <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-pw-black leading-tight text-balance">
               Institutional scalability.<br className="hidden sm:block"/> Uncompromised execution.
             </h1>
             <p className="mt-8 text-lg text-pw-muted max-w-2xl mx-auto leading-relaxed">
               Deploy the exact infrastructure you need to execute, track, and close your acquisitions. Choose the tier that matches your operational scale.
             </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20 bg-pw-bg border-b border-pw-border">
           <PricingCards 
              isAnnual={isAnnual} 
              onToggleAnnual={setIsAnnual} 
              onSelectPlan={setActivePlanSelection}
              cardsRef={cardsRef}
           />
        </section>

        {/* Social Proof Bar */}
        <section className="py-16 bg-pw-bg border-b border-pw-border">
           <SocialProofBar />
        </section>

        {/* Feature Comparison with Progressive Disclosure + Tooltips */}
        <section className="py-20 bg-pw-bg border-b border-pw-border">
           <FeatureComparisonTable onSelectPlan={setActivePlanSelection} />
        </section>

        {/* Professional Verticals: Appraisers/Inspectors */}
        <section className="py-20 bg-pw-bg border-b border-pw-border">
           <ProfessionalPricingSection onSelectPlan={setActivePlanSelection} />
        </section>

        {/* Accordion FAQ */}
        <section className="py-20 bg-pw-bg border-b border-pw-border">
           <PricingFAQ />
        </section>
      </main>

      {/* Footer — matches landing page */}
      <footer className="bg-pw-bg py-12">
         <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-pw-muted">
            <div className="mb-4 md:mb-0 flex items-center">
               <Logo size="sm" />
               <span className="ml-2">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex space-x-8 text-[11px] font-bold uppercase tracking-widest">
               <Link href="#" className="hover:text-pw-black transition-colors">Privacy Policy</Link>
               <Link href="#" className="hover:text-pw-black transition-colors">Terms of Service</Link>
               <Link href="#" className="hover:text-pw-black transition-colors">Contact</Link>
               <Link href="/dashboard" className="text-pw-black hover:text-pw-muted transition-colors">Log In</Link>
            </div>
         </div>
      </footer>

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA
        visible={showStickyCTA}
        planName={recommendedPlan}
        price={recommendedPrice}
        onSelect={() => setActivePlanSelection(recommendedPlanLabel)}
      />

    </div>
  );
}
