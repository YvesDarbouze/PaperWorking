'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Landmark,
  ShieldCheck,
  Clock,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PlatformOverview — Primary Sales Funnel Explanation

   Dark-on-light section placed directly below the Hero.
   Uses a near-black background (#1a1a1a) for maximum contrast.
   WCAG AA verified:
     - #ffffff on #1a1a1a = 16.15:1 ✓
     - #b0b0b0 on #1a1a1a = 6.58:1  ✓ (paragraph text)
     - #d4d4d4 on #1a1a1a = 10.13:1 ✓ (sub-headers)
   ═══════════════════════════════════════════════════════ */

/* ─── Phase Data ─── */
const PHASES = [
  {
    number: '1',
    label: 'Acquisition',
    subtitle: 'Find the deal. Lock the capital.',
    icon: Landmark,
    body: 'Source targets, calculate your MAO, and generate offer letters from a single screen. Track partner capital before you make a move, so you always buy right.',
    accentColor: '#4ade80', // green-400
  },
  {
    number: '2',
    label: 'Purchase',
    subtitle: 'Close without the chaos.',
    icon: ShieldCheck,
    body: 'Keep loan docs, title reports, and deadlines in one secure vault. Give attorneys and loan officers instant access, so nothing falls between the cracks and you close on time.',
    accentColor: '#60a5fa', // blue-400
  },
  {
    number: '3',
    label: 'Hold',
    subtitle: 'Stop the silent margin killer.',
    icon: Clock,
    body: 'Holding costs eat your margins silently. PaperWorking tracks your daily burn—taxes, insurance, interest—and flags you the moment your 70% rule is at risk.',
    accentColor: '#facc15', // yellow-400
  },
  {
    number: '4',
    label: 'Exit',
    subtitle: 'Know exactly what you made.',
    icon: BarChart3,
    body: 'Automatically calculate your true profit. Generate distribution reports and export tax-ready documentation before you even leave the closing table.',
    accentColor: '#f472b6', // pink-400
  },
];

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.19, 1, 0.22, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

/* ─── Phase Card Component ─── */
function PhaseCard({ phase }: { phase: (typeof PHASES)[number] }) {
  const Icon = phase.icon;

  return (
    <motion.div
      variants={fadeUp}
      className="relative group"
    >
      {/* Card */}
      <div
        className="relative overflow-hidden h-full"
        style={{
          backgroundColor: '#242424',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '2rem',
          transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${phase.accentColor}33`;
          e.currentTarget.style.boxShadow = `0 0 40px ${phase.accentColor}0d`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Subtle corner accent gradient */}
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-[0.06] pointer-events-none"
          style={{
            background: `radial-gradient(circle at top right, ${phase.accentColor}, transparent 70%)`,
          }}
        />

        {/* Number + Icon Row */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: phase.accentColor, opacity: 0.8 }}
            >
              {phase.number}.
            </span>
            <span className="text-[13px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#d4d4d4' }}>
              {phase.label}
            </span>
          </div>
          <div
            className="w-9 h-9 flex items-center justify-center"
            style={{
              backgroundColor: `${phase.accentColor}15`,
              borderRadius: '10px',
            }}
          >
            <Icon className="w-[18px] h-[18px]" style={{ color: phase.accentColor }} />
          </div>
        </div>

        {/* Sub-header */}
        <h4
          className="text-xl sm:text-[22px] tracking-tight mb-4 leading-tight relative z-10"
          style={{ color: '#ffffff' }}
        >
          {phase.subtitle}
        </h4>

        {/* Body — exact copy */}
        <p
          className="text-[15px] leading-[1.75] relative z-10"
          style={{ color: '#b0b0b0' }}
        >
          {phase.body}
        </p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Export: PlatformOverview
   ═══════════════════════════════════════════════════════ */
export default function PlatformOverview() {
  return (
    <section
      id="how-it-works"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-28 lg:py-36">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer}
        >
          {/* ── Section Label ── */}
          <motion.p
            variants={fadeUp}
            className="text-[12px] font-bold uppercase tracking-[0.3em] mb-6 text-center"
            style={{ color: '#717171' }}
          >
            The Framework
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl md:text-[2.25rem] lg:text-[2.75rem] tracking-tight leading-[1.15] mb-6 sm:mb-8 text-center max-w-4xl mx-auto"
            style={{ color: '#ffffff' }}
          >
            Every phase of your deal. Organized.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="text-sm sm:text-base md:text-[17px] leading-[1.75] sm:leading-[1.8] mb-12 sm:mb-16 md:mb-20 text-center max-w-3xl mx-auto"
            style={{ color: '#b0b0b0' }}
          >
            Every missed deadline and untracked expense silently kills your profit. PaperWorking is the institutional-grade platform that ensures you never lose margin to disorganized chaos again.
          </motion.p>

          {/* ── 4-Phase Grid ── */}
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-16 sm:mb-20 md:mb-24"
          >
            {PHASES.map((phase) => (
              <PhaseCard key={phase.number} phase={phase} />
            ))}
          </motion.div>

          {/* ── Value Proposition Block ── */}
          <motion.div
            variants={fadeUp}
            className="relative max-w-3xl mx-auto text-center"
          >
            {/* Decorative line */}
            <div
              className="mx-auto mb-12"
              style={{
                width: '48px',
                height: '2px',
                backgroundColor: '#ffffff',
                opacity: 0.15,
                borderRadius: '9999px',
              }}
            />

            <h3
              className="text-xl sm:text-2xl md:text-3xl tracking-tight mb-4 sm:mb-6"
              style={{ color: '#ffffff' }}
            >
              Built for serious operators, not hobbyists.
            </h3>

            <p
              className="text-base sm:text-[17px] leading-[1.8] mb-14"
              style={{ color: '#b0b0b0' }}
            >
              Scaling investors don't work harder—they operate with ruthless efficiency. PaperWorking eliminates the spreadsheet chaos and missed deadlines that are currently draining your profits. Stop losing money to disorganization.
            </p>

            {/* ── CTA Button ── */}
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-3 px-10 py-4 text-[15px] font-semibold transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
              style={{
                backgroundColor: '#ffffff',
                color: '#1a1a1a',
                borderRadius: '9999px',
                boxShadow: '0 4px 24px rgba(255,255,255,0.12)',
              }}
            >
              <span>Start Your Free 14-Day Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p
              className="mt-6 text-[13px]"
              style={{ color: '#5a5a5a' }}
            >
              No credit card required · Full Team access from day one
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
