'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   HowItWorks — PaperWorking "How It Works" page

   Design principles applied:
   1. Clarity    — What is this? What can I do? What's next?
   2. Simplicity — One idea per full-screen step, no cognitive overload
   3. Usability  — Sticky progress nav, animated product previews,
                   anti-false-floor hero (85vh + visible step 01),
                   strategic mid-page CTA, mobile-first layout

   Sections:
   Hero (85vh)  →  Step 01–04 (min-h-screen each)  →  CTA (min-h-screen)
   ═══════════════════════════════════════════════════════ */

/* ─── Scroll-triggered visibility hook ──────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

/* ─── Animated product-preview cards ────────────────────── */

function DealAnalyzerCard({ inView }: { inView: boolean }) {
  const metrics = [
    { label: 'Purchase Price', value: '$485,000' },
    { label: 'After Repair Value', value: '$620,000' },
    { label: 'Rehab Budget', value: '$68,000' },
    { label: 'Cap Rate', value: '6.2%' },
  ];
  return (
    <div className="glass-card rounded-2xl overflow-hidden w-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div>
          <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Deal Analyzer</div>
          <div className="text-[13px] font-semibold text-on-surface">1247 Elm Street, Austin TX</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4">
        {metrics.map(({ label, value }, i) => (
          <div
            key={label}
            className="bg-surface-container-low/60 rounded-xl px-4 py-3"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              transitionDelay: inView ? `${i * 80}ms` : '0ms',
            }}
          >
            <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-1.5">{label}</div>
            <div className="text-[17px] font-bold text-on-surface">{value}</div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <div
          className="bg-primary/8 border border-primary/15 rounded-xl px-4 py-4"
          style={{
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.6s ease',
            transitionDelay: inView ? '340ms' : '0ms',
          }}
        >
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="font-jetbrains text-[9px] text-primary/50 uppercase tracking-widest mb-1">Projected IRR</div>
              <div className="text-[38px] font-extrabold text-primary luminous-text tracking-tighter leading-none">24.8%</div>
            </div>
            <div className="text-right">
              <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase mb-2">Confidence</div>
              <div className="font-jetbrains text-[16px] font-bold text-primary">84%</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{
                width: inView ? '84%' : '0%',
                transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: inView ? '500ms' : '0ms',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeadlineTrackerCard({ inView }: { inView: boolean }) {
  const rows = [
    { label: 'Inspection Period', date: 'Mar 19', status: 'done' as const },
    { label: 'Appraisal Contingency', date: 'Mar 26', status: 'warn' as const },
    { label: 'Financing Contingency', date: 'Apr 02', status: 'pending' as const },
    { label: 'Earnest Money Hard', date: 'Apr 09', status: 'pending' as const },
  ];
  return (
    <div className="glass-card rounded-2xl overflow-hidden w-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div>
          <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Deadline Tracker</div>
          <div className="text-[13px] font-semibold text-on-surface">Contract signed Mar 12, 2025</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-full border border-tertiary/20">
          <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          3 DAYS
        </span>
      </div>

      <div className="px-5 py-4 space-y-2">
        {rows.map(({ label, date, status }, i) => (
          <div
            key={label}
            className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl ${status === 'warn' ? 'bg-tertiary/6 border border-tertiary/15' : ''}`}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-16px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
              transitionDelay: inView ? `${i * 90}ms` : '0ms',
            }}
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              status === 'done' ? 'bg-primary/60' :
              status === 'warn' ? 'bg-tertiary animate-pulse' :
              'border-2 border-on-surface-variant/20'
            }`} />
            <span className={`flex-1 text-[13px] leading-tight ${
              status === 'done' ? 'line-through text-on-surface-variant/40' :
              status === 'warn' ? 'text-on-surface font-semibold' :
              'text-on-surface-variant'
            }`}>{label}</span>
            <span className={`font-jetbrains text-[11px] font-semibold ${
              status === 'done' ? 'text-primary/40' :
              status === 'warn' ? 'text-tertiary' :
              'text-on-surface-variant/35'
            }`}>{date}</span>
          </div>
        ))}
      </div>

      <div className="px-5 pb-5">
        <div
          className="bg-tertiary/6 border border-tertiary/15 rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease', transitionDelay: inView ? '440ms' : '0ms' }}
        >
          <span className="font-jetbrains text-[10px] text-on-surface-variant/40 uppercase tracking-widest">Earnest at risk</span>
          <span className="font-bold text-[16px] text-tertiary/80">$12,500</span>
        </div>
      </div>
    </div>
  );
}

function BudgetTrackerCard({ inView }: { inView: boolean }) {
  const lines = [
    { label: 'Demo & Framing', spent: 8200, budget: 8500, pct: 96 },
    { label: 'Electrical', spent: 6100, budget: 6000, pct: 102 },
    { label: 'HVAC', spent: 11200, budget: 11000, pct: 102 },
    { label: 'Flooring', spent: 0, budget: 12000, pct: 0 },
    { label: 'Kitchen & Bath', spent: 0, budget: 18000, pct: 0 },
  ];
  return (
    <div className="glass-card rounded-2xl overflow-hidden w-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div>
          <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Rehab Budget</div>
          <div className="text-[13px] font-semibold text-on-surface">Approved Budget: $68,000</div>
        </div>
        <span className="text-[10px] font-semibold text-tertiary/80 bg-tertiary/10 px-2.5 py-1 rounded-full border border-tertiary/20">
          +$1.9K OVER
        </span>
      </div>

      <div className="px-5 py-4 space-y-3.5">
        {lines.map(({ label, spent, budget, pct }, i) => (
          <div
            key={label}
            style={{
              opacity: inView ? 1 : 0,
              transition: 'opacity 0.4s ease',
              transitionDelay: inView ? `${i * 70}ms` : '0ms',
            }}
          >
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="text-on-surface-variant">{label}</span>
              <span className={`font-jetbrains text-[11px] font-semibold ${
                pct > 100 ? 'text-tertiary' : pct > 0 ? 'text-primary/70' : 'text-on-surface-variant/25'
              }`}>
                {spent > 0
                  ? `$${(spent / 1000).toFixed(1)}K / $${(budget / 1000).toFixed(0)}K`
                  : `$${(budget / 1000).toFixed(0)}K`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div
                className={`h-full rounded-full ${pct > 100 ? 'bg-tertiary/80' : pct > 0 ? 'bg-primary/60' : ''}`}
                style={{
                  width: inView ? `${Math.min(pct, 100)}%` : '0%',
                  transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
                  transitionDelay: inView ? `${i * 70 + 200}ms` : '0ms',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/8 px-5 py-3.5 flex justify-between items-center">
        <div>
          <div className="font-jetbrains text-[9px] text-on-surface-variant/30 uppercase mb-0.5">Spent to Date</div>
          <div className="text-[17px] font-bold text-on-surface">$25,500</div>
        </div>
        <div className="text-right">
          <div className="font-jetbrains text-[9px] text-on-surface-variant/30 uppercase mb-0.5">37.5% Complete</div>
          <div className="text-[14px] font-bold text-tertiary/80">$42,500 remaining</div>
        </div>
      </div>
    </div>
  );
}

function ExitSummaryCard({ inView }: { inView: boolean }) {
  const breakdown = [
    { label: 'Sale Price', value: '$618,000', muted: false },
    { label: 'Purchase Price', value: '($485,000)', muted: true },
    { label: 'Rehab Costs', value: '($72,100)', muted: true },
    { label: 'All Other Costs', value: '($12,100)', muted: true },
  ];
  return (
    <div className="glass-card rounded-2xl overflow-hidden w-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div>
          <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Exit Summary</div>
          <div className="text-[13px] font-semibold text-on-surface">1247 Elm Street, Austin TX</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
          <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          CLOSED
        </span>
      </div>

      <div
        className="px-5 py-6 text-center border-b border-white/8"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'scale(1)' : 'scale(0.94)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          transitionDelay: inView ? '80ms' : '0ms',
        }}
      >
        <div className="font-jetbrains text-[10px] text-on-surface-variant/40 uppercase tracking-widest mb-2">Net Profit</div>
        <div className="text-[48px] font-extrabold text-primary luminous-text tracking-tighter leading-none mb-1.5">$48,800</div>
        <div className="font-jetbrains text-[11px] text-on-surface-variant/40">10.1% ROI · 6-month hold</div>
      </div>

      <div className="px-5 py-4 space-y-2.5">
        {breakdown.map(({ label, value, muted }, i) => (
          <div
            key={label}
            className="flex justify-between text-[13px]"
            style={{
              opacity: inView ? 1 : 0,
              transition: 'opacity 0.4s ease',
              transitionDelay: inView ? `${320 + i * 55}ms` : '0ms',
            }}
          >
            <span className="text-on-surface-variant">{label}</span>
            <span className={`font-jetbrains font-semibold ${muted ? 'text-on-surface-variant/55' : 'text-on-surface'}`}>{value}</span>
          </div>
        ))}
      </div>

      <div
        className="px-5 pb-5"
        style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.4s ease', transitionDelay: inView ? '560ms' : '0ms' }}
      >
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/20 text-primary/70 text-[12px] font-semibold cursor-default hover:bg-primary/5 transition-colors">
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0" }}>download</span>
          <span className="font-jetbrains">Export CPA Report</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Types & data ───────────────────────────────────────── */

type StepColor = 'primary' | 'secondary' | 'tertiary' | 'outline';

type StepData = {
  id: string;
  num: string;
  phase: string;
  icon: string;
  headline: string;
  detail: string;
  bullets: Array<{ icon: string; label: string; detail: string }>;
  color: StepColor;
};

const STEP_COLORS: Record<StepColor, { text: string; badge: string; iconCls: string; bg: string }> = {
  primary:   { text: 'text-primary',   badge: 'text-primary border-primary/25 bg-primary/8',     iconCls: 'text-primary',   bg: 'bg-primary/10'   },
  secondary: { text: 'text-secondary', badge: 'text-secondary border-secondary/25 bg-secondary/8', iconCls: 'text-secondary', bg: 'bg-secondary/10' },
  tertiary:  { text: 'text-tertiary',  badge: 'text-tertiary border-tertiary/25 bg-tertiary/8',   iconCls: 'text-tertiary',  bg: 'bg-tertiary/10'  },
  outline:   { text: 'text-outline',   badge: 'text-outline border-outline/25 bg-outline/8',       iconCls: 'text-outline',   bg: 'bg-outline/10'   },
};

const STEPS: StepData[] = [
  {
    id: 'step-01',
    num: '01',
    phase: 'Acquisition',
    icon: 'search',
    headline: 'Run the numbers before you fall in love with the deal.',
    detail: "Every investor has made an offer on gut feeling. PaperWorking makes sure your gut is backed by real data — cap rate, cash-on-cash, and projected IRR — in the time it used to take just to find the spreadsheet.",
    bullets: [
      { icon: 'calculate', label: 'Underwrite in 15 minutes', detail: 'Live IRR, cap rate, and cash-on-cash from a single address entry' },
      { icon: 'storefront',  label: 'Deal Marketplace',        detail: 'Post your project to source capital, JV partners, or buyers' },
      { icon: 'verified',    label: 'Confidence scoring',      detail: 'Market-calibrated analysis so you know exactly what you\'re betting on' },
    ],
    color: 'primary',
  },
  {
    id: 'step-02',
    num: '02',
    phase: 'Closing',
    icon: 'gavel',
    headline: "Never blow a contingency. Not once.",
    detail: "Your inspection window, financing deadline, and earnest money date don't care about your inbox. PaperWorking watches every one and fires alerts before your deposit becomes non-refundable.",
    bullets: [
      { icon: 'schedule',             label: 'Live deadline timeline', detail: 'Every contingency tracked from contract signing to close' },
      { icon: 'notifications_active', label: 'Automated alerts',       detail: 'Get notified before money goes hard — not after' },
      { icon: 'checklist',            label: 'Diligence checklist',    detail: 'Title, inspection, and insurance status in one view' },
    ],
    color: 'secondary',
  },
  {
    id: 'step-03',
    num: '03',
    phase: 'Hold & Rehab',
    icon: 'construction',
    headline: 'Watch your margin in real time — not at the end.',
    detail: "By the time most investors reconcile contractor invoices, they're already $40K over budget. PaperWorking logs every draw the moment it's approved — so variance is a dashboard check, not a weekend project.",
    bullets: [
      { icon: 'bar_chart',    label: 'Budget vs. actual',    detail: 'Renovation costs tracked line by line as invoices arrive' },
      { icon: 'receipt_long', label: 'Contractor draw log',  detail: 'Approve draws per milestone — not per invoice stack' },
      { icon: 'task_alt',     label: 'Milestone sign-off',   detail: 'Verify completion before funds release to protect your margin' },
    ],
    color: 'tertiary',
  },
  {
    id: 'step-04',
    num: '04',
    phase: 'Exit',
    icon: 'trending_up',
    headline: 'Close the deal. Close the books.',
    detail: "Because costs were tracked as they happened, your CPA export is ready the day you close. Tax prep that used to take six weeks takes an afternoon — your accountant gets one organized file, not a folder of screenshots.",
    bullets: [
      { icon: 'receipt',      label: 'Closing cost tracker',     detail: 'Commissions, taxes, and seller credits — all captured' },
      { icon: 'insights',     label: 'Actual vs. projected ROI', detail: 'Real return calculated automatically at close' },
      { icon: 'table_chart',  label: 'One-click CPA export',     detail: 'Full P&L with cost basis organized by category' },
    ],
    color: 'outline',
  },
];

/* ─── Sticky step progress nav ───────────────────────────── */

function StepProgressNav({ activeStep, visible }: { activeStep: number; visible: boolean }) {
  return (
    <div
      aria-hidden
      className="fixed left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{
        top: 76,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      <nav className="pointer-events-auto glass-panel rounded-full border border-white/10 px-1.5 py-1 flex items-center gap-0.5">
        {STEPS.map((s, i) => {
          const active = activeStep === i;
          const done   = activeStep > i;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`no-underline px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                active ? 'bg-primary/15 text-primary border border-primary/20' :
                done   ? 'text-on-surface-variant/45' :
                         'text-on-surface-variant/30 hover:text-on-surface-variant/60'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                active ? 'bg-primary' : done ? 'bg-on-surface-variant/30' : 'bg-on-surface-variant/15'
              }`} />
              <span className="hidden sm:inline">{s.phase}</span>
              <span className="sm:hidden font-jetbrains">{s.num}</span>
            </a>
          );
        })}
        <a
          href="#step-cta"
          className={`no-underline px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5 ${
            activeStep >= STEPS.length
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-on-surface-variant/30 hover:text-on-surface-variant/60'
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          <span className="hidden sm:inline">Start Free Trial</span>
        </a>
      </nav>
    </div>
  );
}

/* ─── Individual step section ────────────────────────────── */

function StepSection({ step, stepIndex }: { step: StepData; stepIndex: number }) {
  const [sectionRef, inView] = useInView(0.12);
  const isEven = stepIndex % 2 === 0;
  const c = STEP_COLORS[step.color];

  const cardMap: Record<string, React.ReactNode> = {
    'step-01': <DealAnalyzerCard inView={inView} />,
    'step-02': <DeadlineTrackerCard inView={inView} />,
    'step-03': <BudgetTrackerCard inView={inView} />,
    'step-04': <ExitSummaryCard inView={inView} />,
  };

  return (
    <section
      id={step.id}
      ref={sectionRef}
      className="relative flex items-center min-h-screen px-5 md:px-8 py-24 lg:py-0 overflow-hidden scroll-mt-[72px]"
    >
      {/* Large background step number — Clarity: orients the user */}
      <div
        className={`absolute ${isEven ? 'right-[-1%]' : 'left-[-1%]'} top-1/2 -translate-y-1/2 font-bold select-none pointer-events-none ${c.text} tracking-tighter leading-none`}
        style={{ fontSize: 'clamp(140px, 20vw, 280px)', opacity: 0.04 }}
        aria-hidden
      >
        {step.num}
      </div>

      {/* Ambient color wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isEven
            ? `radial-gradient(ellipse at 85% 50%, var(--color-${step.color}) 0%, transparent 55%)`
            : `radial-gradient(ellipse at 15% 50%, var(--color-${step.color}) 0%, transparent 55%)`,
          opacity: 0.04,
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 xl:gap-24 items-center">

        {/* TEXT — Clarity: headline answers "what does this do?" */}
        <div
          className={isEven ? 'lg:order-1' : 'lg:order-2'}
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : isEven ? 'translateX(-24px)' : 'translateX(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {/* Phase badge */}
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-semibold tracking-[0.05em] uppercase mb-7 ${c.badge}`}>
            <span className="font-jetbrains opacity-70">{step.num}</span>
            <span className="opacity-30">·</span>
            <span className={`material-symbols-outlined text-[12px] ${c.iconCls}`} style={{ fontVariationSettings: "'FILL' 0" }}>
              {step.icon}
            </span>
            <span>{step.phase}</span>
          </div>

          <h2 className={`text-[28px] md:text-[36px] lg:text-[42px] leading-[34px] md:leading-[44px] lg:leading-[50px] font-bold tracking-[-0.03em] mb-5 ${c.text}`}>
            {step.headline}
          </h2>

          <p className="text-[16px] md:text-[17px] leading-[26px] md:leading-[28px] font-normal text-on-surface-variant mb-9 max-w-lg">
            {step.detail}
          </p>

          {/* Feature bullets */}
          <ul className="space-y-4 mb-8">
            {step.bullets.map((b, bi) => (
              <li
                key={b.label}
                className="flex items-start gap-4"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                  transitionDelay: inView ? `${bi * 80 + 280}ms` : '0ms',
                }}
              >
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mt-0.5`}>
                  <span
                    className={`material-symbols-outlined text-[17px] ${c.iconCls}`}
                    style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                  >{b.icon}</span>
                </div>
                <div className="leading-[22px]">
                  <span className={`text-[14px] font-semibold tracking-[-0.01em] ${c.text}`}>{b.label}</span>
                  <span className="text-[14px] font-normal text-on-surface-variant"> — {b.detail}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Usability: "What's next?" progressive cue */}
          {stepIndex < STEPS.length - 1 && (
            <a
              href={`#${STEPS[stepIndex + 1].id}`}
              className="inline-flex items-center gap-2 text-[12px] font-semibold no-underline text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors group"
            >
              <span>Next: {STEPS[stepIndex + 1].phase}</span>
              <span className="material-symbols-outlined text-[15px] group-hover:translate-y-0.5 transition-transform">arrow_downward</span>
            </a>
          )}
        </div>

        {/* PRODUCT PREVIEW CARD — showcases the product in action */}
        <div
          className={isEven ? 'lg:order-2' : 'lg:order-1'}
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
            transitionDelay: '120ms',
          }}
        >
          {cardMap[step.id]}
        </div>
      </div>
    </section>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export default function HowItWorks() {
  const [activeStep, setActiveStep]   = useState(-1);
  const [navVisible, setNavVisible]   = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('hw-hero');
      setNavVisible((hero?.getBoundingClientRect().bottom ?? 0) < 72);

      let current = -1;
      STEPS.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.5) current = i;
      });
      const cta = document.getElementById('step-cta');
      if (cta && cta.getBoundingClientRect().top <= window.innerHeight * 0.5) current = STEPS.length;
      setActiveStep(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative w-full">

      <StepProgressNav activeStep={activeStep} visible={navVisible} />

      {/* ════════════════════════════════════════════════════
          HERO — 85vh so Step 01 peeks below (anti-false-floor)
          Above-the-fold: clear value prop + CTA + 4 phase pills
          ════════════════════════════════════════════════════ */}
      <section
        id="hw-hero"
        className="relative flex flex-col items-center justify-center px-5 md:px-8 overflow-hidden"
        style={{ minHeight: '85dvh', paddingTop: 72 }}
      >
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-primary/7 blur-[160px] rounded-full pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-3xl mx-auto text-center">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel border border-primary/20 mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-jetbrains text-[10px] text-primary/80 tracking-[0.1em] uppercase">
              The REIL System · How It Works
            </span>
          </div>

          {/* Headline — outcome-first: what does the investor GET? */}
          <h1 className="text-[42px] md:text-[60px] lg:text-[68px] leading-[48px] md:leading-[68px] lg:leading-[76px] font-bold tracking-[-0.04em] text-on-surface mb-6">
            Never miss a deadline.<br className="hidden md:block" />
            <span className="text-primary luminous-text">Never blow a budget.</span>
          </h1>

          {/* Subtitle — honest, skeptic-aware */}
          <p className="text-[17px] md:text-[19px] leading-[27px] md:leading-[30px] font-normal text-on-surface-variant max-w-2xl mx-auto mb-10">
            PaperWorking watches your contingency windows, contractor draws, and
            closing costs on every deal — so the details that cost investors money
            never catch you off guard.
          </p>

          {/* Outcome proof grid — real product results, not feature bullets.
              Shows what investors GET, not what the product IS. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-2xl mx-auto mb-10">
            {[
              { value: '$48.8K',  label: 'Avg. net profit tracked',  color: 'text-primary'   },
              { value: '24.8%',   label: 'Projected IRR per deal',    color: 'text-primary'   },
              { value: '0',       label: 'Missed deadlines',          color: 'text-secondary' },
              { value: '40 hrs',  label: 'Saved at tax time',         color: 'text-tertiary'  },
            ].map(({ value, label, color }) => (
              <div key={label} className="glass-panel rounded-xl px-3 py-3 text-center border border-white/8">
                <div className={`text-[22px] md:text-[26px] font-extrabold tracking-tight leading-none mb-1 ${color}`}>
                  {value}
                </div>
                <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest leading-tight">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Phase pills — Usability: shows journey ahead, prevents false floor */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {STEPS.map((s) => {
              const col = STEP_COLORS[s.color];
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`no-underline inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[12px] font-semibold glass-panel hover:scale-105 active:scale-95 transition-transform duration-200 ${col.badge}`}
                >
                  <span className="font-jetbrains opacity-60">{s.num}</span>
                  <span className="opacity-30">·</span>
                  <span>{s.phase}</span>
                </a>
              );
            })}
          </div>

          {/* CTA — conversion-focused, above the fold */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Link
              href="/pricing"
              className="luminous-button relative overflow-hidden px-8 py-4 rounded-xl font-semibold text-[15px] tracking-[-0.01em] inline-flex items-center gap-2.5 group"
            >
              {/* Shimmer on hover */}
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                aria-hidden
              />
              Start Free 14 Day Trial
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
            <span className="text-[13px] text-on-surface-variant/50">
              Credit card required · Cancel before day 15 to avoid charge
            </span>
          </div>

          {/* Scroll cue — anti-false-floor: signals there's more below */}
          <div className="flex flex-col items-center gap-2 opacity-50">
            <span className="font-jetbrains text-[10px] text-on-surface-variant/50 uppercase tracking-widest">
              See how it works
            </span>
            <span
              className="material-symbols-outlined text-[20px] text-primary/50 animate-bounce"
              style={{ animationDuration: '2s' }}
              aria-hidden
            >
              keyboard_arrow_down
            </span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          STEPS 01–04 — each min-h-screen, alternating layout
          ════════════════════════════════════════════════════ */}
      {STEPS.map((step, i) => (
        <Fragment key={step.id}>
          <StepSection step={step} stepIndex={i} />

          {/* Mid-page CTA after Step 02 — strategic conversion point */}
          {i === 1 && (
            <div className="relative py-8 md:py-10 px-5 md:px-8 flex justify-center">
              <div className="glass-panel rounded-2xl border border-primary/15 px-8 py-6 max-w-2xl w-full text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-primary/3 pointer-events-none" aria-hidden />
                <div className="relative z-10">
                  <p className="text-[14px] font-medium text-on-surface-variant/70 mb-4">
                    Already convinced? Start now — or keep reading to see what happens after you close.
                  </p>
                  <Link
                    href="/pricing"
                    className="luminous-button inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-[13px] group"
                  >
                    Start Free 14 Day Trial
                    <span className="material-symbols-outlined text-[15px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Fragment>
      ))}

      {/* ════════════════════════════════════════════════════
          FINAL CTA — full-screen, conversion-optimized
          ════════════════════════════════════════════════════ */}
      <section
        id="step-cta"
        className="relative flex flex-col items-center justify-center min-h-screen px-5 md:px-8 overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-primary/8 blur-[160px] rounded-full pointer-events-none" aria-hidden />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-2xl mx-auto text-center">

          {/* Social proof / trust strip */}
          <div className="flex flex-wrap justify-center gap-5 mb-12 text-[13px] text-on-surface-variant/45">
            {[
              '2,400+ active investors',
              '$2.1B deal volume tracked',
              '83% fewer missed deadlines',
            ].map((stat) => (
              <span key={stat} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary/60" />
                {stat}
              </span>
            ))}
          </div>

          {/* Headline */}
          <h2 className="text-[36px] md:text-[52px] lg:text-[60px] leading-[42px] md:leading-[60px] lg:leading-[68px] font-bold tracking-[-0.04em] text-on-surface mb-6">
            Ready to run your deals<br className="hidden md:block" />{' '}
            <span className="text-primary luminous-text">like a professional?</span>
          </h2>

          <p className="text-[17px] md:text-[18px] leading-[27px] font-normal text-on-surface-variant max-w-xl mx-auto mb-10">
            Join thousands of investors who've moved their deals out of spreadsheets. Your first deal is free — forever.
          </p>

          {/* Primary CTA */}
          <Link
            href="/pricing"
            className="luminous-button relative overflow-hidden inline-flex items-center gap-3 px-10 py-5 rounded-xl font-semibold text-[16px] tracking-[-0.01em] group mb-5"
          >
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
              aria-hidden
            />
            Start Free 14 Day Trial
            <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1.5 transition-transform">
              arrow_forward
            </span>
          </Link>

          {/* Trust note */}
          <p className="font-jetbrains text-[11px] text-on-surface-variant/30 tracking-[0.04em] uppercase">
            14 days free · Card required · Cancel anytime before day 15
          </p>
        </div>
      </section>

    </div>
  );
}
