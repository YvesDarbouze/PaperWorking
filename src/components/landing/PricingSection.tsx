'use client';

import React, { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';
import {
  ChevronDown,
  ArrowRight,
  Star,
  Quote,
  Users,
  Building2,
  Wrench,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PricingSection — Stitch Obsidian Glass Reskin

   Visual layout matches pricing_desktop.html exactly.
   All Stripe checkout logic (onSelectPlan) is unchanged.

   Sub-components:
     1. Header & Billing Toggle  (glass toggle pill)
     2. 3-Tier Pricing Cards     (glass-panel / highlighted)
     3. Feature Comparison Table  (font-mono, glass-panel)
     4. Trust & Friction Reduction (FAQ Accordion)

   Design Tokens:
     bg: #0b141a  primary: #57f1db  on-primary: #003731
     glass-panel: gradient(135deg, rgba(45,54,61,0.4), rgba(20,29,35,0.6))
     luminous-button: box-shadow 0 0 20px -5px primary/40
     Fonts: Plus Jakarta Sans + JetBrains Mono (prices)
   ═══════════════════════════════════════════════════════ */

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.19, 1, 0.22, 1] },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

/* ─── Plan Data ─── */
interface PlanTier {
  id: string;
  name: string;
  target: string;
  monthlyPrice: number;
  annualPrice: string;
  annualPriceNum: number;
  features: string[];
  ctaLabel: string;
  isHighlighted: boolean;
  badge?: string;
  icon: React.ElementType;
  variant: 'standard' | 'highlighted' | 'vendor';
}

const PLANS: PlanTier[] = [
  {
    id: 'individual',
    name: 'Individual Investor',
    target: 'Solo flippers tired of spreadsheet chaos.',
    monthlyPrice: 59,
    annualPrice: '$599',
    annualPriceNum: 599,
    features: [
      '1 User Seat',
      'Full REI Dashboard access',
      'Find & Fund Pipeline',
      'Acquisition & Due Diligence',
      'Rehab Tracking & Budgets',
      'Exit Formula & ROI Calculator',
    ],
    ctaLabel: 'Start 14-Day Free Trial',
    isHighlighted: false,
    icon: Users,
    variant: 'standard',
  },
  {
    id: 'team',
    name: 'Team / Firm',
    target: 'Scaling REI businesses managing multiple deals.',
    monthlyPrice: 99,
    annualPrice: '$999',
    annualPriceNum: 999,
    features: [
      'Up to 10 User Seats',
      'Role-Based Access Control',
      'Admin vs Deal Lead permissions',
      'Secure siloed account data',
      'Everything in Individual',
      'Priority onboarding support',
    ],
    ctaLabel: 'Start 14-Day Free Trial',
    isHighlighted: true,
    badge: 'Most Popular',
    icon: Building2,
    variant: 'highlighted',
  },
  {
    id: 'vendor',
    name: 'Vendor Marketplace',
    target: 'Appraisers, Inspectors, GCs, and tradespeople.',
    monthlyPrice: 39,
    annualPrice: '$390',
    annualPriceNum: 390,
    features: [
      'Marketplace Directory Listing',
      'Lead generation inbox',
      'Receive work requests from Teams',
      'Direct messaging with REI Teams',
      'Professional profile page',
      'Service area customization',
    ],
    ctaLabel: 'List Your Business',
    isHighlighted: false,
    icon: Wrench,
    variant: 'vendor',
  },
];

/* ─── Feature Comparison Data ─── */
interface ComparisonFeature {
  name: string;
  individual: boolean;
  team: boolean;
  vendor: boolean;
}

const COMPARISON_FEATURES: ComparisonFeature[] = [
  { name: 'Deal Pipeline Kanban', individual: true, team: true, vendor: false },
  { name: 'Find & Fund Module', individual: true, team: true, vendor: false },
  { name: 'Acquisition Tracker', individual: true, team: true, vendor: false },
  { name: 'Rehab Budget Manager', individual: true, team: true, vendor: false },
  { name: '70% Rule Calculator', individual: true, team: true, vendor: false },
  { name: 'Exit Formula / ROI', individual: true, team: true, vendor: false },
  { name: 'Holding Cost Clock', individual: true, team: true, vendor: false },
  { name: 'Financial Reports (P&L)', individual: true, team: true, vendor: false },
  { name: 'Document Vault', individual: true, team: true, vendor: false },
  { name: 'Google Drive Integration', individual: false, team: true, vendor: false },
  { name: 'Role-Based Access Control', individual: false, team: true, vendor: false },
  { name: 'Multi-User Seats (up to 10)', individual: false, team: true, vendor: false },
  { name: 'Siloed Account Data', individual: false, team: true, vendor: false },
  { name: 'Marketplace Directory Listing', individual: false, team: false, vendor: true },
  { name: 'Lead Generation Inbox', individual: false, team: false, vendor: true },
  { name: 'Inbox / Messaging', individual: false, team: true, vendor: true },
];

/* ─── Testimonial Data ─── */
const TESTIMONIALS = [
  {
    quote:
      "I used to track everything on a messy spreadsheet. PaperWorking's pipeline view lets me see exactly where every deal is. I closed 2 more flips last quarter because I finally had clarity.",
    author: 'Marcus T.',
    role: 'Solo Flipper, Charlotte NC',
    icon: Users,
  },
  {
    quote:
      'Our firm manages properties across 4 states. The role-based access means my contractors see triage queues, not our capital stack. That alone is worth the price.',
    author: 'Samantha Cho',
    role: 'Managing Partner, Cho Capital Group',
    icon: Building2,
  },
  {
    quote:
      "Since listing on PaperWorking's Vendor Marketplace, I get 3–5 qualified leads per week from investor teams who actually have projects ready to go.",
    author: 'David R.',
    role: 'Licensed General Contractor, Miami FL',
    icon: Wrench,
  },
];

const PRICING_FAQ = [
  {
    question: 'Do Vendors get access to my financial data?',
    answer:
      'No. Vendor accounts are structurally isolated. They can only see their marketplace listing, inbox messages, and work requests sent to them by REI Teams. They have zero visibility into any financial data, deal analytics, or capital stack information. Access is enforced at the database level, not just the UI.',
  },
  {
    question: 'Can I upgrade from Individual to Team later?',
    answer:
      'Yes, upgrades take effect immediately. When you upgrade, we prorate the remaining balance of your current billing period and apply it to the Team plan. All your existing deals, documents, and financial records stay intact. No data migration needed.',
  },
  {
    question: 'How does the free trial work?',
    answer:
      "Every new account starts with a full-access 14-day free trial. A credit card is collected at checkout, but you won't be charged until your trial ends. You get the complete Team-tier experience so you can evaluate every feature. At trial end, choose the plan that fits your workflow. If you don't convert, your data is preserved for 90 days in case you return.",
  },
  {
    question: 'Is there a money-back guarantee?',
    answer:
      'Yes. In addition to the 14-day free trial, if you are not completely satisfied within your first 30 days of paid service, email us and we will refund 100% of your payment. No questions asked.',
  },
  {
    question: 'What happens if I cancel?',
    answer:
      'Cancel anytime from your account settings with just one click. You retain full access until the end of your billing period. No surprise charges, no penalty fees. Your data is preserved for 90 days, and you can export everything (CSV or PDF) at any time.',
  },
];

/* ═══════════════════════════════════════════════════════
   Sub-Component: Animated Price Display
   ═══════════════════════════════════════════════════════ */
function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setAnimating(true);
      const timeout = setTimeout(() => {
        setDisplay(value);
        setAnimating(false);
        prevValue.current = value;
      }, 180);
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span
      className={`inline-block transition-all duration-250 ease-out ${
        animating
          ? 'opacity-0 translate-y-3 scale-95'
          : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      ${display}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: Billing Toggle (Glass Pill)
   ═══════════════════════════════════════════════════════ */
function BillingToggle({
  isAnnual,
  onToggle,
}: {
  isAnnual: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <div className="inline-flex items-center p-1 bg-surface-container-high rounded-full border border-white/10 mb-stack-lg">
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`px-6 py-2 rounded-full font-label-md text-label-md transition-colors ${
          !isAnnual
            ? 'bg-surface-bright border border-white/10 text-on-surface shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`px-6 py-2 rounded-full font-label-md text-label-md transition-colors flex items-center gap-2 ${
          isAnnual
            ? 'bg-surface-bright border border-white/10 text-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        Annually
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold">
          Save 20%
        </span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: Pricing Card (Glass Panel)
   ═══════════════════════════════════════════════════════ */
function PricingCard({
  plan,
  isAnnual,
  onSelect,
}: {
  plan: PlanTier;
  isAnnual: boolean;
  onSelect: (id: string) => void;
}) {
  const price = isAnnual
    ? Math.round(plan.annualPriceNum / 12)
    : plan.monthlyPrice;

  const isMostPopular = plan.id === 'team';
  const isVendor = plan.id === 'vendor';

  return (
    <motion.div
      variants={fadeUp}
      className={`glass-panel rounded-xl p-stack-lg flex flex-col h-full transition-all duration-300 relative ${
        isMostPopular
          ? 'border-primary/40 scale-100 md:scale-105 z-10 shadow-2xl shadow-primary/10'
          : 'hover:border-white/20'
      }`}
    >
      {/* "Most Popular" badge */}
      {isMostPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary px-4 py-1 rounded-full font-label-sm text-label-sm uppercase tracking-widest shadow-[0_0_15px_rgba(87,241,219,0.5)]">
          Most Popular
        </div>
      )}

      {/* Header */}
      <div className={`mb-stack-lg border-b border-white/10 pb-stack-lg ${isMostPopular ? 'mt-2' : ''}`}>
        <h3 className={`font-headline-md text-headline-md mb-2 ${isMostPopular ? 'text-primary' : 'text-on-surface'}`}>
          {plan.name}
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant h-10">
          {plan.target}
        </p>
      </div>

      {/* Price */}
      <div className="mb-stack-lg">
        <div className="flex items-baseline gap-1">
          <span className={`font-headline-lg text-headline-lg tabular-nums font-mono ${isMostPopular ? 'text-white' : 'text-on-surface'}`}>
            <AnimatedPrice value={price} />
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            /mo
          </span>
        </div>
        <div className="h-6 mt-1">
          {isAnnual ? (
            <p className={`font-body-sm text-body-sm ${isMostPopular ? 'text-primary/80' : 'text-on-surface-variant'}`}>
              Billed annually at {plan.annualPrice}/yr
            </p>
          ) : (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Billed monthly
            </p>
          )}
        </div>
      </div>

      {/* CTA Button — Stripe checkout trigger preserved exactly */}
      <button
        type="button"
        onClick={() => onSelect(`${plan.name} ${isAnnual ? 'Annual' : 'Monthly'}`)}
        className={`w-full text-center py-3 rounded-lg font-label-md text-label-md mb-stack-lg transition-all duration-200 ${
          isMostPopular
            ? 'bg-primary text-on-primary luminous-button hover:bg-primary/90 font-semibold'
            : isVendor
              ? 'border border-outline text-on-surface hover:bg-white/5'
              : 'border border-primary text-primary hover:bg-primary/5'
        }`}
      >
        {plan.ctaLabel}
      </button>

      {/* Feature List */}
      <div className="flex-grow">
        <p className="font-label-md text-label-md mb-stack-md text-on-surface uppercase tracking-wider">
          What&apos;s included
        </p>
        <ul className="space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span
                className={`material-symbols-outlined text-[20px] shrink-0 ${
                  isVendor ? 'text-outline' : 'text-primary'
                }`}
              >
                check_circle
              </span>
              <span className={`font-body-sm text-body-sm ${
                isMostPopular && idx === 0 ? 'font-medium text-white' : ''
              }`}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: Feature Comparison Table (Mono Font)
   ═══════════════════════════════════════════════════════ */
function ComparisonTable() {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = 6;
  const visible = expanded
    ? COMPARISON_FEATURES
    : COMPARISON_FEATURES.slice(0, visibleCount);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={stagger}
      className="mx-auto max-w-5xl px-6 lg:px-8 pt-24 pb-8 hidden md:block"
    >
      <motion.div variants={fadeUp} className="text-center mb-14">
        <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">
          Every feature, side by side.
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          See exactly which tools come with each plan.
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="glass-panel rounded-xl overflow-hidden border border-white/10"
      >
        <table className="w-full text-left font-mono text-[13px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-surface-container/50">
              <th className="p-4 font-normal text-on-surface-variant w-2/5">
                Feature
              </th>
              <th className="p-4 font-medium text-center w-1/5">Individual</th>
              <th className="p-4 font-bold text-primary text-center w-1/5">
                Team / Firm
              </th>
              <th className="p-4 font-medium text-center w-1/5 text-on-surface-variant">
                Vendor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visible.map((feature, idx) => {
              const isTeamOnly =
                !feature.individual && feature.team && !feature.vendor;
              return (
                <tr
                  key={idx}
                  className={`hover:bg-white/5 transition-colors ${
                    isTeamOnly ? 'bg-surface-container-high/30' : ''
                  }`}
                >
                  <td
                    className={`p-4 ${
                      isTeamOnly ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {feature.name}
                  </td>
                  {(['individual', 'team', 'vendor'] as const).map((key) => (
                    <td key={key} className="p-4 text-center">
                      {feature[key] ? (
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            key === 'team' ? 'text-primary' : 'text-on-surface'
                          }`}
                        >
                          check
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px] text-outline/30">
                          remove
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Expand toggle */}
        {COMPARISON_FEATURES.length > visibleCount && (
          <div className="p-4 text-center border-t border-white/10 bg-surface-container/20">
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-mono text-[12px] text-primary hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto w-full"
            >
              {expanded
                ? 'Show fewer features'
                : `See all ${COMPARISON_FEATURES.length} features`}
              <span
                className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${
                  expanded ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: Testimonials Row
   ═══════════════════════════════════════════════════════ */
function TestimonialRow() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={stagger}
      className="mx-auto max-w-6xl px-6 lg:px-8 py-20"
    >
      <motion.p
        variants={fadeUp}
        className="text-center text-xs font-bold uppercase tracking-[0.3em] mb-12 text-primary"
      >
        What Investors Are Saying
      </motion.p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TESTIMONIALS.map((t, idx) => {
          const TIcon = t.icon;
          return (
            <motion.div
              key={idx}
              variants={fadeUp}
              className="relative p-8 transition-all duration-500 glass-card rounded-2xl flex flex-col hover:-translate-y-1"
            >
              <Quote className="w-8 h-8 mb-5 text-primary/40" />
              <p className="font-body-sm text-body-sm leading-relaxed mb-8 italic text-on-surface">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-bright">
                  <TIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">
                    {t.author}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {t.role}
                  </p>
                </div>
              </div>
              <div className="flex gap-0.5 mt-5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 text-primary fill-primary"
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: FAQ Accordion (Glass Panel)
   ═══════════════════════════════════════════════════════ */
function PricingFAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={stagger}
      className="mx-auto max-w-3xl px-6 lg:px-8 pb-28"
    >
      <motion.div variants={fadeUp} className="mb-stack-lg">
        <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">
          Before You Commit
        </h3>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          No surprises. No fine print.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-4">
        {PRICING_FAQ.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <details
              key={index}
              open={isOpen}
              className="group glass-panel rounded-lg p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer"
            >
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setOpenIndex(isOpen ? null : index);
                }}
                className="flex justify-between items-center font-headline-md text-[18px] list-none text-on-surface"
              >
                {item.question}
                <span
                  className={`material-symbols-outlined transition duration-300 text-primary ${
                    isOpen ? '-rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </summary>
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] ${
                  isOpen
                    ? 'max-h-64 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <p className="mt-4 font-body-md text-on-surface-variant leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </details>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: Bottom CTA (Glass Panel w/ Gradient)
   ═══════════════════════════════════════════════════════ */
function BottomCTA() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={fadeUp}
      className="mx-auto max-w-4xl px-6 lg:px-8 pb-16"
    >
      <div className="glass-panel rounded-2xl p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
        <div className="relative z-10">
          <h2 className="font-headline-xl text-headline-xl mb-4 text-white">
            Stop bleeding margins to disorganized deals.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto">
            PaperWorking centralizes your pipeline, tracks real-time costs, and
            automates closing docs so you can close faster and scale without the
            chaos.
          </p>
          <a
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-label-md text-[16px] px-8 py-4 rounded-xl luminous-button hover:opacity-90 active:scale-95 transition-all"
            href="/register"
          >
            Start 14-Day Free Trial
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-4 opacity-70">
            14-day trial · Credit card required · No charge until day 15
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Export: PricingSection
   ═══════════════════════════════════════════════════════ */
export default function PricingSection({
  onSelectPlan,
}: {
  onSelectPlan?: (plan: string) => void;
}) {
  const [isAnnual, setIsAnnual] = useState(true);

  const handleSelect = (plan: string) => {
    onSelectPlan?.(plan);
  };

  return (
    <section
      id="pricing"
      className="dark scroll-mt-20 bg-background text-on-surface relative py-margin-desktop overflow-hidden"
    >
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[50%] bg-secondary/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* ── Component 1: Header & Billing Toggle ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mx-auto max-w-3xl px-6 lg:px-8 pt-14 sm:pt-16 pb-8 text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="font-headline-xl text-headline-xl text-on-surface mb-stack-md glow-text"
          >
            Pick your plan.{' '}
            <br className="hidden md:block" />
            Start closing more deals.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg"
          >
            14-day trial on every plan. Credit card required. No charge until day 15.
          </motion.p>

          <motion.div variants={fadeUp}>
            <BillingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
          </motion.div>
        </motion.div>

        {/* ── Component 2: 3-Tier Pricing Cards ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mx-auto max-w-6xl px-6 lg:px-8 pb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-desktop items-start">
            {PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isAnnual={isAnnual}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Component 3: Feature Comparison Table ── */}
        <ComparisonTable />

        {/* ── Component 4: Trust & Friction Reduction ── */}
        <TestimonialRow />
        <PricingFAQAccordion />

        {/* ── Component 5: Bottom CTA ── */}
        <BottomCTA />
      </div>
    </section>
  );
}
