'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Activity, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import { DEMO_PROJECTS, deriveAllMetrics } from '@/lib/metrics';

interface MetricCard {
  name: string;
  symbol: string;
  formula: string;
  tagline: string;
  body: string;
  bullets: string[];
  device: 'desktop' | 'tablet' | 'phone';
}

const HERO_KPIS: MetricCard[] = [
  {
    name: 'Occupancy Rate',
    symbol: 'OCC',
    formula: 'Occupied Units ÷ Total Units',
    tagline: 'Every Vacant Day Has a Price Tag.',
    body: 'Vacancy is the silent tax on your portfolio — invisible on a spreadsheet until the year is already lost. PaperWorking tracks occupancy across every unit you hold and shows you exactly what empty days are costing you, in dollars, right now.',
    bullets: [
      'Portfolio-Wide Visibility — One view of occupancy across every property in your Hold phase.',
      'Vacancy in Dollars — Empty units translated into lost income, not abstract percentages.',
      'Trend Detection — Spot occupancy slipping early enough to act on it.',
    ],
    device: 'desktop',
  },
  {
    name: 'Net Operating Income',
    symbol: 'NOI',
    formula: 'Revenue − OpEx',
    tagline: 'Instant NOI. Zero Formulas. Total Control.',
    body: "Net Operating Income is the foundation of your real estate wealth. It dictates your property's market value, drives your Cap Rate, and proves your portfolio's strength. If you can't pull this number up in five seconds, you're leaving money on the table. PaperWorking eliminates the data-entry homework, turning your daily milestone logs into instant financial clarity.",
    bullets: [
      'Speed to Capital — Hand commercial lenders the exact, institutional-grade data they need to approve your funding faster.',
      "Precision Valuation — Instantly know what your property is actually worth before making your next strategic move.",
      'Automated Intelligence — Forget manual accounting. Your daily workflow automatically builds your performance metrics for you.',
    ],
    device: 'tablet',
  },
  {
    name: 'Cash Flow',
    symbol: 'CF',
    formula: 'NOI − Debt Service',
    tagline: 'Your Cash Flow. Automated. Visualized. Certain.',
    body: 'Stop guesstimating your margins. Command your portfolio like an institution with real-time liquidity tracking that requires zero accounting experience.',
    bullets: [
      "Instant Visibility — Know exactly what you're pocketing after debt service and expenses are deducted.",
      'Proactive Control — Spot downward cash trends early when milestone costs run high, protecting your capital reserves.',
      'Frictionless Reinvestment — Know your precise capital down to the penny, giving you the confidence to scale safely.',
    ],
    device: 'phone',
  },
  {
    name: 'Cap Rate',
    symbol: 'CAP',
    formula: 'NOI ÷ Property Value',
    tagline: "See the Asset's Raw Muscle. No Financing Tricks.",
    body: "A bad deal can hide behind creative loan terms. Savvy investors look past the financing to measure the pure, cash-equivalent strength of the property itself. But when rehab milestones run over budget, your Cap Rate plummets without you knowing. The exact second you enter a cost against a Project milestone, PaperWorking recalculates your true Cap Rate — turning daily project management into an early-warning system.",
    bullets: [
      'Live Recalculation — Your yield adjusts in real time, not six months down the road.',
      'Financing-Blind Truth — Measure the asset itself, independent of loan terms.',
      'Early-Warning System — Milestone overruns surface in your Cap Rate the moment they happen.',
    ],
    device: 'desktop',
  },
  {
    name: 'Cash-on-Cash Return',
    symbol: 'CoC',
    formula: 'Annual Cash Flow ÷ Cash Invested',
    tagline: 'Your Real Cash Yield. Live. Visual. Certain.',
    body: "Never fly blind on your actual returns. Command your capital efficiency with an automated dashboard that connects your daily workflow directly to your bottom line.",
    bullets: [
      "Instant Visibility — See your exact return percentage on the literal cash you've deployed.",
      'Early-Warning Shield — Catch budget leaks at the milestone level before they hurt your year-end payouts.',
      'Effortless Reporting — Your daily Project logs naturally build your financial visualizations and tax-ready reports.',
    ],
    device: 'tablet',
  },
  {
    name: 'Gross Rent Multiplier',
    symbol: 'GRM',
    formula: 'Purchase Price ÷ Gross Annual Rent',
    tagline: 'Compare Properties Instantly.',
    body: 'In a competitive market, listing prices can be misleading. GRM is a straight-to-the-point reality check — exactly how many years of gross rent it takes to cover the purchase price. PaperWorking visualizes it instantly, keeping your capital safe from bad valuations.',
    bullets: [
      "Instant Market Triage — Know within five seconds if a prospective Deal is worth your attention.",
      'Frictionless Analytics — Raw market prices become instant, actionable investment intelligence.',
      'Buy with Confidence — Stop overpaying for assets that look better than they perform.',
    ],
    device: 'phone',
  },
  {
    name: 'Debt Service Coverage Ratio',
    symbol: 'DSCR',
    formula: 'NOI ÷ Annual Debt Service',
    tagline: 'Your DSCR. Automated. Fundable. Certain.',
    body: "Stop letting complex bank underwriting slow down your portfolio growth. Command your leverage with a real-time index of your property's true borrowing strength.",
    bullets: [
      "Immediate Bank Credibility — Hand lenders an audit-ready view of your property's ability to cover its debt.",
      'Frictionless Analytics — PaperWorking divides your live NOI by your financing inputs automatically.',
      'Tax-Ready Workflow — Every milestone expense that moves your DSCR flows into year-end reporting — saving weeks of bookkeeping.',
    ],
    device: 'desktop',
  },
  {
    name: 'Internal Rate of Return',
    symbol: 'IRR',
    formula: 'NPV = 0 Discount Rate',
    tagline: 'Your True Return. Time-Weighted. Undeniable.',
    body: 'Profit tells you how much. IRR tells you how fast — the metric institutions use to rank every deal, because a dollar returned this year beats a dollar returned in year five. Two Deals with identical profit can have wildly different IRRs. PaperWorking computes yours live from your actual cash-in and cash-out dates, so you rank opportunities the way professionals do.',
    bullets: [
      'Apples-to-Apples Ranking — Compare a six-month flip against a five-year hold on equal footing.',
      "Live Recalculation — Timeline slips and milestone overruns update your projected IRR the moment they're logged.",
      'Exit Intelligence — See how holding longer — or selling sooner — changes your true return before you decide.',
    ],
    device: 'tablet',
  },
  {
    name: 'Expense Ratio',
    symbol: 'OER',
    formula: 'OpEx ÷ Gross Income',
    tagline: 'Find the Leak Before It Sinks the Margin.',
    body: "What percentage of your gross income do operating costs consume? Most investors can't answer — and rising expenses quietly eat returns that look healthy on the surface. PaperWorking calculates your Expense Ratio live from the costs you're already logging, so margin erosion shows up as a dashboard alert, not a year-end surprise.",
    bullets: [
      'Live Ratio — OpEx as a share of gross income, updated with every logged cost.',
      'Category Drill-Down — See exactly which expense line is growing faster than your rent.',
      'Margin Protection — Catch creeping costs while they\'re still fixable.',
    ],
    device: 'phone',
  },
  {
    name: 'Long-Term Appreciation',
    symbol: 'LTA',
    formula: 'CAGR of Property Value',
    tagline: 'The Return You Earn While Holding.',
    body: "Cash flow pays you monthly; appreciation builds your net worth. PaperWorking tracks your property's estimated market value over time — powered by live market data — so your equity growth is visible on the same dashboard as your income, and your hold-versus-exit decision is a calculation, not a guess.",
    bullets: [
      'Equity Trendline — Watch estimated value and equity build across your hold period.',
      'Market-Data Backed — Valuations grounded in live market data, clearly labeled as estimates.',
      'Exit Timing — Weigh appreciation against cash flow when deciding whether to hold or sell.',
    ],
    device: 'desktop',
  },
];

// ─── Status palette matching insights dashboard ──────────────────────────────
const C = {
  green: '#50B075',
  amber: '#E3A34E',
  red: '#D66262',
};

const statusColor = (status: 'good' | 'warn' | 'bad' | 'neutral') => {
  switch (status) {
    case 'good': return C.green;
    case 'warn': return C.amber;
    case 'bad':  return C.red;
    default:     return 'rgba(253,255,252,0.38)';
  }
};

// ─── Gauge component used for Occupancy Rate rendering ───────────────────────
function PercentageGauge({ value, min, max, goodMin, warnMin, unit = "%", isDark }: {
  value: number | null;
  min: number;
  max: number;
  goodMin: number;
  warnMin: number;
  unit?: string;
  isDark: boolean;
}) {
  const status =
    value === null  ? 'neutral' :
    value >= goodMin ? 'good'  :
    value >= warnMin ? 'warn'  : 'bad';
  const color    = statusColor(status);
  const pct      = value !== null ? ((Math.min(value, max) - min) / (max - min)) * 100 : 0;
  const mutedClr  = isDark ? 'rgba(253, 255, 252, 0.38)' : 'rgba(69, 73, 85, 0.5)';
  const barBg     = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(69, 73, 85, 0.09)';

  const warnPct = ((warnMin - min) / (max - min)) * 100;
  const goodPct = ((goodMin - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-baseline gap-1">
        <span
          className="text-5xl font-extrabold leading-none tabular-nums tracking-tight text-white"
          style={{ color: value !== null ? color : mutedClr }}
        >
          {value !== null ? value.toFixed(1) : '—'}
        </span>
        <span className="text-base font-semibold" style={{ color: mutedClr }}>{unit}</span>
      </div>

      <div className="relative h-3 rounded-full overflow-visible" style={{ background: barBg }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
        />
        {[warnPct, goodPct].map((tp, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${tp}%`, background: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[11px] font-mono" style={{ color: mutedClr }}>
        <span>{min}{unit}</span>
        <span style={{ color: C.amber }}>{warnMin}{unit}</span>
        <span style={{ color: C.green }}>{goodMin}{unit}+</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function MetricCarousel() {
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Compute live occupancy rate from DEMO_PROJECTS
  const computedOccupancy = useMemo(() => {
    const holdProjects = DEMO_PROJECTS.filter(p => p.dispositionType === 'RENT');
    const totalUnits = holdProjects.reduce((sum, p) => sum + (p.numberOfUnits ?? 0), 0);
    const occupiedUnits = holdProjects.reduce((sum, p) => sum + (p.occupiedUnits ?? 0), 0);
    return totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 85.7;
  }, []);

  // Compute live portfolio NOI components from DEMO_PROJECTS
  const computedNOI = useMemo(() => {
    const holdProjects = DEMO_PROJECTS.filter(p => p.dispositionType === 'RENT');
    let totalGrossRentalIncome = 0;
    let totalOtherIncome = 0;
    let totalVacancyLoss = 0;
    let totalExpenses = 0;
    let totalNoi = 0;
    
    holdProjects.forEach(p => {
      if (p.financials) {
        const metrics = deriveAllMetrics(p.financials as any, undefined, p.dispositionType, p.currentPhase);
        const comps = metrics.noiComponents;
        totalGrossRentalIncome += comps.grossRentalIncome;
        totalOtherIncome += comps.otherIncome;
        totalVacancyLoss += comps.vacancyLoss;
        totalExpenses += comps.totalOperatingExpenses;
        totalNoi += comps.noi;
      }
    });

    return {
      grossRentalIncome: totalGrossRentalIncome,
      otherIncome: totalOtherIncome,
      vacancyLoss: totalVacancyLoss,
      operatingExpenses: totalExpenses,
      noi: totalNoi
    };
  }, []);

  const activeKpi = HERO_KPIS[activeIdx];

  const handlePrev = () => {
    setActiveIdx((prev) => (prev === 0 ? HERO_KPIS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev === HERO_KPIS.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="relative py-24 bg-background overflow-hidden border-t border-b border-white/5">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-6 md:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-6">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>The Hero Tier</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-background mb-6 leading-tight">
            The 33 Numbers That Decide Whether Your Deal Makes Money
          </h2>

          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed font-normal mb-6">
            Ask a typical real estate investor for their NOI, their DSCR, or their cash-on-cash return, and most can't answer. They have a vague sense of profit or loss — and vague is expensive. PaperWorking gives you the 33 key performance indicators that savvy investors actually use to buy, hold, borrow, and sell — calculated automatically from the work you're already doing.
          </p>

          <Link
            href="/support/metrics"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:underline group cursor-pointer text-decoration-none"
          >
            Explore the Playbook (All 33 Metrics)
            <span className="material-symbols-outlined text-[14px] transition-transform duration-150 group-hover:translate-x-0.5">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Tab Selection Row */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none border-b border-white/5">
          {HERO_KPIS.map((kpi, idx) => {
            const isActive = activeIdx === idx;
            return (
              <button
                key={kpi.symbol}
                onClick={() => setActiveIdx(idx)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 border border-primary/20 text-primary'
                    : 'bg-transparent border border-transparent text-on-surface-variant/60 hover:text-on-surface'
                }`}
              >
                {kpi.name}
              </button>
            );
          })}
        </div>

        {/* Slide Showcase Split Layout */}
        <div className="relative glass-card border border-white/8 bg-surface-container-low/20 backdrop-blur-xl rounded-2xl p-6 md:p-10 min-h-[500px] flex flex-col lg:flex-row gap-10 items-center justify-between">
          
          {/* Left / Right Navigation Controls */}
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high/80 border border-white/10 text-on-surface hover:bg-surface-container-highest transition-all shadow-md cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high/80 border border-white/10 text-on-surface hover:bg-surface-container-highest transition-all shadow-md cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Copy Area (Left Side) */}
          <div className="flex-1 max-w-xl space-y-6 px-4 md:px-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-base font-extrabold text-primary font-jetbrains">
                {activeKpi.symbol}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-on-surface leading-tight">
                  {activeKpi.name}
                </h3>
                <div className="text-[12px] font-semibold text-primary/95 tracking-wide italic mt-0.5">
                  {activeKpi.tagline}
                </div>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              {activeKpi.body}
            </p>

            <ul className="space-y-3">
              {activeKpi.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-on-surface-variant/90 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Standard Formula</div>
              <div className="text-xs font-mono text-white bg-white/5 px-3 py-2 rounded-lg border border-white/5 inline-block">
                {activeKpi.formula}
              </div>
            </div>
          </div>

          {/* Visual Component Render inside Device Frame (Right Side) */}
          <div className="flex-1 w-full max-w-md flex justify-center items-center px-4 md:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeKpi.symbol}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {/* ── Slide 1: Occupancy Rate — Desktop Browser Frame ── */}
                {activeKpi.symbol === 'OCC' ? (
                  <div className="w-full rounded-2xl border border-white/10 bg-[#121014] shadow-2xl overflow-hidden font-hanken">
                    {/* Browser top-bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#1e1b22] border-b border-white/5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                        <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 border border-white/5 rounded-md text-[10px] text-on-surface-variant/60 w-52 justify-center font-mono select-none">
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">paperworking.io/insights</span>
                      </div>
                      <div className="w-12" /> {/* Spacer */}
                    </div>

                    {/* Browser content */}
                    <div className="p-6 bg-gradient-to-br from-[#121014] to-[#18151c] flex flex-col items-center justify-center min-h-[220px]">
                      {/* Obsidian Glass card containing the actual gauge */}
                      <div className="w-full max-w-[320px] rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-md p-5 flex flex-col gap-3 relative overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-[#9E9DA0] font-semibold tracking-wider uppercase">
                              Portfolio Occupancy
                            </span>
                            <h4 className="text-sm font-semibold text-white mt-0.5">Hold Phase Analytics</h4>
                          </div>
                          
                          {/* Live compliance label */}
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-medium text-on-surface-variant/60 uppercase tracking-widest select-none">
                            <span className="w-1 h-1 rounded-full bg-[#50B075] animate-pulse" />
                            <span>Demo Data</span>
                          </div>
                        </div>

                        {/* Real Gauge Component */}
                        <div className="py-2">
                          <PercentageGauge
                            value={computedOccupancy}
                            min={0}
                            max={100}
                            goodMin={90}
                            warnMin={80}
                            isDark={true}
                          />
                        </div>

                        <div className="text-[10px] text-on-surface-variant/40 text-center uppercase tracking-wider select-none mt-2 pt-2 border-t border-white/[0.03]">
                          Illustrative demo data
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeKpi.symbol === 'NOI' ? (
                  <div className="w-full max-w-[340px] mx-auto rounded-[32px] border-[10px] border-[#1e1b22] bg-[#121014] shadow-2xl overflow-hidden relative aspect-[3/4] flex flex-col font-hanken">
                    {/* Camera bezel notch */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#2a2730] z-20" />
                    
                    {/* Screen Content */}
                    <div className="flex-1 p-5 bg-gradient-to-br from-[#121014] to-[#18151c] flex flex-col justify-between overflow-hidden">
                      {/* Top Bar / Status */}
                      <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                        <div className="text-[10px] text-on-surface-variant/40 font-mono">08:00 AM</div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-medium text-on-surface-variant/60 uppercase tracking-widest select-none">
                          <span className="w-1 h-1 rounded-full bg-[#50B075] animate-pulse" />
                          <span>Tablet Mode</span>
                        </div>
                      </div>

                      {/* Main Card */}
                      <div className="flex-1 my-3 flex flex-col justify-center gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-primary font-bold uppercase tracking-wider">
                            Portfolio NOI Analysis
                          </span>
                          <h4 className="text-xs font-semibold text-white">Net Operating Income</h4>
                        </div>

                        {/* Real computations readout */}
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-[#50B075] tracking-tight font-mono">
                            ${(computedNOI.noi / 1000).toFixed(1)}k
                          </span>
                          <span className="text-[10px] text-on-surface-variant/60 font-medium">/ year</span>
                        </div>
                        
                        {/* Breakdown waterfall bars */}
                        <div className="space-y-2.5 pt-1">
                          {/* Gross Rental Income */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[9px] text-on-surface-variant/80 font-mono">
                              <span>Gross Revenue</span>
                              <span className="text-white">${((computedNOI.grossRentalIncome + computedNOI.otherIncome) / 1000).toFixed(1)}k</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-white/40 rounded-full" style={{ width: '100%' }} />
                            </div>
                          </div>

                          {/* Vacancy Loss */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[9px] text-[#D66262] font-mono">
                              <span>Vacancy Loss</span>
                              <span>-${(computedNOI.vacancyLoss / 1000).toFixed(1)}k</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[#D66262]/80 rounded-full" style={{ width: `${(computedNOI.vacancyLoss / (computedNOI.grossRentalIncome + computedNOI.otherIncome)) * 100}%` }} />
                            </div>
                          </div>

                          {/* Operating Expenses */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[9px] text-[#D66262] font-mono">
                              <span>Operating Costs</span>
                              <span>-${(computedNOI.operatingExpenses / 1000).toFixed(1)}k</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[#D66262]/80 rounded-full" style={{ width: `${(computedNOI.operatingExpenses / (computedNOI.grossRentalIncome + computedNOI.otherIncome)) * 100}%` }} />
                            </div>
                          </div>

                          {/* Net profit margin yield percentage */}
                          <div className="text-[9px] text-on-surface-variant/60 flex items-center justify-between pt-0.5 font-mono border-t border-white/[0.03]">
                            <span>NOI Yield Margin</span>
                            <span className="text-[#50B075] font-bold">
                              {((computedNOI.noi / (computedNOI.grossRentalIncome + computedNOI.otherIncome)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer Info */}
                      <div className="pt-2 border-t border-white/5 text-center">
                        <span className="inline-block text-[8px] text-on-surface-variant/35 uppercase tracking-wider select-none font-mono">
                          Illustrative demo data
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Other slides: display a placeholder showing in-progress status, maintaining layout
                  <div className="w-full rounded-2xl border border-white/10 bg-[#121014] shadow-2xl p-6 min-h-[260px] flex flex-col justify-between items-center text-center">
                    <div className="flex flex-col items-center gap-3 mt-4">
                      {activeKpi.device === 'tablet' && <Tablet className="w-10 h-10 text-on-surface-variant/40" />}
                      {activeKpi.device === 'phone' && <Smartphone className="w-10 h-10 text-on-surface-variant/40" />}
                      {activeKpi.device === 'desktop' && <Monitor className="w-10 h-10 text-on-surface-variant/40" />}
                      <span className="text-xs text-on-surface-variant/60 font-semibold uppercase tracking-widest mt-2">
                        {activeKpi.name} Mockup
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 w-full max-w-[280px] bg-white/[0.01] border border-white/5 p-4 rounded-xl backdrop-blur-md">
                      <div className="text-3xl font-extrabold text-white">
                        {activeKpi.symbol === 'CF' ? '$8.7k/mo' : '—'}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-on-surface-variant/40 select-none">
                        Illustrative demo data
                      </div>
                    </div>

                    <div className="text-[9px] uppercase tracking-widest text-[#E3A34E]/80 font-bold bg-[#E3A34E]/10 border border-[#E3A34E]/20 px-2 py-0.5 rounded mt-4">
                      Slide implementation pending
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Footer info line */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-8 gap-4">
          <div className="text-sm font-semibold tracking-wide text-primary uppercase font-jetbrains">
            Volume is their pitch. Clarity is ours.
          </div>
          <div className="text-[11px] text-on-surface-variant/50 select-none">
            * Values derived from default portfolio underwriting templates.
          </div>
        </div>

      </div>
    </section>
  );
}
