'use client';

import React, { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';
import {
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
    name: 'Investor',
    target: 'Solo flippers tired of spreadsheet chaos.',
    monthlyPrice: 59,
    annualPrice: '$499',
    annualPriceNum: 499,
    features: [
      '1 User Seat',
      'Full REI Dashboard access',
      'Full 4-Phase Lifecycle tracking',
      'Financial Calculator (IRR, Cap Rate, CoC)',
      'CPA-Ready CSV exports',
    ],
    ctaLabel: 'Start 14-Day Free Trial',
    isHighlighted: false,
    icon: Users,
    variant: 'standard',
  },
  {
    id: 'team',
    name: 'Investment Team',
    target: 'Scaling REI businesses managing multiple deals.',
    monthlyPrice: 99,
    annualPrice: '$999',
    annualPriceNum: 999,
    features: [
      'Up to 10 User Seats',
      'Everything in Investor',
      'JV & Syndication capital trackers',
      'Pro reporting templates (PDF export)',
      'Custom checklists & compliance workflows',
    ],
    ctaLabel: 'Start 14-Day Free Trial',
    isHighlighted: true,
    badge: 'Most Popular',
    icon: Building2,
    variant: 'highlighted',
  },
  {
    id: 'vendor',
    name: 'Vendor',
    target: 'Appraisers, Inspectors, GCs, and tradespeople.',
    monthlyPrice: 39,
    annualPrice: '$390',
    annualPriceNum: 390,
    features: [
      'Marketplace Directory Listing',
      'Profile & contact card',
      'Deal referral notifications',
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
  // Category A: Deal Sourcing & Underwriting (Acquisition)
  { name: 'Financial Calculator (IRR, Cap Rate, CoC)', individual: true, team: true, vendor: true },
  { name: 'Comparable Database (Market Comps)', individual: true, team: true, vendor: true },
  { name: 'Syndication Underwriter (Debt sizing)', individual: false, team: true, vendor: true },
  { name: 'Investor Pitch Builder (LP PDF Summaries)', individual: false, team: true, vendor: true },

  // Category B: Transaction & Escrow (Transaction)
  { name: 'Contingency Tracker (Deadline Alerts)', individual: true, team: true, vendor: true },
  { name: 'Escrow Document Vault (Secure Storage)', individual: true, team: true, vendor: true },
  { name: 'Earnest Money Ledger (Deposits/Returns)', individual: true, team: true, vendor: true },
  { name: 'Automated Title Progress (Checklists)', individual: false, team: true, vendor: true },

  // Category C: Renovation & Draw Management (Rehab)
  { name: 'Draw Checklist (GC Scope by Line-Item)', individual: true, team: true, vendor: true },
  { name: 'Draw Submission Portal (Contractor Invoices)', individual: false, team: true, vendor: true },
  { name: 'Contingency Fund Ledger (Budget Variance)', individual: true, team: true, vendor: true },
  { name: 'Milestone Approvals (GC Draw Workflows)', individual: false, team: true, vendor: true },

  // Category D: Operations, Exit, & Tax (Hold/Exit)
  { name: 'Cost Basis Accumulator (Real-Time Ledger)', individual: true, team: true, vendor: true },
  { name: 'CPA CSV Export (One-Click Hand-Off)', individual: true, team: true, vendor: true },
  { name: 'Valuation Tracker (Market Comps Log)', individual: true, team: true, vendor: true },
  { name: 'White-Label Exit Reports (Professional LP PDF)', individual: false, team: false, vendor: true },
];

/* ─── Testimonial Data ─── */
const TESTIMONIALS = [
  {
    quote:
      "Managing a duplex rehab in Nashville while working a day job meant receipts were always scattered in my truck. Moving our draws and receipts onto PaperWorking gave my GC a clear checklist and gave my CPA clean numbers.",
    author: "Nashville Duplex Rehab Case Study",
    role: "Solo Operator • Duplex Flip • Nashville, TN",
    icon: Users,
  },
  {
    quote:
      "We used to spend hours before every partner meeting building updates in Excel. Now, we give our private lenders read-only dashboard logins. They see the real-time cost basis and project progress whenever they want.",
    author: "Partnership Transparency Case Study",
    role: "JV Partnership • 4-Unit Value-Add • Dallas, TX",
    icon: Building2,
  },
  {
    quote:
      "Having a secure vault for title documents, escrow records, and contingency deadlines means our acquisitions team can close multiple properties in parallel without missing contingency dates.",
    author: "Acquisition Pipeline Case Study",
    role: "Syndication Group • Multi-Family Value-Add",
    icon: Building2,
  },
];

const PRICING_FAQ = [
  {
    question: 'Can I upgrade or downgrade later?',
    answer:
      'Yes. You can change your plan at any time in your Settings. If you upgrade, we will prorate the difference. If you downgrade, your account will be credited for the next billing cycle.',
  },
  {
    question: 'Is there any discount for paying annually?',
    answer:
      'Yes, paying annually saves you 20% compared to paying month-to-month. The savings are automatically applied at checkout.',
  },
  {
    question: 'What is a "Read-Only Partner Seat"?',
    answer:
      'Read-only seats let you invite external stakeholders—like passive investors, private lenders, or your spouse—to view project metrics and documents without being able to edit or delete any data.',
  },
  {
    question: 'Do you charge setup fees?',
    answer:
      'No. There are no setup fees, contract minimums, or hidden charges. You pay only the flat monthly or annual fee for your chosen plan.',
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
              <th className="p-4 font-medium text-center w-1/5">Investor</th>
              <th className="p-4 font-bold text-primary text-center w-1/5">
                Team / Firm
              </th>
              <th className="p-4 font-medium text-center w-1/5 text-on-surface-variant">
                Vendor Marketplace
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
            Stop running six-figure flips out of five-column spreadsheets.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto">
            PaperWorking tracks every document, dollar, and deadline from acquisition to exit in one dashboard.
          </p>
          <a
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-label-md text-[16px] px-8 py-4 rounded-xl luminous-button hover:opacity-90 active:scale-95 transition-all"
            href="/register"
          >
            Start 14-Day Free Trial
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-4 opacity-70">
            14-day free trial • Credit card required • No charge until day 15
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
