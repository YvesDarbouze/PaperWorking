'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PLAN_CATALOG } from '@/lib/stripe/plans';

/* ═══════════════════════════════════════════════════════
   PricingSection — Verbatim Approved COPY-P for /pricing
   Monthly & Annual Pricing ($499/yr or $59/mo, $999/yr or $99/mo, $390/yr or $39/mo)
   antigravity.google design system: medium-weight (500-600) display,
   pill CTAs, 24px card radii, compact header typography.
   ═══════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

interface Plan {
  id: string;
  stripeKey: string;
  name: string;
  badge?: string;
  tagline: string;
  annualPrice: number;
  monthlyPrice: number;
  features: string[];
  cta: string;
  microcopy: string;
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'individual',
    stripeKey: 'Investor',
    name: 'Investor',
    tagline: 'Full pipeline visibility without a team subscription.',
    annualPrice: PLAN_CATALOG.individual.annualPrice,
    monthlyPrice: PLAN_CATALOG.individual.monthlyPrice,
    highlighted: false,
    features: [
      'Four-phase REIL project management',
      'All 33 KPI visualizations, per deal and portfolio-wide',
      'Deal Analyzer with live property data (cap rate, IRR, cash-on-cash)',
      'Ledger, expense logging, budgets, and Holding Cost Clock',
      'Document vault and deal uploads',
      'Tax-ready reports and CPA-ready P&L export',
      'Deal Marketplace access',
      'Solo plan: one user account',
    ],
    cta: 'Start Investor Trial',
    microcopy: '14-day trial · No charge until day 15 · Export your data anytime',
  },
  {
    id: 'team',
    stripeKey: 'Investment Team',
    name: 'Investment Team',
    badge: 'Most popular',
    tagline: 'Role-based access and clean separation between what each person can see and do.',
    annualPrice: PLAN_CATALOG.team.annualPrice,
    monthlyPrice: PLAN_CATALOG.team.monthlyPrice,
    highlighted: true,
    features: [
      'Everything in Investor',
      'Up to 10 accounts on one team',
      'Lead Investor task assignment and phase control',
      'Role permissions: Admins, Editors, Viewers. Invite your CPA or private lenders as read-only',
      'Represent your team or company in the marketplace',
      'Google Drive provisioning',
    ],
    cta: 'Start Team Trial',
    microcopy: '14-day trial · No charge until day 15 · Export your data anytime',
  },
  {
    id: 'vendor',
    stripeKey: 'Vendor',
    name: 'Vendor',
    tagline: 'Qualified leads from active investor projects in your service area.',
    annualPrice: PLAN_CATALOG.vendor.annualPrice,
    monthlyPrice: PLAN_CATALOG.vendor.monthlyPrice,
    highlighted: false,
    features: [
      'Vendor Marketplace listing by trade and geography',
      'Access to assigned project work: pipelines, ledger entries, budgets for your scope',
      'Standard financial reports',
    ],
    cta: 'Join the Marketplace',
    microcopy: '14-day trial · No charge until day 15',
  },
];



/** Dynamically computes per-month equivalent from annual price (annual / 12, formatted to 2 decimals) */
function formatMonthlyEquiv(annualPrice: number): string {
  const monthly = annualPrice / 12;
  return `$${monthly.toFixed(2)}`;
}

export default function PricingSection({ onSelectPlan }: { onSelectPlan?: (plan: string) => void }) {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  const handleSelect = (stripeKey: string) => {
    onSelectPlan?.(`${stripeKey} ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, cycle: 'annual' | 'monthly') => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setBillingCycle(cycle === 'annual' ? 'monthly' : 'annual');
    }
  };

  return (
    <section id="pricing" className="scroll-mt-20 bg-background text-on-surface relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/4 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10">
        {/* ── Compact Hero Section (above-the-fold optimization) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="max-w-[1100px] mx-auto px-6 lg:px-8 pt-8 pb-6 md:pt-12 md:pb-8 text-center"
        >
          <motion.p variants={fadeUp} className="font-jetbrains text-[10px] uppercase tracking-[0.12em] text-primary mb-2.5 type-eyebrow font-medium">
            Real Estate Bloomberg Terminal
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="font-semibold tracking-[-0.02em] text-on-surface leading-[1.15] mb-3 max-w-[1000px] mx-auto type-display"
          >
            The average stock trade is $5000, the average Real Estate deal is $429,000. Why do stock investors have better fintech apps?
          </motion.h1>

          <motion.p variants={fadeUp} className="text-sm sm:text-base leading-[1.6] text-on-surface-variant max-w-3xl mx-auto type-body-lg">
            PaperWorking is the Bloomberg Terminal for serious Real Estate Investors. For people who understand the advantage sober data gives them.
          </motion.p>
        </motion.div>

        {/* ── Accessible Billing Toggle (Monthly vs Annual) ── */}
        <div className="flex justify-center mb-8 px-6">
          <div
            role="radiogroup"
            aria-label="Billing cycle options"
            className="inline-flex items-center p-1 rounded-full glass-panel border border-white/10 bg-surface-container-low/40"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === 'annual'}
              onClick={() => setBillingCycle('annual')}
              onKeyDown={(e) => handleKeyDown(e, 'annual')}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                billingCycle === 'annual'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Annual
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === 'monthly'}
              onClick={() => setBillingCycle('monthly')}
              onKeyDown={(e) => handleKeyDown(e, 'monthly')}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* ── 3-Tier Plan Cards (Visible Above The Fold) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="max-w-[1200px] mx-auto px-6 lg:px-8 pb-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan) => (
              <motion.div
                key={plan.id}
                variants={fadeUp}
                className={`glass-panel rounded-[24px] p-7 flex flex-col relative transition-all duration-300 h-full border ${
                  plan.highlighted
                    ? 'border-primary/40 shadow-[0_0_50px_-12px_rgba(69,73,85,0.3)] bg-surface-container-low/40'
                    : 'border-white/10 bg-surface-container-low/20'
                }`}
              >
                {/* Plan Header */}
                <div className="pb-5 border-b border-white/8">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-2xl font-semibold tracking-tight ${plan.highlighted ? 'text-primary' : 'text-on-surface'} type-h3`}>
                      {plan.name}
                    </h3>
                    {plan.badge && (
                      <span className="text-[10px] uppercase font-mono tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant leading-[1.65] type-body">
                    {plan.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="py-5 border-b border-white/8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-on-surface tracking-tight type-metric">
                      {billingCycle === 'annual'
                        ? formatMonthlyEquiv(plan.annualPrice)
                        : `$${plan.monthlyPrice}`}
                    </span>
                    <span className="text-base text-on-surface-variant font-medium type-body">
                      /mo
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant/70 mt-1 type-caption font-semibold">
                    {billingCycle === 'annual'
                      ? `billed annually ($${plan.annualPrice}/year)`
                      : 'billed monthly'}
                  </p>
                </div>

                {/* CTA & Microcopy */}
                <div className="py-5">
                  <button
                    type="button"
                    onClick={() => handleSelect(plan.stripeKey)}
                    className={`w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer type-cta focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      plan.highlighted
                        ? 'luminous-button'
                        : 'border border-primary/40 text-primary hover:bg-primary/10'
                    }`}
                  >
                    {plan.cta}
                  </button>
                  <p className="text-[10px] text-on-surface-variant/60 text-center mt-2.5 type-caption font-jetbrains">
                    {plan.microcopy}
                  </p>
                </div>

                {/* Feature List */}
                <div className="pt-2 flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-on-surface-variant type-small">
                        <span
                          className={`material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5 ${
                            plan.highlighted ? 'text-primary' : 'text-primary/70'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        <span className="leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Single Integrations Line ── */}
          <div className="mt-8 text-center border-t border-white/5 pt-5">
            <p className="font-jetbrains text-[13px] text-on-surface-variant/80 uppercase tracking-widest type-caption font-medium">
              Integrates with the tools you already use: Plaid, MLS, DocuSign, Stripe, RentCast.
            </p>
          </div>
        </motion.div>



        {/* ── Final CTA ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="max-w-4xl mx-auto px-6 lg:px-8 py-12 md:py-14 border-t border-white/5"
        >
          <div className="glass-card rounded-[28px] p-8 sm:p-12 text-center relative overflow-hidden bg-surface-container-low/30 border border-white/10">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-semibold text-on-surface mb-4 leading-tight type-h2">
                Start with one deal.
              </h2>
              <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto mb-8 leading-[1.65] type-body-lg">
                Run it through the trial with your real numbers: your budget, your deadlines, your documents. If PaperWorking doesn&apos;t earn its place, cancel from Settings and take every export with you.
              </p>

              <div className="flex justify-center mb-4">
                <Link
                  href="/register"
                  className="luminous-button px-8 py-4 rounded-full text-[15px] font-semibold tracking-wide inline-flex items-center gap-2.5 type-cta focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Start Free 14-Day Trial
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </Link>
              </div>

              <p className="text-[12.5px] text-on-surface-variant/70 leading-relaxed type-caption">
                14-day trial · No charge until day 15 · Export everything · Cancel anytime; annual plans include a 30-day refund window
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
