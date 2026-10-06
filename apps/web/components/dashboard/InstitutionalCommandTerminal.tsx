'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CaretDown,
  Calculator,
  ChartLineUp,
  Folder,
  ArrowRight,
  ShieldCheck,
  WarningCircle,
  Clock,
  FileText,
  CheckCircle,
  Buildings,
  ArrowsClockwise,
  Check,
} from '../icons/PhosphorIcons';

export interface InstitutionalCommandTerminalProps {
  portfolioName?: string;
  defaultPhase?: 'Acquisition' | 'Fund' | 'Hold' | 'Exit';
}

export default function InstitutionalCommandTerminal({
  portfolioName = 'Portfolio: Multi-Asset Fund I (12 Assets)',
  defaultPhase = 'Hold',
}: InstitutionalCommandTerminalProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolioName);
  const [activePhase, setActivePhase] = useState<'Acquisition' | 'Fund' | 'Hold' | 'Exit'>(defaultPhase);
  const [isPortfolioDropdownOpen, setIsPortfolioDropdownOpen] = useState(false);

  // Portfolio items
  const portfolioOptions = [
    'Portfolio: Multi-Asset Fund I (12 Assets)',
    'Portfolio: Austin Single-Family Growth (8 Assets)',
    'Portfolio: Denver Value-Add Multifamily (4 Assets)',
    'Portfolio: Apex High-Yield Commercial Fund (6 Assets)',
  ];

  // Checklist items for Module 3 Risk & Contingency card
  const [checklist, setChecklist] = useState([
    { id: 'c1', label: 'Title Search', status: 'Verified', completed: true },
    { id: 'c2', label: 'Property Inspection', status: 'Verified', completed: true },
    { id: 'c3', label: 'Financing Commitment', status: 'Pending Review', completed: false },
    { id: 'c4', label: 'Environmental Phase I', status: 'Waived / Clean', completed: true },
  ]);

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <div
      data-testid="institutional-command-terminal"
      className="w-full bg-[#0F172A] text-[#F8FAFC] font-sans antialiased selection:bg-[#06B6D4]/30 selection:text-white"
    >
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">

        {/* ==================================================================== */}
        {/* MODULE 1: INSTITUTIONAL HEADER & TICKER                               */}
        {/* ==================================================================== */}
        <header
          data-testid="terminal-header"
          className="rounded-none border border-[#334155] bg-[#1E293B]/90 backdrop-blur p-4 sm:p-5 shadow-2xl space-y-4"
        >
          {/* Top Row: Terminal Title & Multi-Asset Portfolio Dropdown */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#334155]/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-none border border-[#06B6D4]/40 bg-[#06B6D4]/10 text-[#06B6D4] shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                <Buildings className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-mono text-sm sm:text-base font-bold tracking-wider text-[#F8FAFC] uppercase">
                    PaperWorking <span className="text-[#06B6D4] font-normal">//</span> Command Terminal
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    </span>
                    LIVE FEED
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] font-sans">
                  Institutional Real Estate Operating System • Bloomberg Terminal Architecture
                </p>
              </div>
            </div>

            {/* Portfolio Selector Multi-Asset Dropdown */}
            <div className="relative">
              <label htmlFor="portfolio-select" className="sr-only">
                Select Portfolio
              </label>
              <button
                type="button"
                id="portfolio-select"
                data-testid="portfolio-selector-dropdown"
                onClick={() => setIsPortfolioDropdownOpen((prev) => !prev)}
                className="flex w-full sm:w-auto items-center justify-between gap-3 px-3.5 py-2 min-h-[44px] rounded-none border border-[#334155] bg-[#0F172A] hover:border-[#06B6D4]/60 text-xs font-mono text-[#F8FAFC] transition-colors focus:outline-none focus:ring-1 focus:ring-[#06B6D4]"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="text-[#94A3B8]">PORTFOLIO:</span>
                  <span className="font-semibold text-[#06B6D4] truncate max-w-[240px] sm:max-w-[300px]">
                    {selectedPortfolio.replace('Portfolio: ', '')}
                  </span>
                </div>
                <CaretDown className={`h-4 w-4 text-[#94A3B8] transition-transform ${isPortfolioDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPortfolioDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-full sm:w-80 rounded-none border border-[#334155] bg-[#0F172A] p-1.5 shadow-2xl">
                  {portfolioOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSelectedPortfolio(opt);
                        setIsPortfolioDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs font-mono text-left transition-colors min-h-[40px] ${
                        selectedPortfolio === opt
                          ? 'bg-[#06B6D4]/15 text-[#06B6D4] font-bold'
                          : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {selectedPortfolio === opt && <Check className="h-3.5 w-3.5 text-[#06B6D4]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Metrics Bar: Horizontal Ticker */}
          <div
            data-testid="top-metrics-ticker"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono"
          >
            {/* Metric 1: Total AUM */}
            <div className="border border-[#334155]/80 bg-[#0F172A]/70 p-3 sm:p-4 rounded-none">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#94A3B8]">
                <span>Total AUM</span>
                <span className="text-[#10B981] font-mono text-[10px] bg-[#10B981]/10 px-1 py-0.2 border border-[#10B981]/30">
                  +14.2% YoY
                </span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[#F8FAFC]">
                $42.8M
              </div>
              <div className="mt-1 text-[11px] text-[#94A3B8] font-sans">
                Deployed across 12 institutional holdings
              </div>
            </div>

            {/* Metric 2: Active Projects */}
            <div className="border border-[#334155]/80 bg-[#0F172A]/70 p-3 sm:p-4 rounded-none">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#94A3B8]">
                <span>Active Projects</span>
                <span className="text-[#06B6D4] font-mono text-[10px] bg-[#06B6D4]/10 px-1 py-0.2 border border-[#06B6D4]/30">
                  REIL Active
                </span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[#06B6D4]">
                8
              </div>
              <div className="mt-1 text-[11px] text-[#94A3B8] font-sans">
                4 Underwriting • 2 Funding • 2 Holding
              </div>
            </div>

            {/* Metric 3: Blended IRR */}
            <div className="border border-[#334155]/80 bg-[#0F172A]/70 p-3 sm:p-4 rounded-none">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#94A3B8]">
                <span>Blended IRR</span>
                <span className="text-[#10B981] font-mono text-[10px] bg-[#10B981]/10 px-1 py-0.2 border border-[#10B981]/30">
                  Target: 16.0%
                </span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[#10B981]">
                18.4%
              </div>
              <div className="mt-1 text-[11px] text-[#94A3B8] font-sans">
                +240 bps above hurdle benchmark
              </div>
            </div>

            {/* Metric 4: Avg. Cap Rate */}
            <div className="border border-[#334155]/80 bg-[#0F172A]/70 p-3 sm:p-4 rounded-none">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#94A3B8]">
                <span>Avg. Cap Rate</span>
                <span className="text-[#94A3B8] font-mono text-[10px] bg-[#334155]/40 px-1 py-0.2 border border-[#334155]">
                  Weighted
                </span>
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[#F8FAFC]">
                6.8%
              </div>
              <div className="mt-1 text-[11px] text-[#94A3B8] font-sans">
                Yield on stabilization cost basis
              </div>
            </div>
          </div>
        </header>

        {/* ==================================================================== */}
        {/* MODULE 2: 4-PHASE LIFECYCLE STATUS BAR (REIL)                        */}
        {/* ==================================================================== */}
        <section
          data-testid="reil-lifecycle-bar"
          aria-label="Investment Lifecycle Status"
          className="border border-[#334155] bg-[#1E293B]/80 p-2 sm:p-3"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
              Real Estate Investment Lifecycle (REIL) State Monitor
            </span>
            <span className="text-[11px] font-mono text-[#06B6D4]">
              Active Stage: Phase 3 [Hold]
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
            {/* Phase 1: Acquisition (Inactive) */}
            <button
              type="button"
              onClick={() => setActivePhase('Acquisition')}
              className={`flex flex-col p-3 text-left transition-all border min-h-[64px] justify-center ${
                activePhase === 'Acquisition'
                  ? 'border-[#06B6D4] bg-[#06B6D4]/15 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : 'border-[#334155] bg-[#0F172A]/60 hover:border-[#334155]/90 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F8FAFC]">Phase 1: Acquisition</span>
                <span className="text-[10px] text-[#94A3B8]">[UNDERWRITING]</span>
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">
                Pipeline: 4 Deals Sourced
              </div>
            </button>

            {/* Phase 2: Fund (Inactive) */}
            <button
              type="button"
              onClick={() => setActivePhase('Fund')}
              className={`flex flex-col p-3 text-left transition-all border min-h-[64px] justify-center ${
                activePhase === 'Fund'
                  ? 'border-[#06B6D4] bg-[#06B6D4]/15 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : 'border-[#334155] bg-[#0F172A]/60 hover:border-[#334155]/90 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F8FAFC]">Phase 2: Fund</span>
                <span className="text-[10px] text-[#94A3B8]">[CAPITAL STACK]</span>
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">
                Closing: $3.2M Senior Debt
              </div>
            </button>

            {/* Phase 3: Hold (Active state - Cyan glow badge) */}
            <button
              type="button"
              onClick={() => setActivePhase('Hold')}
              className={`flex flex-col p-3 text-left transition-all border min-h-[64px] justify-center ${
                activePhase === 'Hold'
                  ? 'border-[#06B6D4] bg-[#06B6D4]/15 shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-[#06B6D4]'
                  : 'border-[#334155] bg-[#0F172A]/60 hover:border-[#334155]/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#06B6D4] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#06B6D4]" />
                  </span>
                  <span className="text-xs font-bold text-[#F8FAFC]">Phase 3: Hold</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#06B6D4] text-[#0F172A] shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                  ACTIVE
                </span>
              </div>
              <div className="text-[11px] text-[#06B6D4] mt-1 font-sans font-medium">
                Renovation &amp; Asset Management (62% Executed)
              </div>
            </button>

            {/* Phase 4: Exit (Inactive) */}
            <button
              type="button"
              onClick={() => setActivePhase('Exit')}
              className={`flex flex-col p-3 text-left transition-all border min-h-[64px] justify-center ${
                activePhase === 'Exit'
                  ? 'border-[#06B6D4] bg-[#06B6D4]/15 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : 'border-[#334155] bg-[#0F172A]/60 hover:border-[#334155]/90 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F8FAFC]">Phase 4: Exit</span>
                <span className="text-[10px] text-[#94A3B8]">[DISPOSITION]</span>
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">
                Target Realization: Q4 2027
              </div>
            </button>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* MODULE 3: CENTRAL INTELLIGENCE GRID (3-COLUMN KPI CARDS)             */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Card 1: Deal Calculator Card */}
          <article
            data-testid="card-deal-calculator"
            className="rounded-none border border-[#334155] bg-[#1E293B]/90 p-4 sm:p-5 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between border-b border-[#334155]/60 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4.5 w-4.5 text-[#06B6D4]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
                    Live Deal Calculator
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-[#334155] bg-[#0F172A] text-[#10B981]">
                  PRO-FORMA VERIFIED
                </span>
              </div>

              {/* Property Title & Specs */}
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                    742 Evergreen Terrace
                  </h2>
                  <span className="text-xs font-mono font-semibold text-[#06B6D4]">
                    24 Units
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Class B+ Multifamily • Austin, TX Submarket
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="mt-4 grid grid-cols-3 gap-2 font-mono">
                <div className="border border-[#334155]/60 bg-[#0F172A] p-2.5 text-center">
                  <div className="text-[10px] uppercase text-[#94A3B8]">Cap Rate</div>
                  <div className="text-base sm:text-lg font-bold text-[#10B981] mt-0.5">7.1%</div>
                  <div className="text-[9px] text-[#94A3B8]">Yield on Cost</div>
                </div>
                <div className="border border-[#334155]/60 bg-[#0F172A] p-2.5 text-center">
                  <div className="text-[10px] uppercase text-[#94A3B8]">Cash-on-Cash</div>
                  <div className="text-base sm:text-lg font-bold text-[#06B6D4] mt-0.5">8.2%</div>
                  <div className="text-[9px] text-[#94A3B8]">Yr 1 Levered</div>
                </div>
                <div className="border border-[#334155]/60 bg-[#0F172A] p-2.5 text-center">
                  <div className="text-[10px] uppercase text-[#94A3B8]">DSCR</div>
                  <div className="text-base sm:text-lg font-bold text-[#F8FAFC] mt-0.5">1.35x</div>
                  <div className="text-[9px] text-[#10B981]">Stress-tested</div>
                </div>
              </div>

              {/* Visual Valuation Gauge */}
              <div className="mt-4 border border-[#334155]/60 bg-[#0F172A] p-3">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-[#94A3B8]">Valuation Gauge</span>
                  <span className="text-[#10B981] font-bold">$6,450,000 ARV</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2.5 rounded-none overflow-hidden relative border border-[#334155]/60">
                  <div
                    className="h-full bg-gradient-to-r from-[#06B6D4] to-[#10B981] transition-all"
                    style={{ width: '78%' }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#94A3B8] mt-1.5">
                  <span>Acquisition: $4.95M</span>
                  <span>Break-Even: $5.40M</span>
                  <span className="text-[#10B981]">Max Target: $6.8M</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#334155]/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#94A3B8]">
                Underwritten: 33 Datapoints
              </span>
              <Link
                href="/deal-calculator"
                className="text-xs font-mono font-semibold text-[#06B6D4] hover:underline flex items-center gap-1"
              >
                Open Calculator <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>

          {/* Card 2: Budget vs. Actual Card */}
          <article
            data-testid="card-budget-vs-actual"
            className="rounded-none border border-[#334155] bg-[#1E293B]/90 p-4 sm:p-5 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between border-b border-[#334155]/60 pb-3">
                <div className="flex items-center gap-2">
                  <ChartLineUp className="h-4.5 w-4.5 text-[#10B981]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
                    Budget vs. Actual Variance
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
                  ON TRACK (-2.1%)
                </span>
              </div>

              {/* Holding Cost Ticker */}
              <div className="mt-3 p-3 border border-[#334155]/80 bg-[#0F172A] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#94A3B8]">
                    Active Holding Costs
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F8FAFC] mt-0.5">
                    $12,400<span className="text-xs text-[#94A3B8] font-normal">/mo carrying cost</span>
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-[#94A3B8]">
                  <div>Debt: $8,900</div>
                  <div>Tax/Ins: $3,500</div>
                </div>
              </div>

              {/* Dual-Bar Visualization: Renovation Spend */}
              <div className="mt-4 space-y-3 font-mono">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#94A3B8]">Budgeted Renovation</span>
                    <span className="text-[#F8FAFC] font-bold">$380,000</span>
                  </div>
                  <div className="w-full bg-[#0F172A] h-3 border border-[#334155]/60 overflow-hidden">
                    <div className="h-full bg-[#94A3B8]/60" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#06B6D4]">Actual Disbursed Spend</span>
                    <span className="text-[#06B6D4] font-bold">$242,500 (63.8%)</span>
                  </div>
                  <div className="w-full bg-[#0F172A] h-3 border border-[#334155]/60 overflow-hidden relative">
                    <div
                      className="h-full bg-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      style={{ width: '63.8%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Milestone Allocation Breakdown */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="border border-[#334155]/40 bg-[#0F172A]/50 p-2">
                  <div className="text-[10px] text-[#94A3B8]">Contractor Draws</div>
                  <div className="font-bold text-[#F8FAFC] mt-0.5">Draw 4 of 6 Approved</div>
                </div>
                <div className="border border-[#334155]/40 bg-[#0F172A]/50 p-2">
                  <div className="text-[10px] text-[#94A3B8]">Contingency Reserve</div>
                  <div className="font-bold text-[#10B981] mt-0.5">$38,000 Remaining</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#334155]/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#94A3B8]">
                General Contractor: Apex Build Co
              </span>
              <span className="text-xs font-mono text-[#10B981]">
                Draws Audited
              </span>
            </div>
          </article>

          {/* Card 3: Risk & Contingency Alert Card */}
          <article
            data-testid="card-risk-contingency-alert"
            className="rounded-none border border-[#F59E0B]/50 bg-[#1E293B]/90 p-4 sm:p-5 shadow-xl flex flex-col justify-between relative overflow-hidden"
          >
            {/* Top Amber Glowing Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]" />

            <div>
              {/* Alert Header */}
              <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3">
                <div className="flex items-center gap-2">
                  <WarningCircle className="h-5 w-5 text-[#F59E0B]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#F59E0B] font-bold">
                    Risk &amp; Contingency Protocol
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 font-bold animate-pulse">
                  CRITICAL TIMELINE
                </span>
              </div>

              {/* High-Visibility Amber Alert Banner */}
              <div className="mt-3.5 p-3.5 border border-[#F59E0B]/60 bg-[#F59E0B]/10 rounded-none shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <div className="flex items-start gap-2.5">
                  <Clock className="h-5 w-5 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-[#F59E0B] flex items-center gap-1.5">
                      ⚠️ Earnest Date: 4 Days Remaining
                    </div>
                    <p className="text-xs text-[#F8FAFC]/90 mt-1 font-sans">
                      $50,000 Earnest Money goes hard on <strong className="font-mono text-white">Oct 5, 2026</strong> at 5:00 PM EST. Final lender term sign-off required.
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Checklist */}
              <div className="mt-4 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
                  Contingency Release Checklist
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  {checklist.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChecklist(item.id)}
                      className={`flex w-full items-center justify-between p-2 text-left border transition-colors ${
                        item.completed
                          ? 'border-[#10B981]/40 bg-[#10B981]/5 text-[#F8FAFC]'
                          : 'border-[#F59E0B]/40 bg-[#F59E0B]/5 text-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-4 w-4 items-center justify-center border ${
                            item.completed
                              ? 'border-[#10B981] bg-[#10B981] text-[#0F172A]'
                              : 'border-[#F59E0B] bg-transparent'
                          }`}
                        >
                          {item.completed && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className={item.completed ? 'line-through text-[#94A3B8]' : 'font-semibold'}>
                          {item.label}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 border ${
                          item.completed
                            ? 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]'
                            : 'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]'
                        }`}
                      >
                        {item.completed ? 'COMPLETED' : item.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#334155]/60 flex items-center justify-between font-mono text-xs">
              <span className="text-[#94A3B8]">Escrow Vault: Heritage Title</span>
              <span className="text-[#F59E0B] font-bold">Action Needed</span>
            </div>
          </article>
        </div>

        {/* ==================================================================== */}
        {/* MODULE 4: PROJECT TIMELINE & DOCUMENT VAULT (BOTTOM GRID)            */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Module 4A: Gantt / Task Timeline (8 Cols on Desktop) */}
          <section
            data-testid="gantt-timeline-module"
            aria-label="Contractor & Milestone Timeline"
            className="lg:col-span-8 rounded-none border border-[#334155] bg-[#1E293B]/90 p-4 sm:p-5 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#334155]/60 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-[#06B6D4]" />
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
                    Gantt / Contractor Milestone Timeline — Hold Phase
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-[#10B981]">
                    <span className="h-2 w-2 bg-[#10B981]" /> Complete
                  </span>
                  <span className="flex items-center gap-1 text-[#06B6D4]">
                    <span className="h-2 w-2 bg-[#06B6D4]" /> In Progress
                  </span>
                  <span className="flex items-center gap-1 text-[#94A3B8]">
                    <span className="h-2 w-2 bg-[#334155]" /> Scheduled
                  </span>
                </div>
              </div>

              {/* Gantt Timeline Bar Graph */}
              <div className="mt-4 space-y-3 font-mono">
                {/* Task 1 */}
                <div className="border border-[#334155]/50 bg-[#0F172A]/70 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-1.5 gap-1">
                    <span className="font-bold text-[#F8FAFC]">1. Interior Demolition &amp; Hazardous Material Abatement</span>
                    <span className="text-[11px] text-[#10B981] font-semibold">100% Complete • Approved</span>
                  </div>
                  <div className="w-full bg-[#1E293B] h-3 border border-[#334155]/40 overflow-hidden">
                    <div className="h-full bg-[#10B981]" style={{ width: '100%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1 font-sans">
                    <span>Apex Demolition Services</span>
                    <span>Aug 01 - Aug 20</span>
                  </div>
                </div>

                {/* Task 2 */}
                <div className="border border-[#06B6D4]/40 bg-[#0F172A]/70 p-3 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-1.5 gap-1">
                    <span className="font-bold text-[#F8FAFC]">2. MEP Rough-In (Mechanical, Electrical, Plumbing)</span>
                    <span className="text-[11px] text-[#06B6D4] font-semibold">72% Active • Inspection Friday</span>
                  </div>
                  <div className="w-full bg-[#1E293B] h-3 border border-[#334155]/40 overflow-hidden relative">
                    <div
                      className="h-full bg-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      style={{ width: '72%' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1 font-sans">
                    <span>LoneStar MEP Trades LLC</span>
                    <span>Aug 21 - Oct 15</span>
                  </div>
                </div>

                {/* Task 3 */}
                <div className="border border-[#334155]/50 bg-[#0F172A]/70 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-1.5 gap-1">
                    <span className="font-bold text-[#F8FAFC]">3. Drywall, Flooring &amp; Cabinetry Fit-Out</span>
                    <span className="text-[11px] text-[#94A3B8]">Scheduled • Materials Staged</span>
                  </div>
                  <div className="w-full bg-[#1E293B] h-3 border border-[#334155]/40 overflow-hidden">
                    <div className="h-full bg-[#334155]" style={{ width: '15%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1 font-sans">
                    <span>Highland Finish Carpentry</span>
                    <span>Oct 16 - Dec 01</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#334155]/60 flex items-center justify-between text-xs font-mono">
              <span className="text-[#94A3B8]">Target Completion: Nov 30, 2026</span>
              <span className="text-[#10B981]">On Critical Path</span>
            </div>
          </section>

          {/* Module 4B: Document Vault Preview (4 Cols on Desktop) */}
          <section
            data-testid="document-vault-module"
            aria-label="Secured Document Vault"
            className="lg:col-span-4 rounded-none border border-[#334155] bg-[#1E293B]/90 p-4 sm:p-5 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#334155]/60 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-[#06B6D4]" />
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
                    Document Vault Preview
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  AES-256
                </span>
              </div>

              {/* Secured Contracts List */}
              <div className="mt-3.5 space-y-2.5">
                {/* Contract 1 */}
                <div className="p-3 border border-[#334155] bg-[#0F172A] flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-[#06B6D4] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-[#F8FAFC] truncate">
                        Purchase_Agreement_v3.pdf
                      </div>
                      <div className="text-[11px] text-[#94A3B8] font-sans">
                        Executed PSA • 18.4 MB
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                    Verified
                  </span>
                </div>

                {/* Contract 2 */}
                <div className="p-3 border border-[#334155] bg-[#0F172A] flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-[#F59E0B] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-[#F8FAFC] truncate">
                        Lender_Rate_Lock_Agreement.pdf
                      </div>
                      <div className="text-[11px] text-[#94A3B8] font-sans">
                        Apex Capital • 4.2 MB
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                    Pending E-Sign
                  </span>
                </div>

                {/* Contract 3 */}
                <div className="p-3 border border-[#334155] bg-[#0F172A] flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <ShieldCheck className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-[#F8FAFC] truncate">
                        Title_Commitment_Schedule_B.pdf
                      </div>
                      <div className="text-[11px] text-[#94A3B8] font-sans">
                        Heritage Title • 6.8 MB
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#334155]/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#94A3B8]">
                Vault Capacity: 3 of 12 Files
              </span>
              <button
                type="button"
                className="text-xs font-mono font-semibold text-[#06B6D4] hover:underline"
              >
                Access Full Vault →
              </button>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
