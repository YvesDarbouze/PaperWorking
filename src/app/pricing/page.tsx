'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';

import PricingCards from '@/components/pricing/PricingCards';
import FeatureComparisonTable from '@/components/pricing/FeatureComparisonTable';
import ProfessionalPricingSection from '@/components/pricing/LawyerPricingSection';
import SocialProofBar from '@/components/pricing/SocialProofBar';
import PricingFAQ from '@/components/pricing/PricingFAQ';
import StickyMobileCTA from '@/components/pricing/StickyMobileCTA';
import { useAuth } from '@/context/AuthContext';

export default function PricingPage() {
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
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
    <div className="min-h-screen bg-bg-primary font-sans text-text-primary selection:bg-pw-black selection:text-pw-white relative">
      
      {/* Loader Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pw-black/60 backdrop-blur-md">
          <div className="bg-bg-surface p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-pw-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-primary font-medium">Redirecting to Secure Checkout...</p>
          </div>
        </div>
      )}

      {/* Header — matches landing page nav */}
      <header className="sticky top-0 z-50 w-full bg-bg-primary/90 backdrop-blur-md border-b border-border-accent">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Logo href="/" size="sm" />
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
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
        <section className="pt-24 pb-16 sm:pt-32 sm:pb-20 border-b border-border-accent">
          <div className="mx-auto max-w-4xl text-center px-6 lg:px-8">
             <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-text-primary leading-tight text-balance">
               Pick your plan.<br className="hidden sm:block"/> Start closing faster.
             </h1>
             <p className="mt-8 text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
               Every plan includes a 14-day free trial with full access. No credit card required. Upgrade, downgrade, or cancel anytime.
             </p>
          </div>
        </section>

        <section className="py-20 bg-bg-primary border-b border-border-accent">
           <PricingCards 
              isAnnual={isAnnual} 
              onToggleAnnual={setIsAnnual} 
              onSelectPlan={handleSelectPlan}
              cardsRef={cardsRef}
           />
        </section>

        {/* Social Proof Bar */}
        <section className="py-16 bg-bg-primary border-b border-border-accent">
           <SocialProofBar />
        </section>

        {/* Feature Comparison with Progressive Disclosure + Tooltips */}
        <section className="py-20 bg-bg-primary border-b border-border-accent">
           <FeatureComparisonTable onSelectPlan={handleSelectPlan} />
        </section>

        {/* Professional Verticals: Appraisers/Inspectors */}
        <section className="py-20 bg-bg-primary border-b border-border-accent">
           <ProfessionalPricingSection onSelectPlan={handleSelectPlan} />
        </section>

        {/* Accordion FAQ */}
        <section className="py-20 bg-bg-primary border-b border-border-accent">
           <PricingFAQ />
        </section>
      </main>

      {/* Footer — matches landing page */}
      <footer className="bg-bg-primary py-12">
         <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-text-secondary">
            <div className="mb-4 md:mb-0 flex items-center">
               <Logo size="sm" />
               <span className="ml-2">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex space-x-8 text-[11px] font-bold uppercase tracking-widest">
               <Link href="#" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
               <Link href="#" className="hover:text-text-primary transition-colors">Terms of Service</Link>
               <Link href="#" className="hover:text-text-primary transition-colors">Contact</Link>
               <Link href="/dashboard" className="text-text-primary hover:text-text-secondary transition-colors">Log In</Link>
            </div>
         </div>
      </footer>

      <StickyMobileCTA
        visible={showStickyCTA}
        planName={recommendedPlan}
        price={recommendedPrice}
        onSelect={() => handleSelectPlan(recommendedPlanLabel)}
      />

    </div>
  );
}
