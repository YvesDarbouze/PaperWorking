'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface Slide {
  id: string;
  title: string;
  url: string;
  altText: string;
}

const SLIDES: Slide[] = [
  {
    id: 'terminal',
    title: 'Investment Terminal',
    url: 'paperworking.co/terminal',
    altText:
      'Finally, Project Management software made for serious real estate investors and Investments teams. — PaperWorking investment terminal with live property underwriting, cash flow projections, and portfolio KPIs',
  },
  {
    id: 'insights',
    title: 'Portfolio Insights',
    url: 'paperworking.co/insights',
    altText:
      'PaperWorking Portfolio Insights dashboard showing NOI, cap rate, DSCR, cash-on-cash return, and IRR for an active 4-property portfolio',
  },
  {
    id: 'fund',
    title: 'REIL Fund Phase & Tasks',
    url: 'paperworking.co/project/oak-ridge/fund',
    altText:
      'PaperWorking Fund phase task board with tasks assigned to team members S. Reyes, M. Okafor, and J. Lindqvist',
  },
];

export default function HeroProductCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Auto-rotation every 6 seconds
  useEffect(() => {
    if (isPaused || reducedMotion) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isPaused, reducedMotion]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      nextSlide();
    } else if (distance < -45) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="PaperWorking product screen previews"
      className="relative w-full max-w-[620px] flex flex-col gap-3.5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Screen Reader Product Preview Description (Prompt 7 Accessibility) */}
      <p className="sr-only">
        Preview of the PaperWorking investment dashboard showing portfolio metrics and deal pipeline.
      </p>

      {/* Screen Reader Live Status */}
      <div className="sr-only" aria-live="polite">
        Showing slide {currentSlide + 1} of {SLIDES.length}: {SLIDES[currentSlide].title} — {SLIDES[currentSlide].altText}
      </div>

      {/* Browser Chrome Frame */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0f111a] shadow-[0_24px_50px_rgba(0,0,0,0.6)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Browser Top Window Chrome Bar */}
        <div className="flex items-center justify-between bg-[#141624] px-4 py-2.5 border-b border-white/[0.08] select-none">
          {/* Window Traffic Lights */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56] opacity-85" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] opacity-85" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f] opacity-85" />
          </div>

          {/* Browser Address Bar */}
          <div className="flex h-6 w-3/5 max-w-[280px] items-center justify-center gap-1.5 rounded-lg bg-black/40 px-3 border border-white/[0.08] text-[11px] text-white/50 font-[family-name:var(--font-jetbrains-mono)] truncate">
            <span className="material-symbols-outlined text-[12px] text-white/30">lock</span>
            <span className="truncate">{SLIDES[currentSlide].url}</span>
          </div>

          {/* Discreet Sample Data Tag */}
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-wider text-white/30 border border-white/10 rounded px-1.5 py-0.5">
            Sample data
          </span>
        </div>

        {/* Screen Viewport Container */}
        <div className="relative w-full min-h-[440px] sm:min-h-[460px] bg-[#0c0d15] p-3.5 sm:p-4 text-white overflow-hidden select-none">
          {/* Ambient subtle glow */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[color:var(--color-primary)]/5 blur-[80px]"
            aria-hidden="true"
          />

          {/* SLIDE 0: Investment Terminal On-Brand Hero Visual */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 1 of 3: Investment Terminal"
            data-url="paperworking.co/terminal"
            className={`transition-opacity duration-400 ease-in-out ${
              currentSlide === 0 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            <div className="relative w-full overflow-hidden rounded-xl bg-[#08090d] border border-white/10 shadow-2xl">
              <img
                src="/images/hero-investor-terminal.png"
                alt="Finally, Project Management software made for serious real estate investors and Investments teams. — PaperWorking investment terminal with live property underwriting, cash flow projections, and portfolio KPIs"
                width={620}
                height={440}
                loading="lazy"
                decoding="async"
                className="h-[415px] sm:h-[435px] w-full object-cover object-center rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/90 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg border border-white/10 bg-[#0a0a0f]/90 px-3.5 py-2.5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
                  <span className="text-[12px] font-semibold text-white">Institutional Deal Execution</span>
                </div>
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10.5px] text-[color:var(--color-primary)] font-medium">
                  Bloomberg-Terminal Caliber
                </span>
              </div>
            </div>
          </div>

          {/* SLIDE 1: Portfolio Insights Screen */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 2 of 3: Portfolio Insights"
            data-url="paperworking.co/insights"
            className={`transition-opacity duration-400 ease-in-out ${
              currentSlide === 1 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            {/* Application Navigation / Context Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                  <span className="material-symbols-outlined text-[15px]">analytics</span>
                </span>
                <div>
                  <h3 className="text-[12.5px] font-semibold text-white tracking-tight leading-none">
                    Portfolio Insights
                  </h3>
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] text-white/40">
                    Apex Equity Fund I · 4 Properties (15 Units)
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9.5px] font-medium text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)]" />
                Live Actuals
              </span>
            </div>

            {/* Top 5 Headline Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3.5">
              {/* Metric 1: NOI */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
                <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
                  NOI (Annual)
                </span>
                <span className="block text-[15px] sm:text-[16px] font-bold text-white tracking-tight">
                  $294,000
                </span>
                <span className="block text-[8.5px] font-medium text-[color:var(--color-primary)]">
                  +4.4% YoY
                </span>
              </div>

              {/* Metric 2: Market Cap Rate */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
                <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
                  Market Cap Rate
                </span>
                <span className="block text-[15px] sm:text-[16px] font-bold text-[color:var(--color-primary)] tracking-tight">
                  7.0%
                </span>
                <span className="block text-[8.5px] text-white/40">
                  NOI ÷ $4.20M
                </span>
              </div>

              {/* Metric 3: DSCR */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
                <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
                  DSCR
                </span>
                <span className="block text-[15px] sm:text-[16px] font-bold text-white tracking-tight">
                  1.40x
                </span>
                <span className="block text-[8.5px] text-white/40">
                  $210k Debt Serv
                </span>
              </div>

              {/* Metric 4: Cash-on-Cash */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
                <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
                  Cash-on-Cash
                </span>
                <span className="block text-[15px] sm:text-[16px] font-bold text-[color:var(--color-primary)] tracking-tight">
                  8.0%
                </span>
                <span className="block text-[8.5px] text-white/40">
                  $84k ÷ $1.05M
                </span>
              </div>

              {/* Metric 5: Levered IRR — 18.4% is verified by projected-irr.test.ts as the True DCF IRR for Apex Equity Fund I capital stack ($1.05M equity, $84k cash flow, $3.5M purchase, 5.4% appreciation) */}
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/[0.04] p-2.5">
                <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-[color:var(--color-primary)]/80 mb-0.5">
                  Projected IRR
                </span>
                <span className="block text-[15px] sm:text-[16px] font-extrabold text-[color:var(--color-primary)] tracking-tight">
                  18.4%
                </span>
                <span className="block text-[8.5px] text-[color:var(--color-primary)]/70">
                  5-Yr Target
                </span>
              </div>
            </div>

            {/* Supporting Financial Engine Strip + Sparkline */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2.5 mb-3.5">
              <div className="grid grid-cols-3 gap-3 text-left">
                <div>
                  <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider text-white/40">
                    Portfolio Value
                  </span>
                  <span className="text-[12px] font-semibold text-white">
                    $4,200,000
                  </span>
                </div>
                <div>
                  <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider text-white/40">
                    Equity Invested
                  </span>
                  <span className="text-[12px] font-semibold text-white">
                    $1,050,000
                  </span>
                </div>
                <div>
                  <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider text-white/40">
                    Net Cash Flow
                  </span>
                  <span className="text-[12px] font-semibold text-[color:var(--color-primary)]">
                    $84,000/yr
                  </span>
                </div>
              </div>

              {/* Sparkline Trend (SVG) */}
              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-white/[0.06] pt-1.5 sm:pt-0 sm:pl-3">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase text-white/40">
                  NOI Trend
                </span>
                <svg className="w-24 h-6 shrink-0" viewBox="0 0 100 24" fill="none" aria-hidden="true">
                  <path
                    d="M 0 18 Q 15 17 30 14 T 60 11 T 85 8 T 100 5 L 100 24 L 0 24 Z"
                    fill="url(#emerald-gradient)"
                    opacity="0.3"
                  />
                  <path
                    d="M 0 18 Q 15 17 30 14 T 60 11 T 85 8 T 100 5"
                    stroke="#00DD94"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="emerald-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00DD94" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#00DD94" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Per-Property Breakdown Table Excerpt */}
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]">
              <div className="grid grid-cols-12 bg-white/[0.03] px-3 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
                <span className="col-span-4">Property</span>
                <span className="col-span-2 text-right">Units</span>
                <span className="col-span-2 text-right">Value</span>
                <span className="col-span-2 text-right">NOI</span>
                <span className="col-span-2 text-right">Cash Flow</span>
              </div>
              <div className="divide-y divide-white/[0.04] text-[10.5px]">
                {[
                  { name: 'Oakridge Quadplex', units: '4', val: '$1.20M', noi: '$84,000', cf: '$24,000' },
                  { name: 'Magnolia 6-Plex', units: '6', val: '$1.60M', noi: '$112,000', cf: '$32,000' },
                  { name: 'High St Triplex', units: '3', val: '$800k', noi: '$56,000', cf: '$16,000' },
                  { name: 'Elmwood Duplex', units: '2', val: '$600k', noi: '$42,000', cf: '$12,000' },
                ].map((row) => (
                  <div key={row.name} className="grid grid-cols-12 items-center px-3 py-1.5 text-white/80">
                    <span className="col-span-4 font-medium text-white truncate">{row.name}</span>
                    <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)] text-white/50">{row.units}</span>
                    <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)]">{row.val}</span>
                    <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)] text-[color:var(--color-primary)]">{row.noi}</span>
                    <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)]">{row.cf}</span>
                  </div>
                ))}
                {/* Total Summary Row */}
                <div className="grid grid-cols-12 items-center px-3 py-1.5 bg-white/[0.025] font-semibold text-white text-[10.5px]">
                  <span className="col-span-4 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-wider text-[color:var(--color-primary)]">
                    Total (4 Props)
                  </span>
                  <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)]">15</span>
                  <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)]">$4.20M</span>
                  <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)] text-[color:var(--color-primary)]">$294,000</span>
                  <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)] text-[color:var(--color-primary)]">$84,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 2: REIL Fund Phase with Team Task Assignment */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 3 of 3: REIL Fund Phase and Team Tasks"
            data-url="paperworking.co/project/oak-ridge/fund"
            className={`transition-opacity duration-400 ease-in-out ${
              currentSlide === 2 ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            {/* Project Context & REIL Stepper Bar */}
            <div className="flex flex-col gap-2.5 border-b border-white/[0.08] pb-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
                    <span className="material-symbols-outlined text-[15px]">account_balance</span>
                  </span>
                  <div>
                    <h3 className="text-[12.5px] font-semibold text-white tracking-tight leading-none">
                      Oakridge Quadplex
                    </h3>
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] text-white/40">
                      Acquisition Financing · Target Close: Nov 14
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[9.5px] font-semibold text-sky-300">
                  Earnest Money: $25,000 Escrowed
                </span>
              </div>

              {/* REIL 4-Phase Stepper */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider">
                <div className="rounded-md border border-white/10 bg-white/[0.02] py-1 text-white/45 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[10px] text-emerald-400">check</span>
                  01 Acquisition
                </div>
                <div className="rounded-md border border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 py-1 text-[color:var(--color-primary)] font-bold shadow-[0_0_12px_rgba(0,221,148,0.2)]">
                  02 Fund (Active)
                </div>
                <div className="rounded-md border border-white/5 bg-white/[0.01] py-1 text-white/30">
                  03 Hold
                </div>
                <div className="rounded-md border border-white/5 bg-white/[0.01] py-1 text-white/30">
                  04 Exit
                </div>
              </div>
            </div>

            {/* Tasks Board with Team Assignment Working */}
            <div className="space-y-1.5 mb-3">
              {/* Task 1 (With Active Team Member Assignment Dropdown Open!) */}
              <div className="relative rounded-xl border border-[color:var(--color-primary)]/40 bg-[color:var(--color-primary)]/[0.04] p-2.5 shadow-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[15px] text-amber-300">schedule</span>
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-white truncate">
                        Track appraisal contingency deadline
                      </p>
                      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] text-amber-300/90 font-medium">
                        Due in 3 days · Nov 4
                      </span>
                    </div>
                  </div>

                  {/* Assignee Pill Trigger */}
                  <div className="flex items-center gap-1.5 rounded-full border border-[color:var(--color-primary)]/40 bg-[color:var(--color-primary)]/15 px-2.5 py-1 text-[10px] font-medium text-white">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-[8px] font-bold text-[#0a0a0f]">
                      SR
                    </span>
                    <span>S. Reyes</span>
                    <span className="material-symbols-outlined text-[12px] text-[color:var(--color-primary)]">expand_more</span>
                  </div>
                </div>

                {/* Visible Team Assignment Affordance Popover */}
                <div className="mt-2 rounded-lg border border-white/15 bg-[#161828] p-2 shadow-2xl space-y-1">
                  <div className="flex items-center justify-between px-1 text-[8.5px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-wider text-white/40">
                    <span>Assign Team Member</span>
                    <span className="text-[color:var(--color-primary)]">3 Members</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <div className="flex items-center gap-1.5 rounded-md bg-[color:var(--color-primary)]/20 border border-[color:var(--color-primary)]/50 px-2 py-1 text-[10px] font-medium text-white">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-[7.5px] font-bold text-[#0a0a0f]">
                        SR
                      </span>
                      <span className="truncate">S. Reyes (Lead)</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/5 px-2 py-1 text-[10px] font-medium text-white/70">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[7.5px] font-bold text-white">
                        MO
                      </span>
                      <span className="truncate">M. Okafor</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/5 px-2 py-1 text-[10px] font-medium text-white/70">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500 text-[7.5px] font-bold text-white">
                        JL
                      </span>
                      <span className="truncate">J. Lindqvist</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task 2 */}
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">check_circle</span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium text-white/90 truncate">
                      Confirm earnest money deposit received
                    </p>
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] text-white/40">
                      Cleared Oct 28 · Escrow receipt in vault
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[8.5px] font-medium text-emerald-400">
                    Done
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-white/70">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white">
                      MO
                    </span>
                    <span className="hidden sm:inline text-[9.5px]">M. Okafor</span>
                  </div>
                </div>
              </div>

              {/* Task 3 */}
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[15px] text-white/40">upload_file</span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium text-white/90 truncate">
                      Upload executed contract to vault
                    </p>
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] text-white/40">
                      Due Nov 8 · Counter-signed copy
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[8.5px] font-medium text-amber-300">
                    In Progress
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-white/70">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white">
                      JL
                    </span>
                    <span className="hidden sm:inline text-[9.5px]">J. Lindqvist</span>
                  </div>
                </div>
              </div>

              {/* Task 4 */}
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[15px] text-white/40">checklist</span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium text-white/90 truncate">
                      Complete lender document checklist
                    </p>
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] text-white/40">
                      Due Nov 12 · 7 of 8 items verified
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[8.5px] font-medium text-white/60">
                    To Do
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-white/70">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-[8px] font-bold text-[#0a0a0f]">
                      SR
                    </span>
                    <span className="hidden sm:inline text-[9.5px]">S. Reyes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Roster Collaboration Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] text-white/50">
              <div className="flex items-center gap-1.5">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40">
                  Assigned Team:
                </span>
                <div className="flex -space-x-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[#0c0d15] bg-[color:var(--color-primary)] text-[7px] font-bold text-[#0a0a0f]" title="S. Reyes (Lead)">
                    SR
                  </span>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[#0c0d15] bg-blue-500 text-[7px] font-bold text-white" title="M. Okafor (Acquisitions)">
                    MO
                  </span>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[#0c0d15] bg-purple-500 text-[7px] font-bold text-white" title="J. Lindqvist (Legal)">
                    JL
                  </span>
                </div>
              </div>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] text-[color:var(--color-primary)] font-medium">
                + Invite Collaborator
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel Navigation Bar (Dots + Prev/Next) */}
      <div className="flex items-center justify-between px-2 text-white/60">
        {/* Previous Button */}
        <button
          type="button"
          onClick={prevSlide}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
          aria-label="Previous preview"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        </button>

        {/* Tab / Position Indicators */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
          {SLIDES.map((slide, index) => {
            const isActive = currentSlide === index;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToSlide(index)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-medium whitespace-nowrap shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                  isActive
                    ? 'bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/40 text-[color:var(--color-primary)]'
                    : 'bg-white/[0.03] border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                aria-selected={isActive}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    isActive ? 'bg-[color:var(--color-primary)] animate-pulse' : 'bg-white/30'
                  }`}
                  aria-hidden="true"
                />
                <span>{slide.title}</span>
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={nextSlide}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
          aria-label="Next preview"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
