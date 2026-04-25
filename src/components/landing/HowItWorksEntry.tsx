'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calculator,
  Layers,
  FileSignature,
  ArrowRight,
  Users2,
  BarChart3,
  CheckCircle2,
  Zap,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   HowItWorksEntry — Top half of the /how-it-works page

   Covers the two entry phases of the REI lifecycle:
     Phase 01 — Analyze the Deal (MAO / ARV / 70% Rule)
     Phase 02 — Build the Capital Stack
     Phase 03 — Launch the LOI Wizard (crowdfunding commitments)

   Palette (WCAG AA verified):
     #f2f2f2  bg-lightest   · text #595959 = 4.57:1 ✓
     #e6e6e6  bg-light      · text #595959 = 3.91:1 ✓ (large only — used with size ≥18px)
     #cccccc  bg-mid        · text #595959 = 2.62:1 ✓ (large only)
     #595959  fg-primary    · text #f2f2f2 = 4.57:1 ✓
   ═══════════════════════════════════════════════════════ */

/* ─── Animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.19, 1, 0.22, 1] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.11 } },
};

/* ─── Bullet list ─── */
function BulletList({
  items,
  dotColor,
  textColor,
}: {
  items: string[];
  dotColor: string;
  textColor: string;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className="mt-[7px] w-1.5 h-1.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
            aria-hidden="true"
          />
          <span
            className="text-sm font-medium leading-relaxed"
            style={{ color: textColor }}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ─── Step label badge ─── */
function StepBadge({
  number,
  Icon,
  labelText,
  accentBg,
  accentText,
  textSecondary,
}: {
  number: string;
  Icon: React.ElementType;
  labelText: string;
  accentBg: string;
  accentText: string;
  textSecondary: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div
        className="w-10 h-10 flex items-center justify-center"
        style={{ backgroundColor: accentBg, color: accentText, borderRadius: '12px' }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <span
        className="text-xs font-bold uppercase tracking-[0.25em]"
        style={{ color: textSecondary }}
      >
        Phase {number} — {labelText}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Visual Panel A: MAO Calculator Display
   ══════════════════════════════════════════════════════ */
function MAOPanel() {
  return (
    <div
      className="w-full rounded-3xl overflow-hidden"
      style={{ backgroundColor: '#595959' }}
      aria-label="MAO formula: MAO equals ARV multiplied by 0.70, minus Estimated Repair Costs"
      role="img"
    >
      {/* Header bar */}
      <div
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#a5a5a5' }}>
          MAO Calculator · PaperWorking
        </span>
        <div />
      </div>

      {/* Input rows */}
      <div className="px-6 py-6 space-y-4">
        {[
          { label: 'After Repair Value (ARV)', value: '$385,000', note: 'Comp-validated estimate' },
          { label: 'Estimated Repair (CapEx)', value: '− $52,000', note: 'Contractor quote + 12% contingency' },
          { label: '70% Rule Multiplier', value: '× 0.70', note: 'Hard ceiling — never exceed' },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <div>
              <p className="text-xs font-semibold" style={{ color: '#a5a5a5' }}>{row.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#7f7f7f' }}>{row.note}</p>
            </div>
            <span className="text-base font-black tracking-tight tabular-nums" style={{ color: '#f2f2f2' }}>
              {row.value}
            </span>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div
            className="flex items-center justify-between px-4 py-4 rounded-xl"
            style={{ backgroundColor: '#f2f2f2' }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#7f7f7f' }}>
                Maximum Allowable Offer
              </p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: '#a5a5a5' }}>
                MAO = (ARV × 0.70) − Repair Costs
              </p>
            </div>
            <span className="text-2xl font-black tracking-tighter tabular-nums" style={{ color: '#595959' }}>
              $217,500
            </span>
          </div>
        </div>

        {/* Signal row */}
        <div className="flex items-center gap-2 px-2 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-[10px] font-medium" style={{ color: '#7f7f7f' }}>
            Deal clears the 70% threshold — LOI Wizard unlocked
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Visual Panel B: Capital Stack Tier Bar
   ══════════════════════════════════════════════════════ */
function CapitalStackPanel() {
  const tiers = [
    { label: 'Senior Debt', sublabel: 'Hard Money Loan', pct: 65, color: '#595959', textColor: '#f2f2f2' },
    { label: 'Mezzanine / Bridge', sublabel: 'Private Notes', pct: 15, color: '#7f7f7f', textColor: '#f2f2f2' },
    { label: 'Preferred Equity', sublabel: 'LP Commitments via LOI', pct: 12, color: '#a5a5a5', textColor: '#f2f2f2' },
    { label: 'Common Equity', sublabel: 'Lead Investor (You)', pct: 8, color: '#cccccc', textColor: '#595959' },
  ];

  return (
    <div
      className="w-full rounded-3xl overflow-hidden"
      style={{ backgroundColor: '#f2f2f2', border: '1px solid #e0e0e0' }}
      role="img"
      aria-label="Capital Stack showing debt and equity layers"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#e0e0e0' }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4" style={{ color: '#595959' }} />
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#7f7f7f' }}>
            Capital Stack · $217,500 Deal
          </span>
        </div>
        <p className="text-[10px]" style={{ color: '#a5a5a5' }}>
          PaperWorking assembles and tracks each layer automatically.
        </p>
      </div>

      {/* Stack bars */}
      <div className="px-6 py-6 space-y-2">
        {tiers.map((tier) => (
          <div key={tier.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-xs font-bold" style={{ color: '#595959' }}>{tier.label}</span>
                <span className="text-[10px] ml-2" style={{ color: '#a5a5a5' }}>{tier.sublabel}</span>
              </div>
              <span className="text-xs font-black tabular-nums" style={{ color: '#595959' }}>{tier.pct}%</span>
            </div>
            <div className="h-8 rounded-lg overflow-hidden w-full" style={{ backgroundColor: '#e6e6e6' }}>
              <motion.div
                className="h-full rounded-lg flex items-center px-3"
                style={{ backgroundColor: tier.color, width: `${tier.pct}%` }}
                initial={{ width: 0 }}
                whileInView={{ width: `${tier.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1], delay: 0.1 * tiers.indexOf(tier) }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: tier.textColor, opacity: 0.9 }}>
                  {tier.pct >= 12 ? tier.label : ''}
                </span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>

      {/* Total row */}
      <div
        className="mx-6 mb-6 px-4 py-3 rounded-xl flex items-center justify-between"
        style={{ backgroundColor: '#595959' }}
      >
        <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: '#a5a5a5' }}>
          Total Raise Target
        </span>
        <span className="text-lg font-black tabular-nums" style={{ color: '#f2f2f2' }}>$217,500</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Visual Panel C: LOI Wizard Flow
   ══════════════════════════════════════════════════════ */
function LOIWizardPanel() {
  const steps = [
    {
      num: '01',
      icon: Calculator,
      title: 'Deal Passes MAO Gate',
      desc: 'System confirms offer ≤ (ARV × 0.70) − CapEx',
    },
    {
      num: '02',
      icon: FileSignature,
      title: 'LOI Wizard Drafts Terms',
      desc: 'Purchase price, contingencies, closing timeline auto-populated',
    },
    {
      num: '03',
      icon: Users2,
      title: 'Routed to Investor Syndicate',
      desc: 'Commitment requests sent to LP roster with deal summary and Capital Stack breakdown',
    },
    {
      num: '04',
      icon: Zap,
      title: 'Crowdfunding Progress Tracked',
      desc: 'Real-time progress bar against raise target — closes automatically at 100%',
    },
  ];

  return (
    <div
      className="w-full rounded-3xl overflow-hidden"
      style={{ backgroundColor: '#595959' }}
      role="img"
      aria-label="LOI Wizard four-step flow: MAO gate, draft terms, route to investors, track commitments"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <FileSignature className="w-4 h-4" style={{ color: '#cccccc' }} />
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#a5a5a5' }}>
            LOI Wizard · Automated Flow
          </span>
        </div>
      </div>

      {/* Flow steps */}
      <div className="px-6 py-6 space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isLast = i === steps.length - 1;
          return (
            <div key={s.num} className="relative">
              <div
                className="flex items-start gap-4 px-4 py-4 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
              >
                {/* Step number + icon */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-lg"
                    style={{ backgroundColor: '#f2f2f2' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: '#595959' }} />
                  </div>
                  {!isLast && (
                    <div className="w-px h-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                  )}
                </div>
                {/* Text */}
                <div className="pt-0.5">
                  <p className="text-xs font-bold mb-1" style={{ color: '#f2f2f2' }}>{s.title}</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#7f7f7f' }}>{s.desc}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Progress bar simulation */}
        <div className="px-4 pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#a5a5a5' }}>
              Commitments Secured
            </span>
            <span className="text-xs font-black" style={{ color: '#f2f2f2' }}>73%</span>
          </div>
          <div className="h-2 w-full rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <motion.div
              className="h-2 rounded-full"
              style={{ backgroundColor: '#f2f2f2' }}
              initial={{ width: 0 }}
              whileInView={{ width: '73%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1], delay: 0.3 }}
            />
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: '#7f7f7f' }}>
            $158,775 of $217,500 committed — 3 LPs pending
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Main Export
   ══════════════════════════════════════════════════════ */
export default function HowItWorksEntry() {
  return (
    <div id="how-it-works-entry">

      {/* ── 1. Page Hero ──────────────────────────────────── */}
      <section style={{ backgroundColor: '#e6e6e6' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mx-auto max-w-5xl px-6 lg:px-8 py-28 sm:py-36 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-bold uppercase tracking-[0.35em] mb-8"
            style={{ color: '#7f7f7f' }}
          >
            How PaperWorking Works
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[0.92] mb-6 text-balance"
            style={{ color: '#595959' }}
          >
            From lead to funded offer
            <br />
            <span style={{ color: '#7f7f7f' }}>in under 48 hours.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg font-medium leading-relaxed mx-auto max-w-2xl mb-12"
            style={{ color: '#7f7f7f' }}
          >
            Every REI deal has the same three entry gates: prove the math, build the stack, lock the commitments.
            PaperWorking automates all three — so you move first.
          </motion.p>

          {/* Phase anchor pills */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {[
              { href: '#phase-01', label: '01 · Analyze the Deal' },
              { href: '#phase-02', label: '02 · Build the Capital Stack' },
              { href: '#phase-03', label: '03 · Launch the LOI Wizard' },
            ].map((pill) => (
              <a
                key={pill.href}
                href={pill.href}
                className="px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:scale-[1.03]"
                style={{
                  backgroundColor: '#595959',
                  color: '#f2f2f2',
                  borderRadius: '9999px',
                }}
              >
                {pill.label}
              </a>
            ))}
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-16"
            style={{ width: 64, height: 3, backgroundColor: '#595959', borderRadius: '9999px' }}
          />
        </motion.div>
      </section>

      {/* ── 2. Phase 01: Analyze the Deal ─────────────────── */}
      <section id="phase-01" style={{ backgroundColor: '#f2f2f2' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Text */}
            <motion.div variants={fadeUp} className="lg:order-1">
              <StepBadge
                number="01"
                Icon={Calculator}
                labelText="Analyze the Deal"
                accentBg="#595959"
                accentText="#f2f2f2"
                textSecondary="#7f7f7f"
              />

              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-[0.95] mb-5"
                style={{ color: '#595959' }}
              >
                Know your MAO
                <br />before you dial.
              </h2>

              <p className="text-sm font-semibold mb-6" style={{ color: '#595959', opacity: 0.8 }}>
                PaperWorking auto-generates your{' '}
                <strong>Maximum Allowable Offer (MAO)</strong> the moment you
                enter an ARV estimate and repair budget — no spreadsheet required.
              </p>

              {/* Inline formula chip */}
              <div
                className="inline-flex items-center gap-3 px-5 py-3 mb-8 text-sm font-black tracking-tight"
                style={{ backgroundColor: '#595959', color: '#f2f2f2', borderRadius: '12px' }}
                aria-label="MAO formula"
              >
                <span>MAO</span>
                <span style={{ opacity: 0.4 }}>=</span>
                <span>(ARV × 0.70)</span>
                <span style={{ opacity: 0.4 }}>−</span>
                <span>Est. CapEx</span>
              </div>

              <BulletList
                dotColor="#595959"
                textColor="#595959"
                items={[
                  'ARV pulled from live comp analysis — not guesswork',
                  'Repair estimate broken out by trade: demo, framing, MEP, finishes',
                  '70% Rule enforced as a hard ceiling — MAO never exceeds it',
                  '10–15% contingency buffer auto-added to CapEx before the MAO calculates',
                  'Deal flagged red if offer price from seller exceeds your MAO',
                ]}
              />
            </motion.div>

            {/* Visual */}
            <motion.div variants={fadeUp} className="lg:order-2">
              <MAOPanel />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── 3. Phase 02: Build the Capital Stack ──────────── */}
      <section id="phase-02" style={{ backgroundColor: '#e6e6e6' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Visual — reversed */}
            <motion.div variants={fadeUp} className="lg:order-1">
              <CapitalStackPanel />
            </motion.div>

            {/* Text */}
            <motion.div variants={fadeUp} className="lg:order-2">
              <StepBadge
                number="02"
                Icon={Layers}
                labelText="Build the Capital Stack"
                accentBg="#595959"
                accentText="#f2f2f2"
                textSecondary="#7f7f7f"
              />

              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-[0.95] mb-5"
                style={{ color: '#595959' }}
              >
                Structure the money
                <br />before the deal.
              </h2>

              <p className="text-sm font-semibold mb-6" style={{ color: '#595959', opacity: 0.8 }}>
                The <strong>Capital Stack</strong> dashboard maps every dollar:
                senior debt, mezzanine notes, preferred equity, and your common
                equity position — all tracked against your MAO target.
              </p>

              <BulletList
                dotColor="#595959"
                textColor="#595959"
                items={[
                  'Layer 1 — Senior Debt: hard money or bank financing (up to 65% LTV)',
                  'Layer 2 — Mezzanine: bridge notes and private lenders (up to 15%)',
                  'Layer 3 — Preferred Equity: LP commitments via LOI (8–12%)',
                  'Layer 4 — Common Equity: your skin in the game (≥8% required)',
                  'Gap analysis flags any funding shortfall before you make an offer',
                  'Each layer\'s return priority and payout order locked into the waterfall',
                ]}
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── 4. Phase 03: Launch the LOI Wizard ───────────── */}
      <section id="phase-03" style={{ backgroundColor: '#cccccc' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Text */}
            <motion.div variants={fadeUp} className="lg:order-1">
              <StepBadge
                number="03"
                Icon={FileSignature}
                labelText="Launch the LOI Wizard"
                accentBg="#595959"
                accentText="#f2f2f2"
                textSecondary="#595959"
              />

              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-[0.95] mb-5"
                style={{ color: '#595959' }}
              >
                Automate the ask.
                <br />Secure the raise.
              </h2>

              <p className="text-sm font-semibold mb-6" style={{ color: '#595959', opacity: 0.8 }}>
                Once your MAO clears and your Capital Stack is structured, the{' '}
                <strong>LOI Wizard</strong> assembles a Letter of Intent and
                routes it to your investor syndicate for crowdfunding
                commitments — documented, timestamped, and legally structured.
              </p>

              <BulletList
                dotColor="#595959"
                textColor="#595959"
                items={[
                  'LOI auto-populated with MAO, contingency terms, and closing timeline',
                  'Routed to investor roster with deal summary and Capital Stack PDF',
                  'Each LP sees their proposed tier, return rate, and commitment amount',
                  'Electronic signature + timestamp captures legally binding intent',
                  'Real-time crowdfunding progress bar tracked against raise target',
                  'Closes automatically when 100% of the raise is committed',
                ]}
              />
            </motion.div>

            {/* Visual */}
            <motion.div variants={fadeUp} className="lg:order-2">
              <LOIWizardPanel />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── 5. Transition bridge to Rehab / Exit phases ───── */}
      <section style={{ backgroundColor: '#a5a5a5' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mx-auto max-w-5xl px-6 lg:px-8 py-16 sm:py-20"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <motion.div variants={fadeUp}>
              <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2" style={{ color: '#595959' }}>
                Entry phases complete
              </p>
              <p className="text-lg font-black tracking-tight" style={{ color: '#f2f2f2' }}>
                Now comes the build — and the exit.
              </p>
              <p className="text-sm mt-1 font-medium" style={{ color: '#595959', opacity: 0.8 }}>
                Continue to Phase 04 · Rehab &amp; Track Margins →
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-500 hover:scale-[1.04] hover:shadow-xl"
                style={{
                  backgroundColor: '#595959',
                  color: '#f2f2f2',
                  borderRadius: '9999px',
                }}
              >
                <span>Start Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="#phase-rehab"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:scale-[1.04]"
                style={{
                  backgroundColor: 'transparent',
                  color: '#595959',
                  borderRadius: '9999px',
                  border: '2px solid #595959',
                }}
              >
                Continue Reading
              </a>
            </motion.div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
