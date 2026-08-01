'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════
   PricingSection — Verbatim Approved COPY-P for /pricing
   Annual-Only Pricing ($499/yr, $999/yr, $390/yr)
   antigravity.google design system: medium-weight (500-600) display,
   pill CTAs, 24px card radii, 6-9rem section padding.
   ═══════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

interface Plan {
  id: string;
  stripeKey: string;
  name: string;
  badge?: string;
  tagline: string;
  annualPrice: number;
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
    annualPrice: 499,
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
    annualPrice: 999,
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
    annualPrice: 390,
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

const FAQ = [
  {
    q: 'I only close three or four deals a year. Is this worth it?',
    a: "Low volume makes each deal matter more, not less. When one deal carries your year's returns, an expired contingency or a rehab that drifts over budget hurts. Run one live deal through the trial and decide.",
  },
  {
    q: 'Is there a free trial? What happens to my data if I cancel?',
    a: 'Every paid plan includes a 14-day trial. A card is required to start, but nothing is charged until day 15. If you cancel, you keep read access for 90 days and can export everything, including your full P&L, as CSV. Your data is yours.',
  },
  {
    q: 'Can I add my CPA or business partner?',
    a: 'On Investment Team, invite them with role permissions; your CPA can read everything and edit nothing. Investor is a solo plan; your CPA still gets the one-click P&L export.',
  },
  {
    q: 'Is there a contract or minimum commitment?',
    a: 'No contracts, no minimums. Cancel anytime from Settings — no call, no retention flow. Annual plans bill once a year and include a 30-day refund window; monthly plans, if offered, bill month to month.',
  },
  {
    q: 'My spreadsheet system works. Why switch?',
    a: "Spreadsheets don't know when your earnest money goes hard. They don't alert you three days before your inspection period ends, tie draws to a line-item budget, or hand your CPA one organized export at year end. Run one deal in parallel and compare. If it doesn't catch something or save you time, cancel; the trial costs you nothing.",
  },
  {
    q: 'Does PaperWorking replace my accounting software?',
    a: 'No. It tracks project-level costs, budgets, and performance, and exports clean reports your accountant can use — alongside your accounting stack, not instead of it.',
  },
  {
    q: 'How is my data protected?',
    a: 'Encrypted storage, redundant backups, and SOC 2-ready infrastructure.',
  },
];

export default function PricingSection({ onSelectPlan }: { onSelectPlan?: (plan: string) => void }) {
  const handleSelect = (stripeKey: string) => {
    onSelectPlan?.(`${stripeKey} Annual`);
  };

  return (
    <section id="pricing" className="scroll-mt-20 bg-background text-on-surface relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/4 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10">
        {/* ── Hero (COPY-P1) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="max-w-4xl mx-auto px-6 lg:px-8 pt-24 pb-16 text-center"
        >
          <motion.p variants={fadeUp} className="font-jetbrains text-[10px] uppercase tracking-[0.12em] text-primary mb-4 type-eyebrow font-medium">
            Real Estate Bloomberg Terminal
          </motion.p>

          {/* Headline — COPY-P1 with Fix E4 (medium-weight 500-600, tight tracking) */}
          <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-semibold tracking-[-0.025em] text-on-surface leading-[1.05] mb-6 max-w-3xl mx-auto type-display">
            The average stock trade is $5000, the average Real Estate deal is $429,000. Why do stock investors have better fintech apps?
          </motion.h1>

          <motion.p variants={fadeUp} className="text-base sm:text-lg leading-[1.65] text-on-surface-variant max-w-3xl mx-auto mb-4 type-body-lg">
            PaperWorking is the Bloomberg Terminal for serious Real Estate Investors. For people who understand the advantage sober data gives them.
          </motion.p>

          <motion.p variants={fadeUp} className="text-base sm:text-lg leading-[1.65] text-on-surface-variant max-w-3xl mx-auto mb-4 type-body-lg">
            Deals go wrong expensively. A date slips, a draw goes untracked, and the spreadsheet finds out weeks later. PaperWorking exists to surface those problems early. Every plan includes the full four-phase lifecycle, the 33 investor KPIs, and a 14-day trial with no charge until day 15.
          </motion.p>

          <motion.p variants={fadeUp} className="text-base sm:text-lg leading-[1.65] text-on-surface-variant max-w-3xl mx-auto type-body-lg">
            Billed annually. Cancel anytime from Settings, no call required; annual plans include a 30-day refund window.
          </motion.p>
        </motion.div>

        {/* ── 3-Tier Plan Cards (COPY-P2, COPY-P3, COPY-P4) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="max-w-[1200px] mx-auto px-6 lg:px-8 pb-16"
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

                {/* Price (Annual Only) */}
                <div className="py-5 border-b border-white/8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-on-surface tracking-tight type-metric">
                      ${plan.annualPrice}
                    </span>
                    <span className="text-base text-on-surface-variant font-medium type-body">
                      /year,
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant/70 mt-1 type-caption font-semibold">
                    billed annually.
                  </p>
                </div>

                {/* CTA & Microcopy */}
                <div className="py-5">
                  <button
                    type="button"
                    onClick={() => handleSelect(plan.stripeKey)}
                    className={`w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer type-cta ${
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

          {/* ── Single Integrations Line (directly under plan cards) ── */}
          <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="font-jetbrains text-[13px] text-on-surface-variant/80 uppercase tracking-widest type-caption font-medium">
              Integrates with the tools you already use: Plaid, MLS, DocuSign, Stripe, RentCast.
            </p>
          </div>
        </motion.div>

        {/* ── What does one missed deadline cost? (COPY-P5) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="max-w-4xl mx-auto px-6 lg:px-8 py-20 border-t border-white/5"
        >
          <div className="glass-card rounded-[24px] p-8 sm:p-12 border border-white/10 bg-surface-container-low/20">
            <h2 className="text-2xl sm:text-3xl font-semibold text-on-surface mb-4 leading-tight type-h2">
              What does one missed deadline cost?
            </h2>
            <p className="text-base sm:text-lg text-on-surface-variant leading-[1.65] type-body">
              A blown contingency window can put a five-figure earnest money deposit at risk — more than two years of an Investor plan. An untracked contractor draw can move tens of thousands off your margin before a spreadsheet shows it. PaperWorking won&apos;t catch every problem. It shows you the variance while you can still act.
            </p>
          </div>
        </motion.div>

        {/* ── FAQ (COPY-P6) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="max-w-4xl mx-auto px-6 lg:px-8 py-20 border-t border-white/5"
        >
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold text-on-surface mb-2 type-h2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {FAQ.map((item, i) => (
              <div key={i} className="glass-card rounded-[20px] p-6 sm:p-7 border border-white/8 bg-surface-container-low/20">
                <h3 className="text-lg font-semibold text-on-surface mb-3 leading-snug type-h3">
                  {item.q}
                </h3>
                <p className="text-base text-on-surface-variant leading-[1.65] type-body">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Final CTA (COPY-P7) ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="max-w-4xl mx-auto px-6 lg:px-8 py-24 border-t border-white/5"
        >
          <div className="glass-card rounded-[28px] p-8 sm:p-14 text-center relative overflow-hidden bg-surface-container-low/30 border border-white/10">
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
                  className="luminous-button px-8 py-4 rounded-full text-[15px] font-semibold tracking-wide inline-flex items-center gap-2.5 type-cta"
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
