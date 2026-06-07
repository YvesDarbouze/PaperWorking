'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PricingSection — Behavioral-Economics Redesign

   Psychology applied (price-psychology-strategist +
   copywriting-psychologist skills):
   ─ Annual default ON → shows savings immediately
   ─ 4-tier good-better-best + institutional anchor
   ─ ROI reframe: cost < one missed deadline ($12,500)
   ─ Loss-framing CTAs, not generic "Get Started"
   ─ Feature list headers tied to investor outcomes
   ─ Comparison table organized by REIL phase
   ─ ROI callout strip between cards and table
   ─ Investor-specific FAQ (real objections)

   Stripe checkout integration preserved via onSelectPlan.
   ═══════════════════════════════════════════════════════ */

/* ─── Animation ──────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

/* ─── Plan data ──────────────────────────────────────── */
interface Plan {
  id: string;
  stripeKey: string;        // passed to onSelectPlan
  name: string;
  tagline: string;
  persona: string;
  monthlyPrice: number | null;
  annualPrice: number | null;       // annual total
  annualMonthly: number | null;     // annual ÷ 12
  features: { label: string; note?: string }[];
  cta: string;
  ctaStyle: 'primary' | 'outline' | 'ghost' | 'contact';
  badge?: string;
  highlighted: boolean;
  isFree: boolean;
  isCustom: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    stripeKey: '',
    name: 'Starter',
    tagline: 'Your first deal, done right.',
    persona: 'For investors who want to learn the system before they trust it.',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthly: 0,
    isFree: true,
    isCustom: false,
    highlighted: false,
    features: [
      { label: '1 active deal at a time' },
      { label: 'Deal Analyzer — IRR, cap rate, CoC' },
      { label: 'Contingency deadline tracker' },
      { label: 'Basic document vault' },
    ],
    cta: 'Start for free',
    ctaStyle: 'ghost',
  },
  {
    id: 'pro',
    stripeKey: 'Investor',
    name: 'Pro',
    tagline: 'Your full deal command center.',
    persona: 'For active investors running multiple flips, rentals, or BRRRR deals.',
    monthlyPrice: 49,
    annualPrice: 468,
    annualMonthly: 39,
    isFree: false,
    isCustom: false,
    highlighted: true,
    badge: 'Most Active Investors',
    features: [
      { label: 'Up to 10 active deals' },
      { label: 'Full 4-phase REIL tracking' },
      { label: 'Contractor draw log + milestone approvals' },
      { label: 'Budget vs. actual — real time' },
      { label: 'CPA-ready P&L export' },
      { label: 'Earnest money alerts' },
    ],
    cta: 'Protect my deals',
    ctaStyle: 'primary',
  },
  {
    id: 'portfolio',
    stripeKey: 'Investment Team',
    name: 'Portfolio',
    tagline: 'Your firm\'s operating layer.',
    persona: 'For syndicators, JV partnerships, and investors building a real portfolio.',
    monthlyPrice: 129,
    annualPrice: 1188,
    annualMonthly: 99,
    isFree: false,
    isCustom: false,
    highlighted: false,
    features: [
      { label: 'Unlimited active deals' },
      { label: 'Everything in Pro' },
      { label: 'Syndication underwriter + LP pitch builder' },
      { label: '3 team seats (+ read-only LP access)', note: 'Invite your CPA or partners at no extra charge' },
      { label: 'White-label exit reports (PDF)' },
      { label: 'Priority support' },
    ],
    cta: 'Scale my operation',
    ctaStyle: 'outline',
  },
  {
    id: 'institutional',
    stripeKey: '',
    name: 'Institutional',
    tagline: 'Your branded platform.',
    persona: 'For institutional players who need API access, white-labeling, and custom SLAs.',
    monthlyPrice: null,
    annualPrice: null,
    annualMonthly: null,
    isFree: false,
    isCustom: true,
    highlighted: false,
    features: [
      { label: 'Unlimited deals + unlimited seats' },
      { label: 'REST API + webhook integrations' },
      { label: 'White-label dashboard' },
      { label: 'Custom data retention + SLA' },
      { label: 'Dedicated account manager' },
      { label: 'Custom Stripe billing' },
    ],
    cta: 'Talk to our team',
    ctaStyle: 'contact',
  },
];

/* ─── Comparison table ───────────────────────────────── */
interface CompRow { label: string; starter: boolean; pro: boolean; portfolio: boolean; inst: boolean; proOnly?: boolean }

const COMP_ROWS: { category: string; rows: CompRow[] }[] = [
  {
    category: 'Acquisition',
    rows: [
      { label: 'Deal Analyzer (IRR, Cap Rate, CoC)', starter: true, pro: true, portfolio: true, inst: true },
      { label: 'Active deal limit', starter: false, pro: true, portfolio: true, inst: true },
      { label: 'LP Syndication Pitch Builder', starter: false, pro: false, portfolio: true, inst: true },
      { label: 'Syndication Underwriter (debt sizing)', starter: false, pro: false, portfolio: true, inst: true },
    ],
  },
  {
    category: 'Transaction',
    rows: [
      { label: 'Contingency Deadline Tracker', starter: true, pro: true, portfolio: true, inst: true },
      { label: 'Earnest Money Alerts', starter: false, pro: true, portfolio: true, inst: true },
      { label: 'Escrow Document Vault', starter: true, pro: true, portfolio: true, inst: true },
      { label: 'Automated Diligence Checklist', starter: false, pro: true, portfolio: true, inst: true },
    ],
  },
  {
    category: 'Hold / Rehab',
    rows: [
      { label: 'Budget vs. Actual — Real Time', starter: false, pro: true, portfolio: true, inst: true },
      { label: 'Contractor Draw Log', starter: false, pro: true, portfolio: true, inst: true },
      { label: 'Draw Submission Portal', starter: false, pro: false, portfolio: true, inst: true },
      { label: 'Milestone Approvals (GC Workflows)', starter: false, pro: true, portfolio: true, inst: true },
    ],
  },
  {
    category: 'Exit & Tax',
    rows: [
      { label: 'CPA-Ready P&L Export', starter: false, pro: true, portfolio: true, inst: true },
      { label: 'Closing Cost Tracker', starter: false, pro: true, portfolio: true, inst: true },
      { label: 'ROI Summary (actual vs. projected)', starter: false, pro: true, portfolio: true, inst: true },
      { label: 'White-Label Exit Reports (PDF)', starter: false, pro: false, portfolio: true, inst: true },
    ],
  },
  {
    category: 'Team & API',
    rows: [
      { label: 'Team Seats', starter: false, pro: false, portfolio: true, inst: true },
      { label: 'Read-Only LP / Partner Access', starter: false, pro: false, portfolio: true, inst: true },
      { label: 'REST API + Webhooks', starter: false, pro: false, portfolio: false, inst: true },
      { label: 'White-Label Dashboard', starter: false, pro: false, portfolio: false, inst: true },
    ],
  },
];

/* ─── Testimonials ───────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: "Managing a duplex rehab in Nashville while working full-time meant receipts were always in my truck. Moving draws and receipts into PaperWorking gave my GC a clear checklist and gave my CPA clean numbers at year end.",
    author: 'Marcus T.',
    role: 'Solo Operator · Duplex Flip · Nashville, TN',
    stars: 5,
  },
  {
    quote: "We used to spend hours before every partner meeting updating Excel. Now our private lenders get read-only dashboard access. They see real-time cost basis and project progress whenever they want — we stopped doing update calls.",
    author: 'Sarah & James K.',
    role: 'JV Partnership · 4-Unit Value-Add · Dallas, TX',
    stars: 5,
  },
  {
    quote: "We were closing multiple properties in parallel and almost missed an inspection period because it was in a spreadsheet no one updated. We haven't had a contingency scare since we moved everything into PaperWorking.",
    author: 'Vega Capital Group',
    role: 'Syndication · Multi-Family Value-Add · Phoenix, AZ',
    stars: 5,
  },
];

/* ─── FAQ ────────────────────────────────────────────── */
const FAQ = [
  {
    q: "I only close 3–4 deals a year. Can I justify $39/month?",
    a: "Yes. A single missed contingency window can cost you $12,500 in lost earnest money — more than three years of Pro. If one contractor draw goes untracked and you're $40k over budget at closing, that's the equivalent of 85 years of the annual plan. The question isn't whether $39 is worth it. The question is what your last deal's blown timeline actually cost you.",
  },
  {
    q: "Is there a free trial? What happens to my data if I cancel?",
    a: "Every paid plan includes a 14-day trial. Your card is required to start, but nothing is charged until day 15. If you cancel, you keep full read access to your deal data for 90 days and can export everything as a CSV — including your full P&L — at any time. We don't hold your data hostage.",
  },
  {
    q: "Can I add my CPA or business partner as a user?",
    a: "On the Portfolio plan, you get 3 full team seats plus unlimited read-only partner access — so you can invite passive investors, private lenders, or your CPA without them being able to edit anything. On Pro, you can export a CPA-ready P&L from any deal in one click. Most CPAs find that more useful than a login.",
  },
  {
    q: "Is there a contract or minimum commitment?",
    a: "No contracts, no minimums. Monthly plans bill month to month. Annual plans are billed once per year with a full refund available in the first 30 days. If you need to cancel, you do it from Settings — no call required, no retention flow.",
  },
  {
    q: "I have a spreadsheet system that works. Why would I switch?",
    a: "Spreadsheets don't know when your earnest money goes hard. They don't fire an alert when your inspection period is 3 days out, don't track contractor draws against a line-item budget in real time, and don't hand your CPA a single organized export at year end. If your spreadsheet system truly works, you'll notice within the first deal on PaperWorking — if it doesn't save you time or catch something, cancel. The trial is free.",
  },
];

/* ─── Sub: Animated price number ────────────────────── */
function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      setAnimating(true);
      const t = setTimeout(() => { setDisplay(value); setAnimating(false); prev.current = value; }, 160);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`inline-block transition-all duration-200 ${animating ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
      ${display}
    </span>
  );
}

/* ─── Sub: Billing toggle ───────────────────────────── */
function BillingToggle({ isAnnual, onToggle }: { isAnnual: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-flex items-center p-1 glass-panel rounded-full border border-outline-variant">
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 ${
            !isAnnual ? 'bg-surface-bright border border-outline-variant text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`px-5 py-2 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all duration-200 ${
            isAnnual ? 'bg-surface-bright border border-outline-variant text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Annual
          <span className="bg-primary/15 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Save 20%
          </span>
        </button>
      </div>

      {/* Annual nudge — applies loss-aversion framing */}
      <p className={`font-jetbrains text-[10px] tracking-[0.04em] transition-opacity duration-200 ${isAnnual ? 'text-primary/50' : 'text-tertiary/70'}`}>
        {isAnnual
          ? 'Annual billing active · Pro saves $120/yr — two CPA hours covered'
          : 'Switch to annual → save $120/yr on Pro or $360/yr on Portfolio'}
      </p>
    </div>
  );
}

/* ─── Sub: Pricing card ─────────────────────────────── */
function PricingCard({ plan, isAnnual, onSelect }: { plan: Plan; isAnnual: boolean; onSelect: (key: string) => void }) {
  const displayPrice = isAnnual ? plan.annualMonthly : plan.monthlyPrice;

  const handleClick = () => {
    if (plan.isCustom || plan.isFree) return;
    onSelect(`${plan.stripeKey} ${isAnnual ? 'Annual' : 'Monthly'}`);
  };

  return (
    <motion.div
      variants={fadeUp}
      className={`glass-panel rounded-xl p-7 flex flex-col relative transition-all duration-300 h-full
        ${plan.highlighted
          ? 'border-primary/35 shadow-[0_0_60px_-15px_rgba(69,73,85,0.25)] md:scale-[1.03] z-10'
          : 'border-outline-variant hover:border-outline'
        }`}
    >
      {/* Top light line for highlighted */}
      {plan.highlighted && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-t-xl" />
      )}

      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap shadow-[0_0_20px_rgba(69,73,85,0.4)]">
          {plan.badge}
        </div>
      )}

      {/* Plan header */}
      <div className={`pb-5 border-b border-outline-variant ${plan.badge ? 'mt-2' : ''}`}>
        <h3 className={`text-[18px] font-bold tracking-[-0.01em] mb-1 ${plan.highlighted ? 'text-primary' : 'text-on-surface'}`}>
          {plan.name}
        </h3>
        <p className="text-[12px] font-normal text-on-surface-variant leading-tight">{plan.persona}</p>
      </div>

      {/* Price */}
      <div className="py-5 border-b border-outline-variant">
        {plan.isCustom ? (
          <div>
            <p className="text-[28px] font-extrabold tracking-[-0.03em] text-on-surface">Custom</p>
            <p className="text-[12px] text-on-surface-variant mt-1">Contact us for a quote</p>
          </div>
        ) : plan.isFree ? (
          <div>
            <p className="text-[28px] font-extrabold tracking-[-0.03em] text-on-surface">Free</p>
            <p className="text-[12px] text-on-surface-variant mt-1">No credit card required</p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`font-extrabold text-[32px] tracking-[-0.035em] font-tabular ${plan.highlighted ? 'text-primary' : 'text-on-surface'}`}>
                <AnimatedPrice value={displayPrice!} />
              </span>
              <span className="text-[13px] text-on-surface-variant">/mo</span>
            </div>
            <div className="h-5 mt-1">
              {isAnnual ? (
                <p className={`text-[12px] ${plan.highlighted ? 'text-primary/70' : 'text-on-surface-variant'}`}>
                  Billed ${plan.annualPrice}/yr
                </p>
              ) : (
                <p className="text-[12px] text-on-surface-variant">Billed monthly</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="pt-5">
        {plan.ctaStyle === 'contact' ? (
          <Link
            href="/contact"
            className="pw-interactive-custom block w-full text-center py-3 rounded-lg text-[13px] font-semibold
              border border-outline-variant text-on-surface hover:border-outline hover:text-primary
              transition-all duration-200"
          >
            {plan.cta}
          </Link>
        ) : plan.isFree ? (
          <Link
            href="/register"
            className="pw-interactive-custom block w-full text-center py-3 rounded-lg text-[13px] font-semibold
              border border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface
              transition-all duration-200"
          >
            {plan.cta}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className={`w-full py-3 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              plan.highlighted
                ? 'luminous-button bg-primary text-on-primary hover:opacity-90'
                : 'border border-primary text-primary hover:bg-primary/8'
            }`}
          >
            {plan.cta}
          </button>
        )}
        <p className="text-[10px] font-normal text-on-surface-variant/40 text-center mt-2 font-jetbrains tracking-wide">
          {plan.isFree ? 'No time limit on free plan' : plan.isCustom ? 'Custom billing terms' : '14-day trial · No charge until day 15'}
        </p>
      </div>

      {/* Feature list */}
      <div className="pt-5 flex-grow">
        <p className="font-jetbrains text-[9px] uppercase tracking-[0.1em] text-on-surface-variant/40 mb-4">
          {plan.isFree ? 'Included' : 'Protects your margins with'}
        </p>
        <ul className="space-y-3">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-primary' : 'text-on-surface-variant/60'}`}
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
              >
                check_circle
              </span>
              <span className="text-[13px] leading-[20px] text-on-surface-variant">
                {f.label}
                {f.note && (
                  <span className="block text-[11px] text-on-surface-variant/50 mt-0.5 italic">{f.note}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ─── Sub: ROI callout strip ────────────────────────── */
function ROICallout() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={fadeUp}
      className="max-w-5xl mx-auto px-6 lg:px-8 py-10"
    >
      <div className="glass-card rounded-2xl px-8 py-7 border border-primary/15 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute inset-0 bg-primary/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
          <div className="flex-shrink-0">
            <p className="font-extrabold text-[44px] leading-none tracking-[-0.04em] text-primary luminous-text font-tabular">
              $468
            </p>
            <p className="font-jetbrains text-[10px] text-primary/50 tracking-[0.06em] uppercase mt-1">
              Pro · full year
            </p>
          </div>
          <div className="text-on-surface-variant text-[28px] font-thin hidden md:block">vs</div>
          <div className="flex-shrink-0">
            <p className="font-extrabold text-[44px] leading-none tracking-[-0.04em] text-tertiary font-tabular">
              $12,500
            </p>
            <p className="font-jetbrains text-[10px] text-tertiary/50 tracking-[0.06em] uppercase mt-1">
              One missed contingency deadline
            </p>
          </div>
          <div className="flex-1 md:border-l md:border-outline-variant md:pl-8">
            <p className="text-[15px] leading-[24px] font-normal text-on-surface-variant">
              Pro costs less than one missed earnest money deposit. One untracked contractor draw can wipe{' '}
              <span className="text-on-surface font-semibold">$40,000</span> from your margin.
              This is the cheapest deal insurance you will ever buy.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Sub: Comparison table ─────────────────────────── */
function ComparisonTable() {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_CATEGORIES = 2;
  const visibleRows = expanded ? COMP_ROWS : COMP_ROWS.slice(0, PREVIEW_CATEGORIES);

  const Check = ({ yes, isPortfolio }: { yes: boolean; isPortfolio?: boolean }) => (
    yes ? (
      <span
        className={`material-symbols-outlined text-[18px] ${isPortfolio ? 'text-primary' : 'text-on-surface/70'}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        check_circle
      </span>
    ) : (
      <span className="material-symbols-outlined text-[18px] text-outline/25">remove</span>
    )
  );

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={stagger}
      className="max-w-5xl mx-auto px-6 lg:px-8 pb-16 hidden md:block"
    >
      <motion.div variants={fadeUp} className="text-center mb-10">
        <h3 className="text-[24px] md:text-[28px] font-bold tracking-[-0.02em] text-on-surface mb-2">
          Every feature, by phase.
        </h3>
        <p className="text-[14px] text-on-surface-variant">
          Organized around the REIL lifecycle — not a generic checklist.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="glass-panel rounded-xl overflow-hidden border border-outline-variant">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container/50">
              <th className="p-4 font-jetbrains text-[11px] uppercase tracking-[0.06em] text-on-surface-variant/50 w-[40%]">
                Feature
              </th>
              <th className="p-4 text-center font-semibold text-[12px] text-on-surface-variant w-[15%]">Starter</th>
              <th className="p-4 text-center font-bold text-[12px] text-primary w-[15%]">Pro</th>
              <th className="p-4 text-center font-semibold text-[12px] text-on-surface-variant w-[15%]">Portfolio</th>
              <th className="p-4 text-center font-semibold text-[12px] text-on-surface-variant w-[15%]">Institutional</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((section) => (
              <>
                <tr key={`cat-${section.category}`} className="bg-surface-container-low/30">
                  <td colSpan={5} className="px-4 py-2.5">
                    <span className="font-jetbrains text-[10px] uppercase tracking-[0.08em] text-primary/60">
                      {section.category}
                    </span>
                  </td>
                </tr>
                {section.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-outline-variant/40 hover:bg-on-surface/5 transition-colors">
                    <td className="p-4 text-[13px] text-on-surface">{row.label}</td>
                    <td className="p-4 text-center"><Check yes={row.starter} /></td>
                    <td className="p-4 text-center bg-primary/3"><Check yes={row.pro} isPortfolio /></td>
                    <td className="p-4 text-center"><Check yes={row.portfolio} /></td>
                    <td className="p-4 text-center"><Check yes={row.inst} /></td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>

        <div className="p-4 border-t border-outline-variant text-center bg-surface-container/20">
          <button
            onClick={() => setExpanded(!expanded)}
            className="pw-interactive-custom font-jetbrains text-[11px] text-primary hover:text-white
              transition-colors flex items-center justify-center gap-2 mx-auto uppercase tracking-[0.06em]"
          >
            {expanded ? 'Show fewer' : `See all ${COMP_ROWS.length} categories (${COMP_ROWS.reduce((a, c) => a + c.rows.length, 0)} features)`}
            <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Sub: Testimonials ─────────────────────────────── */
function Testimonials() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={stagger}
      className="max-w-6xl mx-auto px-6 lg:px-8 py-16"
    >
      <motion.p variants={fadeUp} className="text-center font-jetbrains text-[10px] uppercase tracking-[0.12em] text-primary/50 mb-10">
        What investors are saying
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            className="glass-card rounded-xl p-7 flex flex-col hover:-translate-y-1 transition-transform duration-300"
          >
            <Quote className="w-6 h-6 text-primary/30 mb-5 flex-shrink-0" />
            <p className="text-[13px] leading-[22px] text-on-surface italic flex-grow mb-6">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div>
              <p className="text-[13px] font-semibold text-on-surface">{t.author}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">{t.role}</p>
              <div className="flex gap-0.5 mt-3">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} className="w-3 h-3 text-primary fill-primary" />
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Sub: FAQ ───────────────────────────────────────── */
function PricingFAQ() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={stagger}
      className="max-w-3xl mx-auto px-6 lg:px-8 pb-20"
    >
      <motion.div variants={fadeUp} className="text-center mb-12">
        <p className="font-jetbrains text-[10px] uppercase tracking-[0.12em] text-primary/50 mb-4">Before you commit</p>
        <h3 className="text-[24px] md:text-[28px] font-bold tracking-[-0.02em] text-on-surface">
          Straight answers.
        </h3>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-3">
        {FAQ.map((item, i) => (
          <details
            key={i}
            className="glass-panel rounded-xl border border-outline-variant group overflow-hidden"
          >
            <summary className="pw-interactive-custom flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none text-[14px] font-semibold text-on-surface tracking-[-0.01em] hover:text-primary transition-colors duration-200">
              <span>{item.q}</span>
              <span
                className="material-symbols-outlined flex-shrink-0 text-[20px] text-primary/50 transition-transform duration-200 group-open:rotate-45"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                add
              </span>
            </summary>
            <div className="px-6 pb-6">
              <div className="border-t border-outline-variant pt-5">
                <p className="text-[13px] leading-[23px] text-on-surface-variant">{item.a}</p>
              </div>
            </div>
          </details>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ─── Sub: Bottom CTA ───────────────────────────────── */
function BottomCTA() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={fadeUp}
      className="max-w-4xl mx-auto px-6 lg:px-8 pb-20"
    >
      <div className="glass-card rounded-2xl p-12 md:p-16 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-primary/6 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-[26px] md:text-[38px] font-extrabold tracking-[-0.035em] text-on-surface mb-5 leading-tight">
            You&apos;re closing deals worth more<br className="hidden md:block" /> than this software costs.
          </h2>
          <p className="text-[15px] md:text-[17px] leading-[26px] text-on-surface-variant max-w-xl mx-auto mb-9">
            Start tracking them properly. Every document, dollar, and deadline — from acquisition to exit.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="luminous-button px-8 py-4 rounded-lg font-semibold text-[14px] tracking-[0.01em]
                inline-flex items-center justify-center gap-2 group"
            >
              Start 14 Day Trial
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
            <Link
              href="/how-it-works"
              className="pw-interactive-custom px-8 py-4 rounded-lg font-semibold text-[14px]
                text-on-surface-variant hover:text-on-surface transition-colors inline-flex items-center justify-center"
            >
              See how it works
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-7">
            {['14-day free trial', 'Cancel anytime', 'Data exports in one click', 'No setup fees'].map((s) => (
              <span key={s} className="flex items-center gap-1.5 font-jetbrains text-[10px] text-on-surface-variant/40 tracking-[0.04em] uppercase">
                <span
                  className="material-symbols-outlined text-[12px] text-primary/40"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main export
   ═══════════════════════════════════════════════════════ */
export default function PricingSection({ onSelectPlan }: { onSelectPlan?: (plan: string) => void }) {
  const [isAnnual, setIsAnnual] = useState(true);    // annual-first default

  const handleSelect = (key: string) => onSelectPlan?.(key);

  return (
    <section id="pricing" className="scroll-mt-20 bg-background text-on-surface relative overflow-hidden">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/4 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10">

        {/* ── Hero + Toggle ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="max-w-3xl mx-auto px-6 lg:px-8 pt-20 pb-12 text-center"
        >
          <motion.p variants={fadeUp} className="font-jetbrains text-[10px] uppercase tracking-[0.12em] text-primary/50 mb-6">
            Pricing
          </motion.p>

          <motion.h2 variants={fadeUp} className="text-[32px] md:text-[48px] font-extrabold tracking-[-0.035em] text-on-surface leading-tight mb-5">
            Software that costs less than<br className="hidden md:block" />{' '}
            <span className="text-primary luminous-text">one missed deadline.</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-[16px] md:text-[18px] leading-[27px] text-on-surface-variant mb-10 max-w-2xl mx-auto">
            Your next contingency window is worth $12,500 in earnest money if you blow it.
            PaperWorking Pro is $39 a month — billed annually.
          </motion.p>

          <motion.div variants={fadeUp}>
            <BillingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
          </motion.div>
        </motion.div>

        {/* ── 4-Tier Pricing Cards ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="max-w-7xl mx-auto px-6 lg:px-8 pb-10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
            {PLANS.map((plan) => (
              <PricingCard key={plan.id} plan={plan} isAnnual={isAnnual} onSelect={handleSelect} />
            ))}
          </div>
        </motion.div>

        {/* ── ROI Callout Strip ── */}
        <ROICallout />

        {/* ── Feature Comparison Table ── */}
        <ComparisonTable />

        {/* ── Testimonials ── */}
        <Testimonials />

        {/* ── FAQ ── */}
        <PricingFAQ />

        {/* ── Bottom CTA ── */}
        <BottomCTA />

      </div>
    </section>
  );
}
