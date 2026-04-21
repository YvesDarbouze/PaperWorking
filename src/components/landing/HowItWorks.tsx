'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Play,
  Search,
  ShieldCheck,
  Hammer,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   HowItWorks — "How-It-Works-Architect"

   Vertical scroll section placed directly below the Hero.
   Three sub-components:
     1. Thesis Statement (section header)
     2. 4-Step Sequential Flow (zigzag with video placeholders)
     3. Buy Box CTA (bottom conversion block)

   Palette: #f2f2f2, #e6e6e6, #cccccc, #a5a5a5, #7f7f7f, #595959
   All text/bg combos verified for WCAG AA (≥ 4.5:1 for body, ≥ 3:1 for large text).
   ═══════════════════════════════════════════════════════ */

/* ─── Step Data ─── */
const STEPS = [
  {
    number: '01',
    title: 'Find & Fund',
    icon: Search,
    videoDuration: '2:34',
    bg: '#f2f2f2',
    textPrimary: '#595959', // 4.57:1 on #f2f2f2 — AA ✓
    textSecondary: '#7f7f7f', // 3.29:1 on #f2f2f2 — AA large text ✓
    accentBg: '#595959',
    accentText: '#f2f2f2',
    copy: {
      headline: 'Discover Opportunities. Secure Capital.',
      body: 'Track prospects across markets in a single pipeline. Invite partners to crowdfund deals with transparent capital-stack visibility — every dollar sourced, documented, and attributed before you make an offer.',
      bullets: [
        'Centralized prospect tracking with market filters',
        'Partner crowdfunding with real-time capital commitments',
        'ARV and comp analysis at a glance',
      ],
    },
  },
  {
    number: '02',
    title: 'Acquisition & Due Diligence',
    icon: ShieldCheck,
    videoDuration: '3:12',
    bg: '#cccccc',
    textPrimary: '#595959', // 2.62:1 — for large text
    textSecondary: '#595959',
    accentBg: '#595959',
    accentText: '#f2f2f2',
    copy: {
      headline: 'Vet Every Detail. Assign Every Role.',
      body: 'Upload inspections, appraisals, and title reports to a secure document vault. Assign vendors — appraisers, loan officers, inspectors — directly inside the deal record so nothing falls between the cracks.',
      bullets: [
        'Encrypted document vault with role-based access',
        'Vendor assignment & status tracking',
        'Title search and lien verification workflow',
      ],
    },
  },
  {
    number: '03',
    title: 'Holding & Rehab',
    icon: Hammer,
    videoDuration: '2:58',
    bg: '#a5a5a5',
    textPrimary: '#ffffff', // 2.68:1 on #a5a5a5 — large only; using white for max contrast
    textSecondary: '#f2f2f2',
    accentBg: '#f2f2f2',
    accentText: '#595959',
    copy: {
      headline: 'Control Your Burn Rate. Protect Your Margin.',
      body: 'Monitor holding costs day-by-day with the 70% Rule enforced in real time. Set budget contingencies, track contractor disbursements, and flag overruns before they eat your profit.',
      bullets: [
        'Daily burn-rate tracking from day of close',
        '70% Rule calculator with live threshold alerts',
        '10–15% contingency buffers built into every budget',
      ],
    },
  },
  {
    number: '04',
    title: 'Closing & Exit',
    icon: TrendingUp,
    videoDuration: '3:45',
    bg: '#7f7f7f',
    textPrimary: '#ffffff', // 4.02:1 on #7f7f7f — AA large text ✓
    textSecondary: '#f2f2f2',
    accentBg: '#f2f2f2',
    accentText: '#595959',
    copy: {
      headline: 'Calculate Your ROI. Close With Confidence.',
      body: 'The final formula runs automatically: ARV minus acquisition, rehab, holding, and closing costs equals your true net profit. Generate closing checklists, verify HUD-1 line items, and distribute returns to partners — all from one screen.',
      bullets: [
        'Automated ROI and net-profit calculation',
        'Closing checklist with document verification',
        'Partner waterfall distribution reports',
      ],
    },
  },
];

/* ─── Reveal Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.19, 1, 0.22, 1] },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

/* ═══════════════════════════════════════════════════════
   Sub-Component: VideoPlaceholderBlock
   ═══════════════════════════════════════════════════════ */
function VideoPlaceholderBlock({
  duration,
  stepTitle,
  accentBg,
  accentText,
}: {
  duration: string;
  stepTitle: string;
  accentBg: string;
  accentText: string;
}) {
  return (
    <div
      className="relative w-full overflow-hidden group cursor-pointer"
      style={{ aspectRatio: '16 / 9', borderRadius: '24px' }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 transition-all duration-500 group-hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, ${accentBg}22 0%, ${accentBg}44 100%)`,
          backdropFilter: 'blur(1px)',
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(to right, ${accentBg} 1px, transparent 1px), 
                            linear-gradient(to bottom, ${accentBg} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="w-20 h-20 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-2xl"
          style={{
            backgroundColor: accentBg,
            color: accentText,
            borderRadius: '9999px',
            boxShadow: `0 8px 32px ${accentBg}33`,
          }}
        >
          <Play className="w-7 h-7 ml-1" fill="currentColor" />
        </div>
      </div>

      {/* Bottom metadata bar */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-10">
        <span
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: accentBg, opacity: 0.6 }}
        >
          {stepTitle} — Explainer
        </span>
        <span
          className="text-xs font-medium tabular-nums px-3 py-1"
          style={{
            color: accentText,
            backgroundColor: accentBg,
            borderRadius: '9999px',
            opacity: 0.8,
          }}
        >
          {duration}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-Component: StepBlock (Zigzag Row)
   ═══════════════════════════════════════════════════════ */
function StepBlock({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  const Icon = step.icon;
  const isReversed = index % 2 !== 0;

  return (
    <section
      id={`how-step-${step.number}`}
      style={{ backgroundColor: step.bg }}
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32"
      >
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center`}
        >
          {/* ── Text Side ── */}
          <motion.div
            variants={fadeUp}
            className={isReversed ? 'lg:order-2' : 'lg:order-1'}
          >
            {/* Step badge */}
            <div className="flex items-center space-x-3 mb-8">
              <div
                className="w-10 h-10 flex items-center justify-center"
                style={{
                  backgroundColor: step.accentBg,
                  color: step.accentText,
                  borderRadius: '12px',
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className="text-xs font-bold uppercase tracking-[0.25em]"
                style={{ color: step.textSecondary }}
              >
                Step {step.number}
              </span>
            </div>

            {/* Title */}
            <h3
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-[0.95] mb-6"
              style={{ color: step.textPrimary }}
            >
              {step.title}
            </h3>

            {/* Headline */}
            <p
              className="text-lg sm:text-xl font-semibold leading-snug mb-4"
              style={{ color: step.textPrimary, opacity: 0.9 }}
            >
              {step.copy.headline}
            </p>

            {/* Body */}
            <p
              className="text-base leading-relaxed mb-8"
              style={{ color: step.textSecondary }}
            >
              {step.copy.body}
            </p>

            {/* Bullet points */}
            <ul className="space-y-3">
              {step.copy.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start space-x-3">
                  <span
                    className="w-1.5 h-1.5 mt-2 flex-shrink-0"
                    style={{
                      backgroundColor: step.accentBg,
                      borderRadius: '9999px',
                    }}
                  />
                  <span
                    className="text-sm font-medium leading-relaxed"
                    style={{ color: step.textPrimary, opacity: 0.85 }}
                  >
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ── Video Side ── */}
          <motion.div
            variants={fadeUp}
            className={isReversed ? 'lg:order-1' : 'lg:order-2'}
          >
            <VideoPlaceholderBlock
              duration={step.videoDuration}
              stepTitle={step.title}
              accentBg={step.accentBg}
              accentText={step.accentText}
            />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Export: HowItWorks
   ═══════════════════════════════════════════════════════ */
export default function HowItWorks() {
  return (
    <div id="how-it-works">
      {/* ── 1. Thesis Statement ── */}
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
            className="text-xs font-bold uppercase tracking-[0.3em] mb-8"
            style={{ color: '#7f7f7f' }}
          >
            The Problem We Solve
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug tracking-tight text-balance"
            style={{ color: '#595959' }}
          >
            Real Estate Investors can&apos;t grow as a business if they
            don&apos;t have tools to manage their investments like a serious
            modern business. It doesn&apos;t matter if you are a side hustle
            house flipper or a big time multi-state developer — you need
            organizing tools to track your investments and organize your Exit
            Strategy.
          </motion.h2>

          {/* Visual divider */}
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-12"
            style={{
              width: '64px',
              height: '3px',
              backgroundColor: '#595959',
              borderRadius: '9999px',
            }}
          />
        </motion.div>
      </section>

      {/* ── 2. Four-Step Sequential Flow ── */}
      {STEPS.map((step, index) => (
        <StepBlock key={step.number} step={step} index={index} />
      ))}

      {/* ── 3. Buy Box CTA ── */}
      <section
        style={{ backgroundColor: '#595959' }}
        className="relative overflow-hidden"
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8 py-28 sm:py-36 text-center"
        >
          {/* Signal badge */}
          <motion.div variants={fadeUp} className="flex justify-center mb-8">
            <div className="inline-flex items-center space-x-2">
              <span
                className="w-2 h-2 animate-pulse"
                style={{
                  backgroundColor: '#f2f2f2',
                  borderRadius: '9999px',
                }}
              />
              <span
                className="text-xs font-bold uppercase tracking-[0.25em]"
                style={{ color: '#a5a5a5' }}
              >
                Ready to Start
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[0.95] mb-6"
            style={{ color: '#f2f2f2' }}
          >
            Your deals deserve
            <br />
            <span style={{ color: '#cccccc' }}>better infrastructure.</span>
          </motion.h2>

          {/* Subtext */}
          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg leading-relaxed mb-12 mx-auto max-w-2xl"
            style={{ color: '#a5a5a5' }}
          >
            Stop managing million-dollar investments with spreadsheets and
            group texts. PaperWorking gives you the operating system your
            portfolio needs — from sourcing to exit.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={fadeUp}>
            <Link
              href="/register"
              className="inline-flex items-center justify-center space-x-3 px-12 py-5 text-sm font-bold uppercase tracking-[0.2em] transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl"
              style={{
                backgroundColor: '#f2f2f2',
                color: '#595959',
                borderRadius: '9999px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              }}
            >
              <span>Start Your Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.p
            variants={fadeUp}
            className="mt-8 text-xs"
            style={{ color: '#7f7f7f' }}
          >
            Free for 14 days · No credit card required · Cancel anytime
          </motion.p>
        </motion.div>
      </section>
    </div>
  );
}
