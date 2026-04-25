'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
    target: 'Solo flippers and side-hustlers.',
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
    ctaLabel: 'Start Free Trial',
    isHighlighted: false,
    icon: Users,
    variant: 'standard',
  },
  {
    id: 'team',
    name: 'Team / Firm',
    target: 'Scaling REI businesses and multi-state developers.',
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
    ctaLabel: 'Start Free Trial',
    isHighlighted: true,
    badge: 'Most Popular',
    icon: Building2,
    variant: 'highlighted',
  },
  {
    id: 'vendor',
    name: 'Vendor Network',
    target: 'Appraisers, Inspectors, GCs, Electricians, Plumbers.',
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
      "I used to track everything on a messy spreadsheet. PaperWorking's pipeline view lets me see exactly where every deal is — and I closed 2 more flips last quarter.",
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
      "Since listing on PaperWorking's Vendor Network, I get 3–5 qualified leads per week from investor teams who actually have projects ready to go.",
    author: 'David R.',
    role: 'Licensed General Contractor, Miami FL',
    icon: Wrench,
  },
];

/* ─── FAQ Data ─── */
const PRICING_FAQ = [
  {
    question: 'Do Vendors get access to my financial data?',
    answer:
      'Absolutely not. Vendor accounts are structurally isolated — they can only see their marketplace listing, inbox messages, and work requests sent to them by REI Teams. They have zero visibility into any financial data, deal analytics, or capital stack information. Access is enforced at the database level, not just the UI.',
  },
  {
    question: 'Can I upgrade from Individual to Team later?',
    answer:
      'Yes, upgrades take effect immediately. When you upgrade, we prorate the remaining balance of your current billing period and apply it to the Team plan. All your existing deals, documents, and financial records carry forward seamlessly — no data migration needed.',
  },
  {
    question: 'How does the free trial work?',
    answer:
      "Every new account starts with a full-access 14-day free trial — no credit card required. You get the complete Team-tier experience so you can evaluate every feature. At trial end, choose the plan that fits your workflow. If you don't convert, your data is preserved for 90 days in case you return.",
  },
  {
    question: 'What happens if I cancel?',
    answer:
      'Cancel anytime from your account settings. You retain full access until the end of your billing period. No surprise charges, no penalty fees. Your data is preserved for 90 days, and you can export everything (CSV or PDF) at any time.',
  },
  {
    question: 'Is there volume pricing for large teams?',
    answer:
      'For organizations needing more than 10 seats or enterprise-grade compliance (SOC 2, SSO/SAML), contact our sales team. We offer custom pricing with dedicated onboarding, SLA guarantees, and white-glove migration assistance.',
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
          !isAnnual ? 'text-[#595959]' : 'text-[#a5a5a5]'
        }`}
      >
        Monthly
      </span>

      {/* Pill toggle */}
      <button
        onClick={() => onToggle(!isAnnual)}
        className="relative w-16 h-8 cursor-pointer transition-colors duration-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#595959] focus-visible:ring-offset-2"
        style={{
          backgroundColor: isAnnual ? '#595959' : '#cccccc',
          borderRadius: '9999px',
        }}
        role="switch"
        aria-checked={isAnnual}
        aria-label="Toggle annual billing"
      >
        <div
          className="absolute top-1 w-6 h-6 bg-bg-surface shadow-md transition-transform duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]"
          style={{
            borderRadius: '9999px',
            transform: isAnnual ? 'translateX(33px)' : 'translateX(5px)',
          }}
        />
      </button>

      <span
        className={`text-sm font-medium transition-colors duration-300 ${
          isAnnual ? 'text-[#595959]' : 'text-[#a5a5a5]'
        }`}
      >
        Annually
      </span>

      {/* Savings badge */}
      <span
        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 transition-all duration-400 ease-out ${
          isAnnual
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 -translate-x-2 scale-90 pointer-events-none'
        }`}
        style={{
          backgroundColor: '#595959',
          color: '#f2f2f2',
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
  const Icon = plan.icon;
  const price = isAnnual
    ? Math.round(plan.annualPriceNum / 12)
    : plan.monthlyPrice;
  const period = isAnnual ? '/mo' : '/mo';

  /* Card styling based on variant */
  const cardStyles: Record<
    string,
    { bg: string; text: string; textMuted: string; border: string; ctaBg: string; ctaText: string; badgeBg: string; badgeText: string }
  > = {
    standard: {
      bg: '#ffffff',
      text: '#595959',
      textMuted: '#7f7f7f',
      border: '1px solid #cccccc',
      ctaBg: '#1a1a1a',
      ctaText: '#ffffff',
      badgeBg: '',
      badgeText: '',
    },
    highlighted: {
      bg: '#595959',
      text: '#f2f2f2',
      textMuted: '#cccccc',
      border: '1px solid #595959',
      ctaBg: '#f2f2f2',
      ctaText: '#595959',
      badgeBg: '#f2f2f2',
      badgeText: '#595959',
    },
    vendor: {
      bg: '#ffffff',
      text: '#595959',
      textMuted: '#7f7f7f',
      border: '2px dashed #cccccc',
      ctaBg: '#1a1a1a',
      ctaText: '#ffffff',
      badgeBg: '',
      badgeText: '',
    },
  };

  const s = cardStyles[plan.variant];

  return (
    <motion.div
      variants={fadeUp}
      className={`relative flex flex-col p-8 lg:p-10 transition-all duration-500 hover:shadow-xl group ${
        plan.isHighlighted ? 'lg:-my-4 lg:py-12 z-10 shadow-lg' : ''
      }`}
      style={{
        backgroundColor: s.bg,
        border: s.border,
        borderRadius: '24px',
      }}
    >
      {/* Badge */}
      {plan.badge && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-[0.2em] px-5 py-2 whitespace-nowrap"
          style={{
            backgroundColor: s.badgeBg,
            color: s.badgeText,
            borderRadius: '9999px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          {plan.badge}
        </div>
      )}

      {/* Icon + Plan Name */}
      <div className="flex items-center gap-3 mb-4 mt-2">
        <div
          className="w-10 h-10 flex items-center justify-center"
          style={{
            backgroundColor: plan.isHighlighted ? 'rgba(242,242,242,0.15)' : '#f2f2f2',
            borderRadius: '12px',
          }}
        >
          <Icon className="w-5 h-5" style={{ color: plan.isHighlighted ? '#f2f2f2' : '#595959' }} />
        </div>
        <h3
          className="text-xl font-bold tracking-tight"
          style={{ color: s.text }}
        >
          {plan.name}
        </h3>
      </div>

      {/* Target audience */}
      <p
        className="text-sm leading-relaxed mb-8 min-h-[44px]"
        style={{ color: s.textMuted }}
      >
        {plan.target}
      </p>

      {/* Price */}
      <div className="mb-2">
        <span
          className="text-5xl font-black tracking-tighter tabular-nums"
          style={{ color: s.text }}
        >
          <AnimatedPrice value={price} />
        </span>
        <span
          className="text-base font-medium ml-1"
          style={{ color: s.textMuted }}
        >
          {period}
        </span>
      </div>

      {/* Annual billing note */}
      <div className="h-6 mb-6">
        {isAnnual && (
          <p
            className="text-xs font-medium transition-opacity duration-300"
            style={{ color: s.textMuted }}
          >
            Billed annually at {plan.annualPrice}/yr
          </p>
        )}
      </div>

      {/* CTA Button */}
      <Link
        href="/register"
        onClick={(e) => {
          e.preventDefault();
          onSelect(`${plan.name} ${isAnnual ? 'Annual' : 'Monthly'}`);
        }}
        className="w-full py-4 text-sm font-bold uppercase tracking-[0.15em] text-center transition-all duration-400 ease-[cubic-bezier(0.19,1,0.22,1)] flex items-center justify-center gap-2 hover:scale-[1.02] hover:opacity-90 active:scale-[0.97]"
        style={{
          backgroundColor: s.ctaBg,
          color: s.ctaText,
          border: 'none',
          borderRadius: '9999px',
        }}
      >
        {plan.ctaLabel}
        <ArrowRight className="w-4 h-4" />
      </Link>

      {/* Microcopy */}
      <p
        className="text-center text-xs mt-3 font-medium"
        style={{ color: s.textMuted }}
      >
        No credit card required
      </p>

      {/* Feature List */}
      <div className="mt-8 flex-1">
        <p
          className="text-xs font-bold uppercase tracking-[0.2em] mb-5"
          style={{ color: s.textMuted }}
        >
          What's included
        </p>
        <ul className="space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <Check
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: plan.isHighlighted ? '#cccccc' : '#595959' }}
              />
              <span
                className="text-sm font-medium leading-relaxed"
                style={{ color: s.text, opacity: 0.9 }}
              >
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
        <p
          className="text-xs font-bold uppercase tracking-[0.3em] mb-4"
          style={{ color: '#a5a5a5' }}
        >
          Complete Comparison
        </p>
        <h3
          className="text-3xl sm:text-4xl font-black tracking-tighter"
          style={{ color: '#595959' }}
        >
          Every feature, side by side.
        </h3>
        <p className="text-sm mt-3" style={{ color: '#7f7f7f' }}>
          See exactly which tools come with each plan.
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="overflow-x-auto"
        style={{ borderRadius: '16px' }}
      >
        <div
          className="min-w-[640px] overflow-hidden"
          style={{
            border: '1px solid #cccccc',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
          }}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th
                  className="py-5 px-6 text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: '#7f7f7f' }}
                >
                  Feature
                </th>
                {['Individual', 'Team / Firm', 'Vendor'].map((col, idx) => (
                  <th
                    key={col}
                    className={`py-5 px-4 text-xs font-bold uppercase tracking-[0.15em] text-center w-32 ${
                      idx === 1 ? 'bg-[#595959]/5' : ''
                    }`}
                    style={{ color: idx === 1 ? '#595959' : '#7f7f7f' }}
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
                  className="transition-colors hover:bg-[#f2f2f2]/50"
                  style={{
                    borderTop: '1px solid #f2f2f2',
                  }}
                >
                  <td
                    className="py-4 px-6 text-sm font-medium"
                    style={{ color: '#595959' }}
                  >
                    {feature.name}
                  </td>
                  {(['individual', 'team', 'vendor'] as const).map(
                    (key, colIdx) => (
                      <td
                        key={key}
                        className={`py-4 px-4 text-center ${
                          colIdx === 1 ? 'bg-[#595959]/5' : ''
                        }`}
                      >
                        {feature[key] ? (
                          <Check
                            className="w-5 h-5 mx-auto"
                            style={{ color: '#595959' }}
                          />
                        ) : (
                          <Minus
                            className="w-5 h-5 mx-auto"
                            style={{ color: '#cccccc' }}
                          />
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
              className="w-full flex items-center justify-center py-4 text-sm font-semibold transition-colors hover:bg-[#f2f2f2]/50 group"
              style={{
                color: '#7f7f7f',
                borderTop: '1px solid #f2f2f2',
              }}
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
        className="text-center text-xs font-bold uppercase tracking-[0.3em] mb-12"
        style={{ color: '#a5a5a5' }}
      >
        What Our Users Say
      </motion.p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TESTIMONIALS.map((t, idx) => {
          const TIcon = t.icon;
          return (
            <motion.div
              key={idx}
              variants={fadeUp}
              className="relative p-8 transition-all duration-500 hover:shadow-md"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e6e6e6',
                borderRadius: '20px',
              }}
            >
              {/* Quote icon */}
              <Quote
                className="w-8 h-8 mb-5"
                style={{ color: '#cccccc' }}
              />

              {/* Quote text */}
              <p
                className="text-sm leading-relaxed mb-8 italic"
                style={{ color: '#595959' }}
              >
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto">
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{
                    backgroundColor: '#f2f2f2',
                    borderRadius: '12px',
                  }}
                >
                  <TIcon
                    className="w-5 h-5"
                    style={{ color: '#595959' }}
                  />
                </div>
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: '#595959' }}
                  >
                    {t.author}
                  </p>
                  <p
                    className="text-xs font-medium"
                    style={{ color: '#a5a5a5' }}
                  >
                    {t.role}
                  </p>
                </div>
              </div>

              {/* Star rating */}
              <div className="flex gap-0.5 mt-5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5"
                    style={{ color: '#595959', fill: '#595959' }}
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
        <p
          className="text-xs font-bold uppercase tracking-[0.3em] mb-4"
          style={{ color: '#a5a5a5' }}
        >
          Common Questions
        </p>
        <h3
          className="text-3xl sm:text-4xl font-black tracking-tighter"
          style={{ color: '#595959' }}
        >
          We take the guesswork out.
        </h3>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="overflow-hidden"
        style={{
          border: '1px solid #cccccc',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
        }}
      >
        {PRICING_FAQ.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <details
              key={index}
              open={isOpen}
              className="group"
              style={{
                borderTop: index > 0 ? '1px solid #f2f2f2' : 'none',
              }}
            >
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setOpenIndex(isOpen ? null : index);
                }}
                className="flex items-center justify-between py-5 px-6 cursor-pointer select-none transition-colors hover:bg-[#f2f2f2]/50 list-none"
              >
                <span
                  className="text-sm font-semibold pr-4"
                  style={{ color: '#595959' }}
                >
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  style={{ color: '#a5a5a5' }}
                />
              </summary>
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] ${
                  isOpen
                    ? 'max-h-64 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <p
                  className="px-6 pb-5 text-sm leading-relaxed"
                  style={{ color: '#7f7f7f' }}
                >
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
  const [isAnnual, setIsAnnual] = useState(true); // Default to Annually

  const handleSelect = (plan: string) => {
    onSelectPlan?.(plan);
  };

  return (
    <section
      id="pricing"
      className="scroll-mt-20"
      style={{ backgroundColor: '#f2f2f2' }}
    >
      {/* ── Component 1: Header & Billing Toggle ── */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={stagger}
        className="mx-auto max-w-5xl px-6 lg:px-8 pt-28 sm:pt-36 pb-16 text-center"
      >
        <motion.p
          variants={fadeUp}
          className="text-xs font-bold uppercase tracking-[0.3em] mb-8"
          style={{ color: '#a5a5a5' }}
        >
          Pricing
        </motion.p>

        <motion.h2
          variants={fadeUp}
          className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black tracking-tighter leading-tight text-balance mb-6"
          style={{ color: '#595959' }}
        >
          Simple, transparent pricing for every
          <br className="hidden sm:block" />
          stage of your real estate business.
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="text-sm leading-relaxed mx-auto max-w-xl mb-14"
          style={{ color: '#7f7f7f' }}
        >
          14-day free trial on every plan. No credit card. Cancel anytime.
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
    </section>
  );
}
