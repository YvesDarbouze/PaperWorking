'use client';

import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   HowItWorks — PaperWorking "How It Works" Marketing Page

   Sections (in order):
   1. Hero — headline + emotional pain subhead
   2. Problem Block — 3 concrete pain points
   3. REIL Timeline — 4-phase navigator
   4. Phase Deep-dives — alternating L/R, 4 sections
   5. Differentiators — 3-column vs. spreadsheets
   6. Final CTA

   Typography: Inter full-weight system.
   Palette: midnight #0d0a0b, teal primary, glass panels.
   ═══════════════════════════════════════════════════════ */

/* ─────────────────── Data ─────────────────────────────── */

const PROBLEMS = [
  {
    icon: 'alarm_off',
    title: "Contingency windows close while you're not watching.",
    body: 'Your inspection period, financing deadline, and earnest money date are buried in a contract PDF. Miss one by a day and you lose your deposit — or the deal entirely.',
    stat: 'Avg. earnest at risk: $12,500',
  },
  {
    icon: 'trending_down',
    title: 'Contractor draws eat your margin one invoice at a time.',
    body: "Invoices pile up in email. By the time you reconcile them against the budget, you're $40k over — three weeks from close, with no good options left.",
    stat: '~23% of fix-and-flip projects exceed budget',
  },
  {
    icon: 'folder_off',
    title: 'Tax time is three spreadsheets and a shoebox of receipts.',
    body: 'You spend weeks pulling costs from text threads, bank statements, and email chains. Your CPA bills by the hour. You still miss deductions.',
    stat: '40+ hours per deal at tax time',
  },
];

const PHASES = [
  {
    number: '01',
    key: 'acquisition',
    label: 'Acquisition',
    labelShort: 'Research & Marketplace',
    icon: 'search',
    phaseColor: {
      text: 'text-primary',
      badge: 'text-primary border-primary/25 bg-primary/8',
      icon: 'text-primary',
      glow: 'shadow-[0_0_80px_-20px_rgba(69,73,85,0.25)]',
      bar: 'bg-primary',
    },
    headline: 'Research, acquire, and connect.',
    description:
      "Manage all the research and acquiring steps of purchasing an investment property in one central dashboard. Once your numbers are organized, post your projects directly to our Deal Marketplace to secure capital, discover new opportunities, and connect with other active real estate investors.",
    features: [
      {
        icon: 'calculate',
        label: 'Research & Underwriting',
        detail: 'Evaluate cap rates, cash-on-cash, and IRR with live deal models',
      },
      {
        icon: 'storefront',
        label: 'Deal Marketplace',
        detail: 'List your project to source capital, JV partners, or secondary buyers',
      },
      {
        icon: 'groups',
        label: 'Syndicate & Network',
        detail: 'Find active investors, secure capital commitments, and connect with peers',
      },
    ],
    terminal: [
      { t: 'dim', v: 'DEAL_ANALYZER  v2.4 · 1247 Elm Street, Austin TX' },
      { t: 'sep' },
      { t: 'row', l: 'Purchase Price', r: '$485,000', c: '' },
      { t: 'row', l: 'Estimated ARV', r: '$620,000', c: '' },
      { t: 'row', l: 'Rehab Budget', r: '$68,000', c: '' },
      { t: 'sep' },
      { t: 'row', l: 'Cap Rate', r: '6.2%', c: '' },
      { t: 'row', l: 'Cash-on-Cash', r: '14.8%', c: '' },
      { t: 'highlight', l: 'PROJECTED_IRR', r: '24.8%  ▲', c: 'primary' },
      { t: 'sep' },
      { t: 'status', l: 'CONFIDENCE_SCORE', r: '84.2%  ● STRONG', c: 'primary' },
    ],
  },
  {
    number: '02',
    key: 'transaction',
    label: 'Transaction',
    labelShort: 'Diligence & close',
    icon: 'gavel',
    phaseColor: {
      text: 'text-secondary',
      badge: 'text-secondary border-secondary/25 bg-secondary/8',
      icon: 'text-secondary',
      glow: 'shadow-[0_0_80px_-20px_rgba(173,198,255,0.2)]',
      bar: 'bg-secondary',
    },
    headline: 'Never blow a contingency. Not once.',
    description:
      "Track every deadline tied to your contract — inspection, financing, appraisal — with alerts that fire before your money goes hard. Your diligence checklist lives in the platform, not a separate doc nobody updates.",
    features: [
      {
        icon: 'schedule',
        label: 'Deadline Tracker',
        detail: 'Every contingency date on a live timeline with automated alerts',
      },
      {
        icon: 'checklist',
        label: 'Diligence Checklist',
        detail: 'Title, insurance, inspection — all tracked in one place',
      },
      {
        icon: 'notifications_active',
        label: 'Earnest Money Alerts',
        detail: 'Know exactly when your deposit becomes non-refundable',
      },
    ],
    terminal: [
      { t: 'dim', v: 'DEADLINE_TRACKER  Contract: Mar 12, 2025' },
      { t: 'sep' },
      { t: 'row', l: 'Inspection Period', r: 'Mar 19', c: 'done' },
      { t: 'row', l: 'Appraisal', r: 'Mar 26  ⚠ 3 DAYS', c: 'warn' },
      { t: 'row', l: 'Financing', r: 'Apr 02  ● PENDING', c: '' },
      { t: 'sep' },
      { t: 'highlight', l: 'EARNEST DEPOSIT', r: '$12,500', c: 'secondary' },
      { t: 'status', l: 'GOES_HARD', r: 'Apr 09  ⚠ ALERT SET', c: 'warn' },
    ],
  },
  {
    number: '03',
    key: 'hold',
    label: 'Hold / Rehab',
    labelShort: 'Manage & renovate',
    icon: 'construction',
    phaseColor: {
      text: 'text-tertiary',
      badge: 'text-tertiary border-tertiary/25 bg-tertiary/8',
      icon: 'text-tertiary',
      glow: 'shadow-[0_0_80px_-20px_rgba(255,209,170,0.2)]',
      bar: 'bg-tertiary',
    },
    headline: 'Watch your margin in real time — not at the end.',
    description:
      'Log every contractor draw against your approved budget by trade and milestone. Approve draws only when the work is verified, and see exactly where you stand on margin at any point during the renovation.',
    features: [
      {
        icon: 'bar_chart',
        label: 'Budget vs. Actual',
        detail: 'Renovation costs tracked line by line, updated as invoices come in',
      },
      {
        icon: 'receipt_long',
        label: 'Contractor Draw Log',
        detail: 'Approve draws per milestone — not per invoice stack',
      },
      {
        icon: 'task_alt',
        label: 'Milestone Sign-off',
        detail: 'Verify completion before releasing funds to your contractors',
      },
    ],
    terminal: [
      { t: 'dim', v: 'REHAB_TRACKER  Approved Budget: $68,000' },
      { t: 'sep' },
      { t: 'row', l: 'Demo / Framing', r: '$8,200  / $8,500', c: 'done' },
      { t: 'row', l: 'Electrical', r: '$6,100  / $6,000', c: 'warn' },
      { t: 'row', l: 'HVAC', r: '$11,200 / $11,000', c: 'warn' },
      { t: 'row', l: 'Flooring', r: '$0      / $12,000', c: '' },
      { t: 'row', l: 'Kitchen', r: '$0      / $18,000', c: '' },
      { t: 'sep' },
      { t: 'highlight', l: 'SPENT_TO_DATE', r: '$25,500 (37.5%)', c: 'tertiary' },
      { t: 'status', l: 'VARIANCE', r: '+$1,900 over budget  ⚠', c: 'warn' },
    ],
  },
  {
    number: '04',
    key: 'exit',
    label: 'Exit',
    labelShort: 'Sell & report',
    icon: 'trending_up',
    phaseColor: {
      text: 'text-outline',
      badge: 'text-outline border-outline/25 bg-outline/8',
      icon: 'text-outline',
      glow: 'shadow-[0_0_80px_-20px_rgba(133,148,144,0.15)]',
      bar: 'bg-outline',
    },
    headline: 'Close the deal. Close the books.',
    description:
      'Track your carrying costs through the hold period, log the closing disclosure, and generate a clean cost-basis export when you sell. Your CPA gets one organized file — not a folder of scanned receipts.',
    features: [
      {
        icon: 'receipt',
        label: 'Closing Cost Tracker',
        detail: 'Commissions, transfer taxes, seller credits — all captured',
      },
      {
        icon: 'insights',
        label: 'ROI Summary',
        detail: 'Actual return vs. projected — calculated automatically at close',
      },
      {
        icon: 'table_chart',
        label: 'CPA Export',
        detail: 'One-click P&L with all costs organized by category',
      },
    ],
    terminal: [
      { t: 'dim', v: 'EXIT_SUMMARY  1247 Elm Street' },
      { t: 'sep' },
      { t: 'row', l: 'Sale Price', r: '$618,000', c: '' },
      { t: 'sep' },
      { t: 'row', l: '  Purchase Price', r: '($485,000)', c: '' },
      { t: 'row', l: '  Rehab Costs', r: '($72,100)', c: '' },
      { t: 'row', l: '  Carrying Costs', r: '($8,400)', c: '' },
      { t: 'row', l: '  Closing Costs', r: '($3,700)', c: '' },
      { t: 'sep' },
      { t: 'highlight', l: 'NET_PROFIT', r: '$48,800', c: 'primary' },
      { t: 'status', l: 'ROI_ACTUAL', r: '10.06%  vs 24.8% projected', c: 'outline' },
    ],
  },
];

const STATS = [
  { value: '2,400+', label: 'Deals tracked' },
  { value: '$2.1B', label: 'Deal volume managed' },
  { value: '4.8 / 5', label: 'Avg. investor rating' },
  { value: '83%', label: 'Report fewer missed deadlines' },
];

const FAQS = [
  {
    q: "Is this just a project management tool for real estate?",
    a: "No. Generic PM tools (Asana, Monday, Notion) don't know what a contingency period is, can't calculate IRR, and don't generate a cost-basis export for your CPA. PaperWorking is built specifically around the REIL lifecycle — every field, every alert, and every export is designed for the way real estate deals actually work.",
  },
  {
    q: "What if I only do 2–3 deals a year? Is this worth it?",
    a: "Especially then. When you're doing a handful of deals a year, each one carries more risk. Missing one contingency deadline or losing track of a contractor invoice can wipe out your entire margin on that deal. The free tier covers one active deal — try it with your next acquisition and see how much cleaner the process is.",
  },
  {
    q: "Does PaperWorking replace my CPA or attorney?",
    a: "It replaces the disorganized data they hate dealing with. PaperWorking tracks your costs, documents, and timelines — then hands your CPA a clean, organized P&L export instead of a folder of scanned receipts. Your professionals spend less time on admin and more time on the work that actually requires them.",
  },
  {
    q: "Can I use this for buy-and-hold rentals, not just flips?",
    a: "Yes. The Hold phase covers both renovation projects and long-term rentals. You can track tenant leases, monthly carrying costs, STR/LTR revenue, and property valuations. The Exit phase then handles the eventual sale — or if you refinance and hold, it continues tracking your ongoing performance.",
  },
  {
    q: "How long does it take to set up a deal?",
    a: "Most investors have their first deal live in under 15 minutes. You enter the property address, purchase price, target ARV, and rehab budget — the system generates your deal analyzer, creates your deadline timeline from your contract date, and sets up your budget tracking. No configuration wizard, no template library to navigate.",
  },
];

const DIFFERENTIATORS = [
  {
    icon: 'schedule',
    headline: 'Deadline-aware',
    subhead: 'vs. a static doc',
    body: 'PaperWorking tracks contingency windows and fires alerts automatically. Your spreadsheet has no idea what month it is.',
  },
  {
    icon: 'visibility',
    headline: 'Always current',
    subhead: 'vs. a quarterly snapshot',
    body: 'Every cost, every draw, every receipt is attached to the deal as it happens. The P&L is never a weekend project.',
  },
  {
    icon: 'output',
    headline: 'Exit-ready from day one',
    subhead: 'vs. tax-time chaos',
    body: "Because costs are tracked as they occur, your CPA export is ready when you close. Tax prep takes hours, not weeks.",
  },
];

/* ─────────────────── Terminal renderer ─────────────────── */

type TermLine =
  | { t: 'dim'; v: string }
  | { t: 'sep' }
  | { t: 'row'; l: string; r: string; c: string }
  | { t: 'highlight'; l: string; r: string; c: string }
  | { t: 'status'; l: string; r: string; c: string };

function colorClass(c: string): string {
  if (c === 'primary') return 'text-primary';
  if (c === 'secondary') return 'text-secondary';
  if (c === 'tertiary') return 'text-tertiary';
  if (c === 'outline') return 'text-outline';
  if (c === 'warn') return 'text-tertiary/80';
  if (c === 'done') return 'text-primary/70';
  return 'text-on-surface/80';
}

function Terminal({ lines, titleColor }: { lines: TermLine[]; titleColor: string }) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* macOS-style title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-black/30">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className={`font-jetbrains text-[10px] text-on-surface-variant/30 ml-2 uppercase tracking-widest`}>
          paperworking
        </span>
      </div>

      {/* Terminal body */}
      <div className="p-5 md:p-6 space-y-0.5">
        {lines.map((line, i) => {
          if (line.t === 'dim') {
            return (
              <div key={i} className={`font-jetbrains text-[11px] leading-[18px] ${titleColor} opacity-70 pb-1`}>
                {line.v}
              </div>
            );
          }
          if (line.t === 'sep') {
            return (
              <div key={i} className="border-t border-white/8 my-2" />
            );
          }
          if (line.t === 'row') {
            return (
              <div key={i} className="flex justify-between gap-4 font-jetbrains text-[11px] leading-[20px]">
                <span className="text-on-surface-variant/50">{line.l}</span>
                <span className={colorClass(line.c)}>{line.r}</span>
              </div>
            );
          }
          if (line.t === 'highlight') {
            return (
              <div key={i} className="flex justify-between gap-4 font-jetbrains text-[12px] leading-[22px] font-bold">
                <span className="text-on-surface/60">{line.l}</span>
                <span className={colorClass(line.c)}>{line.r}</span>
              </div>
            );
          }
          if (line.t === 'status') {
            return (
              <div key={i} className="flex justify-between gap-4 font-jetbrains text-[10px] leading-[18px] opacity-70">
                <span className="text-on-surface-variant/40">{line.l}</span>
                <span className={colorClass(line.c)}>{line.r}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

/* ─────────────────── Page Component ───────────────────── */

export default function HowItWorks() {
  return (
    <div className="relative w-full">

      {/* ══════════════════════════════════════════════════════
          1. HERO
          ══════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center pt-32 md:pt-44 pb-20 md:pb-28 px-5 md:px-8 overflow-hidden">
        {/* Ambient radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/6 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Terminal status pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel border border-primary/20 mb-10">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-jetbrains text-[10px] text-primary/80 tracking-[0.1em] uppercase">
              REIL System · v2.4.8-stable
            </span>
          </div>

          <h1 className="font-thin text-[40px] md:text-[64px] leading-[46px] md:leading-[72px] tracking-[-0.04em] text-on-surface mb-7">
            Built for Serious<br className="hidden md:block" />{' '}
            <span className="text-primary luminous-text">Real Estate Investors</span>
          </h1>

          <p className="text-[17px] md:text-[18px] leading-[27px] md:leading-[28px] font-normal text-on-surface-variant max-w-2xl mx-auto">
            PaperWorking provides professional project management centered on the 
            <strong> Real Estate Investment LifeCycle (REIL)</strong>. We track every document, 
            dollar, and deadline across all phases of your projects, replacing fragmented spreadsheets 
            with a single high-tech operating system.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          1b. STATS CREDIBILITY STRIP
          ══════════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-16 md:pb-20">
        <div className="glass-panel rounded-2xl border border-white/8 px-6 py-6 md:py-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 divide-y-2 md:divide-y-0 md:divide-x divide-white/8">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center px-4 py-2 md:py-0 first:pt-0 last:pb-0 md:first:pl-0 md:last:pr-0">
              <span className="font-extrabold text-[28px] md:text-[32px] tracking-[-0.03em] text-primary luminous-text font-tabular">
                {s.value}
              </span>
              <span className="font-jetbrains text-[10px] tracking-[0.06em] uppercase text-on-surface-variant/50 mt-1">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. PROBLEM BLOCK
          ══════════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-24 md:pb-32">
        <div className="text-center mb-12">
          <p className="font-jetbrains text-[10px] tracking-[0.12em] uppercase text-primary/60 mb-5">
            The Problem
          </p>
          <h2 className="text-[28px] md:text-[36px] leading-tight font-bold tracking-[-0.025em] text-on-surface">
            Your spreadsheet doesn't care<br className="hidden md:block" /> if you miss a deadline.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              className="glass-card rounded-xl p-7 flex flex-col gap-4 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
            >
              {/* Subtle warm wash top-right */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-tertiary/5 blur-2xl pointer-events-none rounded-full" />

              <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-[20px] text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {p.icon}
                </span>
              </div>

              <h3 className="text-[15px] leading-[22px] font-semibold text-on-surface tracking-[-0.01em]">
                {p.title}
              </h3>

              <p className="text-[13px] leading-[21px] font-normal text-on-surface-variant flex-grow">
                {p.body}
              </p>

              <div className="pt-4 border-t border-white/8">
                <span className="font-jetbrains text-[10px] text-tertiary/60 tracking-wide">{p.stat}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. REIL TIMELINE NAVIGATOR
          ══════════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-10 md:pb-16">
        <div className="text-center mb-12">
          <p className="font-jetbrains text-[10px] tracking-[0.12em] uppercase text-primary/60 mb-5">
            The Solution
          </p>
          <h2 className="text-[28px] md:text-[36px] leading-tight font-bold tracking-[-0.025em] text-on-surface mb-5">
            Four phases. Every deal. One system.
          </h2>
          <p className="text-[16px] leading-[26px] font-normal text-on-surface-variant max-w-2xl mx-auto">
            Every deal has four chapters: you find it, you buy it, you manage it, and you exit.
            PaperWorking is built around those four phases — not generic project stages. Every
            field, alert, and export is designed for exactly where you are in the deal.
          </p>
        </div>

        {/* Phase tab row */}
        <div className="relative rounded-xl overflow-hidden border border-white/8 bg-surface-container-low/40 grid grid-cols-4">
          {PHASES.map((phase, idx) => (
            <a
              key={phase.key}
              href={`#${phase.key}`}
              className={`pw-interactive-custom flex flex-col items-center text-center p-4 md:p-6 gap-2 relative
                hover:bg-white/4 transition-colors duration-200 no-underline
                ${idx < PHASES.length - 1 ? 'border-r border-white/8' : ''}`}
            >
              <span className={`font-jetbrains text-[9px] tracking-[0.08em] opacity-50 ${phase.phaseColor.text}`}>
                {phase.number}
              </span>
              <span
                className={`material-symbols-outlined text-[20px] md:text-[24px] ${phase.phaseColor.icon}`}
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                {phase.icon}
              </span>
              <span className={`text-[12px] md:text-[13px] font-semibold tracking-[-0.01em] ${phase.phaseColor.text}`}>
                {phase.label}
              </span>
              <span className="text-[11px] font-normal text-on-surface-variant/50 hidden md:block leading-tight">
                {phase.labelShort}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4. PHASE DEEP-DIVES — alternating L/R
          ══════════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-16 md:pb-24 space-y-24 md:space-y-32">
        {PHASES.map((phase, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <div
              key={phase.key}
              id={phase.key}
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center scroll-mt-28"
            >
              {/* ── Text block ── */}
              <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
                {/* Phase badge */}
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
                    text-[10px] font-semibold tracking-[0.06em] uppercase mb-7 ${phase.phaseColor.badge}`}
                >
                  <span className="font-jetbrains opacity-80">{phase.number}</span>
                  <span className="opacity-40">·</span>
                  <span>{phase.label}</span>
                </div>

                <h2
                  className={`text-[26px] md:text-[34px] leading-tight font-bold
                    tracking-[-0.025em] mb-5 ${phase.phaseColor.text}`}
                >
                  {phase.headline}
                </h2>

                <p className="text-[16px] leading-[27px] font-normal text-on-surface-variant mb-9">
                  {phase.description}
                </p>

                {/* Feature bullets */}
                <ul className="space-y-5">
                  {phase.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center mt-0.5">
                        <span
                          className={`material-symbols-outlined text-[17px] ${phase.phaseColor.icon}`}
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                        >
                          {f.icon}
                        </span>
                      </div>
                      <div className="leading-[22px]">
                        <span className={`text-[14px] font-semibold tracking-[-0.01em] ${phase.phaseColor.text}`}>
                          {f.label}
                        </span>
                        <span className="text-[14px] font-normal text-on-surface-variant">
                          {' '}— {f.detail}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── Terminal mockup ── */}
              <div className={`${isEven ? 'lg:order-2' : 'lg:order-1'} ${phase.phaseColor.glow} rounded-xl`}>
                <Terminal
                  lines={phase.terminal as TermLine[]}
                  titleColor={phase.phaseColor.text}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* ══════════════════════════════════════════════════════
          5. DIFFERENTIATORS — vs. spreadsheets
          ══════════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-24 md:pb-32">
        <div className="text-center mb-12">
          <p className="font-jetbrains text-[10px] tracking-[0.12em] uppercase text-primary/60 mb-5">
            Why not a spreadsheet
          </p>
          <h2 className="text-[28px] md:text-[36px] leading-tight font-bold tracking-[-0.025em] text-on-surface">
            Spreadsheets track the past.<br className="hidden md:block" />
            PaperWorking tracks the deal.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DIFFERENTIATORS.map((d) => (
            <div
              key={d.headline}
              className="glass-panel rounded-xl p-7 flex flex-col gap-5 border border-white/8
                hover:border-primary/20 transition-colors duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[20px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  {d.icon}
                </span>
              </div>

              <div>
                <h3 className="text-[16px] font-bold text-on-surface tracking-[-0.01em] mb-1">
                  {d.headline}
                </h3>
                <p className="font-jetbrains text-[10px] text-primary/50 uppercase tracking-[0.06em]">
                  {d.subhead}
                </p>
              </div>

              <p className="text-[14px] leading-[22px] font-normal text-on-surface-variant">
                {d.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          6. FAQ — OBJECTION HANDLING
          ══════════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-24 md:pb-32">
        <div className="text-center mb-12">
          <p className="font-jetbrains text-[10px] tracking-[0.12em] uppercase text-primary/60 mb-5">
            Common questions
          </p>
          <h2 className="text-[28px] md:text-[36px] leading-tight font-bold tracking-[-0.025em] text-on-surface">
            Straight answers.
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((faq, idx) => (
            <details
              key={idx}
              className="glass-panel rounded-xl border border-white/8 group overflow-hidden"
            >
              <summary
                className="pw-interactive-custom flex items-center justify-between gap-4
                  px-6 py-5 cursor-pointer list-none select-none
                  text-[15px] font-semibold text-on-surface tracking-[-0.01em]
                  hover:text-primary transition-colors duration-200"
              >
                <span>{faq.q}</span>
                <span
                  className="material-symbols-outlined flex-shrink-0 text-[20px] text-primary/60
                    transition-transform duration-200 group-open:rotate-45"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                >
                  add
                </span>
              </summary>
              <div className="px-6 pb-6">
                <div className="border-t border-white/8 pt-5">
                  <p className="text-[14px] leading-[24px] font-normal text-on-surface-variant">
                    {faq.a}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          7. FINAL CTA
          ══════════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-24 md:pb-36">
        <div className="glass-card rounded-2xl p-10 md:p-20 text-center relative overflow-hidden">
          {/* Top light bar */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          {/* Central ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/6 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-[28px] md:text-[44px] leading-tight font-extrabold tracking-[-0.035em] text-on-surface mb-6">
              Stop running your deals<br className="hidden md:block" /> out of a spreadsheet.
            </h2>

            <p className="text-[16px] md:text-[18px] leading-[27px] font-normal text-on-surface-variant max-w-xl mx-auto mb-10">
              PaperWorking tracks every document, dollar, and deadline from acquisition
              to exit — in one dashboard built for the way deals actually work.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="luminous-button px-8 py-4 rounded-lg font-semibold text-[14px] tracking-[0.01em]
                  flex items-center gap-2 group"
              >
                Start 14 Day Trial
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/pricing"
                className="pw-interactive-custom px-8 py-4 rounded-lg font-semibold text-[14px]
                  text-on-surface-variant hover:text-on-surface transition-colors"
              >
                View pricing
              </Link>
            </div>

            <p className="mt-6 font-jetbrains text-[10px] text-on-surface-variant/40 tracking-[0.04em] uppercase">
              Free for one active deal · No credit card required
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
