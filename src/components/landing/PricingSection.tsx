'use client';

import React, { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';
import {
  Check,
  Minus,
  ChevronDown,
  ArrowRight,
  Star,
  Quote,
  Users,
  Building2,
  Wrench,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PricingSection — "Pricing-Page-Architect"

   Vertical scroll section placed directly below "How It Works."
   Four sub-components:
     1. Header & Billing Toggle
     2. 3-Tier Pricing Cards (Individual / Team / Vendor)
     3. Feature Comparison Table
     4. Trust & Friction Reduction (Testimonials + FAQ Accordion)

   Palette: #f2f2f2 (bg), #595959 (fg), #7f7f7f (subtle), #cccccc (border)
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
  annualPrice: string; // displayed as yearly total
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
    target: 'For the solo investor looking to replace 5 different tools with one dashboard.',
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
    target: 'For scaling operations that need role-based access for partners, PMs, and agents.',
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
    target: 'For contractors, inspectors, and trades looking for high-quality leads from active investors.',
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
    question: 'How does the free trial work?',
    answer:
      "Every new account starts with a full-access 14-day free trial. A credit card is collected at checkout to prevent abuse, but you won't be charged a single cent until your trial ends. You get the complete Team-tier experience so you can evaluate every feature. At trial end, choose the plan that fits your workflow.",
  },
  {
    question: 'Is there a money-back guarantee?',
    answer:
      'Yes. In addition to the 14-day free trial, if you are not completely satisfied within your first 30 days of paid service, email us and we will refund 100% of your payment. No questions asked. We take on the risk so you don\'t have to.',
  },
  {
    question: 'Can I upgrade from Individual to Team later?',
    answer:
      'Yes, upgrades take effect immediately. When you upgrade, we prorate the remaining balance of your current billing period and apply it to the Team plan. All your existing deals, documents, and financial records stay intact. No data migration needed.',
  },
  {
    question: 'What happens if I cancel?',
    answer:
      'Cancel anytime from your account settings with just one click. You retain full access until the end of your billing period. No surprise charges, no penalty fees, no awkward phone calls to cancel. Your data is preserved for 90 days, and you can export everything (CSV or PDF) at any time.',
  },
  {
    question: 'Do Vendors get access to my financial data?',
    answer:
      'Absolutely not. Vendor accounts are structurally isolated. They can only see their marketplace listing, inbox messages, and work requests sent to them by REI Teams. They have zero visibility into any financial data, deal analytics, or capital stack information.',
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
   Sub-Component: Billing Toggle
   ═══════════════════════════════════════════════════════ */
function BillingToggle({
  isAnnual,
  onToggle,
}: {
  isAnnual: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span
        className={`text-sm font-medium transition-colors duration-300 ${
          !isAnnual ? 'text-on-surface' : 'text-on-surface-variant'
        }`}
      >
        Monthly
      </span>

      {/* Pill toggle */}
      <button
        onClick={() => onToggle(!isAnnual)}
        className="relative w-16 h-8 cursor-pointer transition-colors duration-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        style={{
          backgroundColor: isAnnual ? '#2dd4bf' : '#334155',
          borderRadius: '9999px',
        }}
        role="switch"
        aria-checked={isAnnual}
        aria-label="Toggle annual billing"
      >
        <div
          className="absolute top-1 w-6 h-6 bg-surface shadow-md transition-transform duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]"
          style={{
            borderRadius: '9999px',
            transform: isAnnual ? 'translateX(33px)' : 'translateX(5px)',
          }}
        />
      </button>

      <span
        className={`text-sm font-medium transition-colors duration-300 ${
          isAnnual ? 'text-on-surface' : 'text-on-surface-variant'
        }`}
      >
        Annually
      </span>

      {/* Savings badge */}
      <span
        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 transition-all duration-400 ease-out bg-primary/20 text-primary ${
          isAnnual
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 -translate-x-2 scale-90 pointer-events-none'
        }`}
        style={{
          borderRadius: '9999px',
        }}
      >
        Save up to 20%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: Pricing Card
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
  const period = isAnnual ? '/mo' : '/mo';

  const isMostPopular = plan.id === 'team';

  return (
    <motion.div
      variants={fadeUp}
      className={`relative flex flex-col p-8 rounded-xl transition-all duration-500 hover:shadow-2xl group ${
        isMostPopular
          ? 'glass-panel transform md:-translate-y-4 shadow-2xl z-10'
          : 'glass-card'
      }`}
    >
      {/* Badge */}
      {plan.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary font-label-sm text-label-sm px-3 py-1 rounded-full font-bold shadow-lg whitespace-nowrap"
        >
          {plan.badge}
        </div>
      )}

      {/* Plan Name */}
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2 mt-2">
        {plan.name}
      </h3>

      {/* Target audience */}
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 h-10">
        {plan.target}
      </p>

      {/* Price */}
      <div className="mb-6">
        <span className="font-headline-xl text-headline-xl text-primary tabular-nums">
          <AnimatedPrice value={price} />
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {period}
        </span>
      </div>

      {/* Annual billing note */}
      <div className="h-6 mb-2">
        {isAnnual && (
          <p className="font-label-sm text-label-sm text-on-surface-variant transition-opacity duration-300">
            Billed annually at {plan.annualPrice}/yr
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={() => onSelect(`${plan.name} ${isAnnual ? 'Annual' : 'Monthly'}`)}
        className={`w-full font-label-md text-label-md py-3 rounded-lg mb-8 transition-colors ${
          isMostPopular
            ? 'luminous-button'
            : 'bg-surface-bright hover:bg-surface-variant text-on-surface border border-outline-variant'
        }`}
      >
        {plan.ctaLabel}
      </button>

      {/* Feature List */}
      <div className="flex-grow mt-2">
        <p className="font-label-md text-label-md text-on-surface mb-4">
          What's included
        </p>
        <ul className="space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <Check className="w-4 h-4 text-primary shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: Feature Comparison Table
   ═══════════════════════════════════════════════════════ */
function ComparisonTable() {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = 8;
  const visible = expanded
    ? COMPARISON_FEATURES
    : COMPARISON_FEATURES.slice(0, visibleCount);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={stagger}
      className="mx-auto max-w-5xl px-6 lg:px-8 pt-24 pb-8"
    >
      <motion.div variants={fadeUp} className="text-center mb-14">
        <p className="text-xs font-bold uppercase tracking-[0.3em] mb-4 text-primary">
          Complete Comparison
        </p>
        <h3 className="font-headline-lg text-headline-lg text-on-surface">
          Every feature, side by side.
        </h3>
        <p className="font-body-md text-body-md mt-3 text-on-surface-variant">
          See exactly which tools come with each plan.
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="overflow-x-auto rounded-2xl glass-card border border-white/10"
      >
        <div className="min-w-[640px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="py-5 px-6 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Feature
                </th>
                {['Individual', 'Team / Firm', 'Vendor'].map((col, idx) => (
                  <th
                    key={col}
                    className={`py-5 px-4 font-label-sm text-label-sm uppercase tracking-widest text-center w-32 ${
                      idx === 1 ? 'bg-primary/5 text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((feature, idx) => (
                <tr
                  key={idx}
                  className="transition-colors hover:bg-white/5 border-b border-white/5 last:border-none"
                >
                  <td className="py-4 px-6 font-body-sm text-body-sm text-on-surface font-medium">
                    {feature.name}
                  </td>
                  {(['individual', 'team', 'vendor'] as const).map(
                    (key, colIdx) => (
                      <td
                        key={key}
                        className={`py-4 px-4 text-center ${
                          colIdx === 1 ? 'bg-primary/5' : ''
                        }`}
                      >
                        {feature[key] ? (
                          <Check className="w-5 h-5 mx-auto text-primary" />
                        ) : (
                          <Minus className="w-5 h-5 mx-auto text-on-surface-variant/30" />
                        )}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expand/Collapse Toggle */}
          {COMPARISON_FEATURES.length > visibleCount && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center py-4 font-label-sm text-label-sm transition-colors hover:bg-white/10 group text-on-surface-variant border-t border-white/10"
            >
              {expanded
                ? 'Show fewer features'
                : `See all ${COMPARISON_FEATURES.length} features`}
              <ChevronDown
                className={`w-4 h-4 ml-2 transition-transform duration-300 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
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
              {/* Quote icon */}
              <Quote className="w-8 h-8 mb-5 text-primary/40" />

              {/* Quote text */}
              <p className="font-body-sm text-body-sm leading-relaxed mb-8 italic text-on-surface">
                "{t.quote}"
              </p>

              {/* Author */}
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

              {/* Star rating */}
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
   Sub-Component: FAQ Accordion
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
      <motion.div variants={fadeUp} className="text-center mb-14">
        <p className="text-xs font-bold uppercase tracking-[0.3em] mb-4 text-primary">
          Before You Commit
        </p>
        <h3 className="font-headline-lg text-headline-lg text-on-surface">
          No surprises. No fine print.
        </h3>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="overflow-hidden glass-card rounded-2xl border border-white/10"
      >
        {PRICING_FAQ.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <details
              key={index}
              open={isOpen}
              className="group border-b border-white/10 last:border-none"
            >
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setOpenIndex(isOpen ? null : index);
                }}
                className="flex items-center justify-between py-5 px-6 cursor-pointer select-none transition-colors hover:bg-white/5 list-none"
              >
                <span className="font-body-md text-body-md font-semibold pr-4 text-on-surface">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 text-on-surface-variant ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </summary>
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] ${
                  isOpen
                    ? 'max-h-64 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <p className="px-6 pb-5 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
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
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* ── Component 1: Header & Billing Toggle ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mx-auto max-w-5xl px-6 lg:px-8 pt-14 sm:pt-16 pb-8 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-bold uppercase tracking-[0.3em] mb-4 text-primary"
          >
            Pricing
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="font-headline-xl text-headline-xl text-on-surface mb-stack-md"
          >
            Simple pricing. Zero risk.
            <br className="hidden sm:block" />
            Start closing more deals today.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-stack-lg"
          >
            Try PaperWorking absolutely free for 14 days. We don't bill you until day 15, and you can cancel anytime with one click. If it doesn't save you money on your first deal, we don't want your money.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
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
      </div>
    </section>
  );
}
