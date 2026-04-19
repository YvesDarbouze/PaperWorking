'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ── Navigation ── */
import MarketingNavbar from '@/components/marketing/MarketingNavbar';

/* ── Hero ── */
import VideoHero from '@/components/marketing/VideoHero';

/* ── Trust & Social Proof ── */
import TrustBanner from '@/components/marketing/TrustBanner';
import TestimonialSlider from '@/components/landing/TestimonialSlider';
import SecurityBadges from '@/components/landing/SecurityBadges';

/* ── Value & Feature Sections ── */
import ValuePropGrid from '@/components/marketing/ValuePropGrid';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import BenefitsZigZag from '@/components/landing/BenefitsZigZag';
import ProcessTimeline from '@/components/landing/ProcessTimeline';

/* ── Pricing & Conversion ── */
import PricingCards from '@/components/pricing/PricingCards';
import CheckoutModal from '@/components/pricing/CheckoutModal';
import FAQAccordion from '@/components/landing/FAQAccordion';
import FinalCTA from '@/components/landing/FinalCTA';
import FlippingPhases from '@/components/landing/FlippingPhases';
import MathBreakdown from '@/components/landing/MathBreakdown';

/* ── Brand ── */
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════════════
   PaperWorking — Landing Page
   Sequence: Hero → Trust → Value → Features → Process →
             Benefits → Testimonials → Security → Pricing →
             FAQ → CTA → Footer
   ═══════════════════════════════════════════════════════════════ */

const FAQ_ITEMS = [
  {
    question: 'How is PaperWorking different from a spreadsheet or generic project manager?',
    answer:
      'PaperWorking is purpose-built for real estate investment operations — not adapted from generic tools. Every module (Deal Pipeline, Engine Room, Closing Room, Exit Hub) maps directly to a phase of the REI lifecycle. Built-in 70% Rule calculators, waterfall distributions, role-based access controls, and audit-grade ledgers are standard, not add-ons.',
  },
  {
    question: 'Who gets access to what? How does the role system work?',
    answer:
      'You assign each team member a role when you invite them: Lead Investor, General Contractor, Real Estate Agent, Accountant, or Lender. Permissions are enforced at the data level — contractors see triage queues and receipts, not your capital stack. Accountants see P&L, not contractor communications. You control it once; the system enforces it everywhere.',
  },
  {
    question: 'Can I manage multiple properties simultaneously?',
    answer:
      'Yes. The Dashboard Kanban displays all active deals across every lifecycle phase simultaneously. Switch between Full-Screen Phase View (deep focus on one deal) and Minimized Board View (portfolio-wide bird\'s eye). Financial metrics aggregate in real time across your entire portfolio.',
  },
  {
    question: 'How does the MAO (Maximum Allowable Offer) calculator work?',
    answer:
      'The Deal Analyzer computes MAO in real time using the standard 70% Rule: MAO = (ARV × 0.70) − Rehab Estimate − Fixed Costs. As you adjust any input, the MAO updates instantly. The system flags threshold violations if your purchase price exceeds the calculated MAO.',
  },
  {
    question: 'What is the 70% Rule in house flipping?',
    answer:
      'The 70% rule is a guideline that investors use to determine the maximum they should pay for a property. It states you should never pay more than 70% of the After Repair Value (ARV) minus the estimated cost of repairs. Our tool enforces this calculation for you.',
  },
  {
    question: 'Is my financial data secure?',
    answer:
      'Yes. All data is encrypted in transit (256-bit TLS) and at rest. Sensitive financial data (net profit, capital stack, ROI projections) is stored in isolated sub-collections with field-level Firestore security rules — structurally preventing contractor-level roles from ever reading private investor data.',
  },
  {
    question: 'How do I share a property with potential investors?',
    answer:
      'Using our dashboard, you can track all properties from purchase to sale. You can send an email directly from the dashboard to potential investors. While non-account holders can receive emails, they must have a current subscription to view the full listing and comprehensive financial details of the property.',
  },
  {
    question: 'Can I manage contingencies and hidden costs?',
    answer:
      'Absolutely. Our platform encourages investors to add a 10–15% buffer for \'hidden\' issues. The Engine Room and Rehab trackers allow you to dynamically assign contingency budgets for materials and labor.',
  },
  {
    question: 'Does the app help track holding costs?',
    answer:
      'Yes. From the moment you close, the Acquisition tracker measures the \'carrying costs\' while you own the home, accumulating property taxes, insurance, and utilities by the day.',
  },
  {
    question: 'Does it integrate with Google Drive for document storage?',
    answer:
      'Yes. When you create a deal, PaperWorking automatically provisions a structured Google Drive folder hierarchy (Closing Docs, Receipts, Permits) linked to the deal record. Every document uploaded inside the platform routes to the correct subfolder with no manual organization required.',
  },
];

export default function Home() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [activePlanSelection, setActivePlanSelection] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-pw-bg">

      {/* ── 1. Navigation ── */}
      <MarketingNavbar />

      <main className="flex-1">

        {/* ── 2. Hero — Full-screen cinematic entry ── */}
        <VideoHero />

        {/* ── 3. Institutional Trust Bar ── */}
        <TrustBanner />

        {/* ── 4. Value Proposition — 3 Core Pillars ── */}
        <ValuePropGrid />

        {/* ── 5. Feature Details — Capability Grid ── */}
        <FeaturesGrid />

        {/* ── 6. Process — Visual 4-Phase Lifecycle ── */}
        <div id="process" className="bg-pw-bg">
          <FlippingPhases />
          <MathBreakdown />
        </div>

        {/* ── 7. Benefits Proof — Alternating Stats Layout ── */}
        <BenefitsZigZag />

        {/* ── 8. Testimonials — Social Proof Carousel ── */}
        <TestimonialSlider />

        {/* ── 9. Security — Trust Reinforcement ── */}
        <SecurityBadges />

        {/* ── 10. Pricing — High-Trust Context ── */}
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

        {/* ── 11. FAQ — Objection Handling ── */}
        <section id="faq" className="scroll-mt-20 py-24 sm:py-32 bg-pw-surface border-t border-pw-border">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-400 mb-4">
                Got Questions
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-gray-900 leading-tight">
                Everything you need to know.
              </h2>
            </div>
            <FAQAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        {/* ── 12. Final CTA — Bottom-of-page conversion ── */}
        <FinalCTA />

      </main>

      {/* ── 13. Modal Layer ── */}
      {activePlanSelection && (
        <CheckoutModal
          planIdentifier={activePlanSelection}
          onClose={() => setActivePlanSelection(null)}
        />
      )}

      {/* ── 14. Footer ── */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="flex items-center gap-8">
            <Logo size="sm" className="text-black" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              © {new Date().getFullYear()} PaperWorking
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-8" aria-label="Footer navigation">
            <Link href="#features" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">
              Features
            </Link>
            <Link href="#process" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">
              FAQ
            </Link>
            <Link href="#" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
