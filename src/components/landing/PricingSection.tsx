'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/Switch';

/* ═══════════════════════════════════════════════════════
   PricingSection — Behavioral-Economics Redesign

   Psychology applied (price-psychology-strategist +
   copywriting-psychologist skills):
   ─ Annual default ON → shows savings immediately
   ─ 3-tier good-better-best + institutional anchor banner
   ─ ROI reframe: cost < one missed deadline ($12,500)
   ─ Loss-framing CTAs, not generic "Get Started"
   ─ Feature list headers tied to investor outcomes
   ─ Comparison table organized by REIL phase
   ─ ROI callout strip between cards and table
   ─ 2-Column static Q&A FAQ (real objections)
   ─ Core benefits strip before final CTA
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
    id: 'individual',
    stripeKey: 'Investor',
    name: 'Investor',
    tagline: 'Full pipeline visibility.',
    persona: 'Built for solo investors who want full pipeline visibility without a team subscription.',
    monthlyPrice: 59,
    annualPrice: 499,
    annualMonthly: 41,
    isFree: false,
    isCustom: false,
    highlighted: false,
    badge: undefined,
    features: [
      { label: 'Project Management of the REIL' },
      { label: 'Full metric visualization of REI data' },
      { label: 'Tax Reporting & ledger exports' },
      { label: 'Deal Analysis & OCR document upload' },
      { label: 'Crowdfund marketplace access' },
      { label: '1 user account (solo operator)' },
    ],
    cta: 'Start Investor Trial',
    ctaStyle: 'primary',
  },
  {
    id: 'team',
    stripeKey: 'Investment Team',
    name: 'Investment Team',
    tagline: 'Complete team coordination.',
    persona: 'For investor teams who need role-based access, shared workflows, and complete financial separation.',
    monthlyPrice: 99,
    annualPrice: 999,
    annualMonthly: 83,
    isFree: false,
    isCustom: false,
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { label: 'Allows 10 accounts working on one team' },
      { label: 'Assign & assume tasks via Lead Investor' },
      { label: 'Represent team as a company/corp in Marketplace' },
      { label: 'Role permissions: Admins, Editors, Viewers' },
      { label: 'Google Drive Provisioning' },
      { label: 'Escrow Integration & API Access' },
    ],
    cta: 'Start Team Trial',
    ctaStyle: 'outline',
  },
  {
    id: 'vendor',
    stripeKey: 'Vendor',
    name: 'Vendor',
    tagline: 'Join the partner marketplace.',
    persona: 'For professionals who want qualified investor leads in their service area.',
    monthlyPrice: 39,
    annualPrice: 390,
    annualMonthly: 32,
    isFree: false,
    isCustom: false,
    highlighted: false,
    features: [
      { label: 'Up to 5 active project pipelines' },
      { label: 'Full 4-Phase Lifecycle Kanban' },
      { label: 'Engine Room Ledger' },
      { label: 'Standard Financial Reports' },
      { label: 'Holding Cost Clock' },
    ],
    cta: 'Join the Marketplace',
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
interface CompRow { label: string; vendor: boolean; investor: boolean; team: boolean; inst: boolean; proOnly?: boolean }

const COMP_ROWS: { category: string; rows: CompRow[] }[] = [
  {
    category: 'Acquisition',
    rows: [
      { label: 'Deal Analyzer (IRR, Cap Rate, CoC)', vendor: true, investor: true, team: true, inst: true },
      { label: 'Active deal limit', vendor: true, investor: true, team: true, inst: true },
      { label: 'LP Syndication Pitch Builder', vendor: false, investor: false, team: true, inst: true },
      { label: 'Syndication Underwriter (debt sizing)', vendor: false, investor: false, team: true, inst: true },
    ],
  },
  {
    category: 'Closing',
    rows: [
      { label: 'Contingency Deadline Tracker', vendor: true, investor: true, team: true, inst: true },
      { label: 'Earnest Money Alerts', vendor: false, investor: true, team: true, inst: true },
      { label: 'Escrow Document Vault', vendor: true, investor: true, team: true, inst: true },
      { label: 'Automated Diligence Checklist', vendor: false, investor: true, team: true, inst: true },
    ],
  },
  {
    category: 'Hold / Rehab',
    rows: [
      { label: 'Budget vs. Actual — Real Time', vendor: true, investor: true, team: true, inst: true },
      { label: 'Contractor Draw Log', vendor: true, investor: true, team: true, inst: true },
      { label: 'Draw Submission Portal', vendor: false, investor: false, team: true, inst: true },
      { label: 'Milestone Approvals (GC Workflows)', vendor: false, investor: true, team: true, inst: true },
    ],
  },
  {
    category: 'Exit & Tax',
    rows: [
      { label: 'CPA-Ready P&L Export', vendor: true, investor: true, team: true, inst: true },
      { label: 'Closing Cost Tracker', vendor: true, investor: true, team: true, inst: true },
      { label: 'ROI Summary (actual vs. projected)', vendor: true, investor: true, team: true, inst: true },
      { label: 'White-Label Exit Reports (PDF)', vendor: false, investor: false, team: true, inst: true },
    ],
  },
  {
    category: 'Team & API',
    rows: [
      { label: 'Team Seats', vendor: false, investor: false, team: true, inst: true },
      { label: 'Read-Only LP / Partner Access', vendor: false, investor: true, team: true, inst: true },
      { label: 'REST API + Webhooks', vendor: false, investor: false, team: false, inst: true },
      { label: 'White-Label Dashboard', vendor: false, investor: false, team: false, inst: true },
    ],
  },
];

/* ─── FAQ ────────────────────────────────────────────── */
const FAQ = [
  {
    q: "I only close 3–4 deals a year. Can I justify $59/month?",
    a: "Yes. A single missed contingency window can cost you $12,500 in lost earnest money — more than two years of Investor. If one contractor draw goes untracked and you're $40k over budget at closing, that's the equivalent of 56 years of the annual plan. The question isn't whether $59 is worth it. The question is what your last deal's blown timeline actually cost you.",
  },
  {
    q: "Is there a free trial? What happens to my data if I cancel?",
    a: "Every paid plan includes a 14-day trial. Your card is required to start, but nothing is charged until day 15. If you cancel, you keep full read access to your deal data for 90 days and can export everything as a CSV — including your full P&L — at any time. We don't hold your data hostage.",
  },
  {
    q: "Can I add my CPA or business partner as a user?",
    a: "On the Investment Team plan, you get full team member invites plus granular role-based data isolation — so you can invite passive investors, private lenders, or your CPA without them being able to edit anything. On Investor, you can invite 1 partner seat read-only and export a CPA-ready P&L in one click.",
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

/* ─── Sub: Pricing card ─────────────────────────────── */
function PricingCard({
  plan,
  isAnnual,
  onSelect,
}: {
  plan: Plan;
  isAnnual: boolean;
  onSelect: (key: string) => void;
}) {
  const displayPrice = isAnnual ? plan.annualMonthly : plan.monthlyPrice;

  const handleClick = () => {
    if (plan.isCustom || plan.isFree) return;
    onSelect(`${plan.stripeKey} ${isAnnual ? 'Annual' : 'Monthly'}`);
  };

  return (
    <motion.div
      variants={fadeUp}
      className={`glass-panel rounded-xl p-5 flex flex-col relative transition-all duration-300 h-full
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
        <h3 className={`text-[22px] font-bold tracking-[-0.02em] mb-1.5 ${plan.highlighted ? 'text-primary' : 'text-on-surface'}`}>
          {plan.name}
        </h3>
        <p className="text-[12px] font-normal text-on-surface-variant/70 leading-snug">{plan.persona}</p>
      </div>

      {/* Price — hero of the card, should be impossible to miss */}
      <div className="py-5 border-b border-outline-variant">
        {plan.isCustom ? (
          <div>
            <p className="text-[52px] font-black tracking-[-0.04em] leading-none text-on-surface">Custom</p>
            <p className="text-[12px] text-on-surface-variant/60 mt-2">Contact us for a quote</p>
          </div>
        ) : plan.isFree ? (
          <div>
            <p className="text-[52px] font-black tracking-[-0.04em] leading-none text-on-surface">Free</p>
            <p className="text-[12px] text-on-surface-variant/60 mt-2">1 active deal</p>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-1">
              <span className="text-[18px] font-semibold text-on-surface-variant/60 mt-3 leading-none">$</span>
              <span className={`font-black text-[64px] leading-none tracking-[-0.04em] font-tabular ${plan.highlighted ? 'text-primary' : 'text-on-surface'}`}>
                <AnimatedPrice value={displayPrice!} />
              </span>
              <span className="text-[13px] font-medium text-on-surface-variant/60 mt-3.5 leading-none">/mo</span>
            </div>
            <p className={`text-[12px] mt-1.5 ${plan.highlighted ? 'text-primary/60' : 'text-on-surface-variant/50'}`}>
              {isAnnual ? `Billed $${plan.annualPrice}/yr` : 'Billed monthly'}
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="pt-4">
        {plan.ctaStyle === 'contact' ? (
          <Link
            href="/contact"
            className="pw-interactive-custom block w-full text-center py-2.5 rounded-lg text-[13px] font-semibold
              border border-outline-variant text-on-surface hover:border-outline hover:text-primary
              transition-all duration-200"
          >
            {plan.cta}
          </Link>
        ) : plan.isFree ? (
          <Link
            href="/register"
            className="pw-interactive-custom block w-full text-center py-2.5 rounded-lg text-[13px] font-semibold
              border border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface
              transition-all duration-200"
          >
            {plan.cta}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className={`w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              plan.highlighted
                ? 'luminous-button hover:opacity-90'
                : 'border border-primary text-primary hover:bg-primary/8'
            }`}
          >
            {plan.cta}
          </button>
        )}
        <p className="text-[10px] font-normal text-on-surface-variant/40 text-center mt-1.5 font-jetbrains tracking-wide">
          {plan.isFree ? 'No time limit on free plan' : plan.isCustom ? 'Custom billing terms' : '14-day trial · No charge until day 15'}
        </p>
      </div>

      {/* Feature list */}
      <div className="pt-4 flex-grow">
        <p className="font-jetbrains text-[8px] uppercase tracking-[0.1em] text-on-surface-variant/40 mb-3">
          {plan.isFree ? 'Included' : 'Protects your margins with'}
        </p>
        <ul className="space-y-1.5">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`material-symbols-outlined text-[14px] flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-primary' : 'text-on-surface-variant/60'}`}
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
              >
                check_circle
              </span>
              <span className="text-[12px] leading-[18px] text-on-surface-variant">
                {f.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ─── Sub: Grayscale logo strip ──────────────────────── */
function IntegrationLogoStrip() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={fadeUp}
      className="max-w-5xl mx-auto px-6 lg:px-8 py-12 text-center"
    >
      <p className="font-jetbrains text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/40 mb-8">
        Integrates with your existing real estate stack
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40 hover:opacity-75 transition-all duration-300 grayscale contrast-120">
        {/* MLS Logo */}
        <div className="flex items-center gap-2 font-bold text-[18px] tracking-wider text-on-surface">
          <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>MLS</span>
        </div>

        {/* DocuSign Logo */}
        <div className="flex items-center gap-1.5 font-semibold text-[16px] text-on-surface">
          <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <span className="font-sans font-extrabold tracking-tight">DocuSign</span>
        </div>

        {/* Plaid Logo */}
        <div className="flex items-center gap-2 font-bold text-[17px] tracking-tight text-on-surface">
          <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
          <span className="font-sans font-black tracking-tighter">PLAID</span>
        </div>

        {/* Stripe Logo */}
        <div className="flex items-center gap-0.5 text-on-surface">
          <span className="font-sans font-black text-[22px] italic tracking-tighter">stripe</span>
        </div>

        {/* RentCast Logo */}
        <div className="flex items-center gap-2 font-semibold text-[16px] text-on-surface">
          <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
          <span className="font-sans font-bold tracking-tight">RentCast</span>
        </div>
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
        <h3 className="text-[24px] md:text-[28px] font-thin tracking-[-0.02em] text-on-surface mb-2 font-display-hero">
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
              <th className="p-4 text-center font-bold text-[12px] text-primary w-[15%]">Investor</th>
              <th className="p-4 text-center font-semibold text-[12px] text-on-surface-variant w-[15%]">Investment Team</th>
              <th className="p-4 text-center font-semibold text-[12px] text-on-surface-variant w-[15%]">Vendor</th>
              <th className="p-4 text-center font-semibold text-[12px] text-on-surface-variant w-[15%]">Institutional</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((section) => (
              <React.Fragment key={`cat-${section.category}`}>
                <tr className="bg-surface-container-low/30">
                  <td colSpan={5} className="px-4 py-2.5">
                    <span className="font-jetbrains text-[10px] uppercase tracking-[0.08em] text-primary/60">
                      {section.category}
                    </span>
                  </td>
                </tr>
                {section.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-outline-variant/40 hover:bg-on-surface/5 transition-colors">
                    <td className="p-4 text-[13px] text-on-surface">{row.label}</td>
                    <td className="p-4 text-center bg-primary/3"><Check yes={row.investor} isPortfolio /></td>
                    <td className="p-4 text-center"><Check yes={row.team} /></td>
                    <td className="p-4 text-center"><Check yes={row.vendor} /></td>
                    <td className="p-4 text-center"><Check yes={row.inst} /></td>
                  </tr>
                ))}
              </React.Fragment>
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

/* ─── Sub: FAQ ───────────────────────────────────────── */
function PricingFAQ() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={stagger}
      className="max-w-5xl mx-auto px-6 lg:px-8 pb-20"
    >
      <motion.div variants={fadeUp} className="text-center mb-12">
        <p className="font-jetbrains text-[10px] uppercase tracking-[0.12em] text-primary/50 mb-4">Before you commit</p>
        <h3 className="text-[24px] md:text-[28px] font-thin tracking-[-0.02em] text-on-surface font-display-hero">
          Straight answers.
        </h3>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-x-12">
        {FAQ.map((item, i) => (
          <div key={i} className="flex flex-col">
            <h4 className="text-[15px] font-semibold text-on-surface tracking-[-0.01em]">
              {item.q}
            </h4>
            <p className="text-[13px] leading-[22px] text-on-surface-variant mt-2.5">
              {item.a}
            </p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ─── Sub: Benefits Section ──────────────────────────── */
function BenefitsSection() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={stagger}
      className="max-w-5xl mx-auto px-6 lg:px-8 pb-20"
    >
      <div className="text-center mb-12">
        <h3 className="text-[24px] md:text-[28px] font-thin tracking-[-0.02em] text-on-surface font-display-hero">
          Try Us Once, Use PaperWorking Forever.
        </h3>
        <p className="text-[13px] text-on-surface-variant mt-2 max-w-lg mx-auto">
          We build for serious real estate investors. No lock-in, no complex integrations, just pure portfolio execution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Zero Complexity */}
        <motion.div
          variants={fadeUp}
          className="glass-panel border border-outline-variant rounded-xl p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="material-symbols-outlined text-[28px] text-primary mb-4" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
            bolt
          </span>
          <h4 className="text-[15px] font-bold text-on-surface mb-2">Zero Complexity</h4>
          <p className="text-[13px] leading-[22px] text-on-surface-variant">
            Out-of-the-box REIL templates and workflow automation built specifically for real estate acquisitions and exits.
          </p>
        </motion.div>

        {/* No Hidden Fees */}
        <motion.div
          variants={fadeUp}
          className="glass-panel border border-outline-variant rounded-xl p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="material-symbols-outlined text-[28px] text-primary mb-4" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
            payments
          </span>
          <h4 className="text-[15px] font-bold text-on-surface mb-2">No Hidden Fees</h4>
          <p className="text-[13px] leading-[22px] text-on-surface-variant">
            Flat-rate pricing based on active deals. Unlimited CPA reports, full document exports, and no seat tax on partners.
          </p>
        </motion.div>

        {/* Data Security */}
        <motion.div
          variants={fadeUp}
          className="glass-panel border border-outline-variant rounded-xl p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="material-symbols-outlined text-[28px] text-primary mb-4" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
            shield
          </span>
          <h4 className="text-[15px] font-bold text-on-surface mb-2">Data Security</h4>
          <p className="text-[13px] leading-[22px] text-on-surface-variant">
            Bank-grade data encryption, redundant cloud storage, and a robust SOC 2-ready compliance infrastructure.
          </p>
        </motion.div>
      </div>
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
          <h2 className="text-[26px] md:text-[38px] font-thin tracking-[-0.035em] text-on-surface mb-5 leading-tight font-display-hero">
            You&apos;re closing deals worth more<br className="hidden md:block" /> than this software costs.
          </h2>
          <p className="text-[15px] md:text-[17px] leading-[26px] text-on-surface-variant max-w-xl mx-auto mb-9">
            Start tracking them properly. Every document, dollar, and deadline — from acquisition to exit.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#pricing"
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
import * as React from 'react';

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

        {/* ── Hero ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="max-w-3xl mx-auto px-6 lg:px-8 pt-10 pb-6 text-center"
        >
          <motion.p variants={fadeUp} className="font-jetbrains text-[10px] uppercase tracking-[0.12em] text-primary/50 mb-3">
            Pricing
          </motion.p>

          <motion.h2 variants={fadeUp} className="text-[28px] md:text-[36px] font-thin tracking-[-0.035em] text-on-surface leading-tight mb-3 font-display-hero">
            Software that costs less than <span className="text-primary luminous-text font-thin">one missed deadline.</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-[13px] md:text-[14px] leading-relaxed text-on-surface-variant max-w-2xl mx-auto">
            Your next contingency window is worth $12,500 in earnest money. Start tracking properly.
          </motion.p>
        </motion.div>

        {/* ── Single billing toggle — one place, dead simple ── */}
        <div className="flex items-center justify-center gap-3 pb-8">
          <span className={`text-[13px] font-medium transition-colors duration-200 ${!isAnnual ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
            Monthly
          </span>
          <Switch
            checked={isAnnual}
            onChange={(e) => setIsAnnual(e.target.checked)}
            aria-label="Toggle annual billing"
          />
          <span className={`text-[13px] font-medium transition-colors duration-200 flex items-center gap-2 ${isAnnual ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
            Annual
            <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/12 text-primary px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          </span>
        </div>

        {/* ── 3-Tier Pricing Cards & Ratings Badge (Above the fold) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="max-w-7xl mx-auto px-6 lg:px-8 pb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 items-start">
            {PLANS.filter(p => p.id !== 'institutional').map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isAnnual={isAnnual}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Google Ratings at the bottom below the columns and above the fold */}
          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container/30 border border-outline-variant/50 backdrop-blur-sm shadow-sm">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span className="text-[12px] font-bold text-on-surface">Google</span>
              <div className="flex items-center gap-0.5 ml-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined text-[15px] text-[#00CE8E]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                  >
                    star
                  </span>
                ))}
              </div>
              <span className="text-[12px] font-semibold text-on-surface">4.9/5 rating</span>
              <span className="text-[11px] text-on-surface-variant/75 font-normal border-l border-outline-variant/60 pl-2 ml-1">(142 reviews)</span>
            </div>
          </motion.div>
        </motion.div>


        {/* ── Integration Logo Strip ── */}
        <IntegrationLogoStrip />

        {/* ── ROI Callout Strip ── */}
        <ROICallout />

        {/* ── Feature Comparison Table ── */}
        <ComparisonTable />

        {/* ── FAQ ── */}
        <PricingFAQ />

        {/* ── Benefits Section ── */}
        <BenefitsSection />

        {/* ── Bottom CTA ── */}
        <BottomCTA />

      </div>
    </section>
  );
}
