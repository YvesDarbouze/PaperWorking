'use client';

/**
 * MetricsCarouselShell — Above-fold KPI carousel in the hero section.
 *
 * Architecture:
 * - METRIC_SLIDES registry holds 10 canonical KPI entries in the exact order
 *   demanded by the prompt pack checklist. Each slide's `content` field is
 *   the real dashboard component with seeded demo data.
 * - Shell handles auto-advance (7 s), pause-on-hover/focus, dismiss,
 *   pointer/touch swipe, prev/next buttons, dot nav, and numeric counter.
 * - "Illustrative demo data" badge is always visible (Honesty Rule).
 *
 * Visual Styling (ui-ux-pro-max):
 * - Frosted glass panel backgrounds and thin border outlines.
 * - Subtle borderless control overlays that scale and light up on hover.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Real dashboard metric components ─────────────────────────
import NOIBreakdownChart from '@/components/metrics/phase3/NOIBreakdownChart';
import CashFlowMeter from '@/components/metrics/phase3/CashFlowMeter';
import { CapRateIntelligenceCard } from '@/components/intelligence/CapRateIntelligenceCard';
import { CoCReturnCard } from '@/components/metrics/phase4/CoCReturnCard';
import { GRMComparisonCard } from '@/components/intelligence/GRMComparisonCard';
import DSCRGauge from '@/components/metrics/phase2/DSCRGauge';
import { IRRScenarioComparisonCard } from '@/components/intelligence/IRRScenarioComparisonCard';
import OccupancyCard from '@/components/metrics/phase3/OccupancyCard';
import OERIndicator from '@/components/metrics/phase3/OERIndicator';
import AppreciationChart from '@/components/Charts/AppreciationChart';
import { ProjectFinancials } from '@/types/schema';

// ── Metric calculation engine ────────────────────────────────
import {
  computeNOIComponents,
  computeAnnualDebtService,
  computeCashFlow,
  computeTotalCashInvested,
} from '@/lib/metrics';

// ── Canonical seeded demo dataset ────────────────────────────
// Fictional 4-unit residential rental: "Maple Creek — 4-Plex"
// Never present these as a real client's results (Honesty Rule).

const DEMO_FINANCIALS: ProjectFinancials = {
  purchasePrice: 485_000,
  estimatedARV: 620_000,
  projectedRehabCost: 42_000,
  fixedAcquisitionCosts: 9_700,
  loanAmount: 388_000,
  loanInterestRate: 7.25,
  loanTermYears: 30,

  // Rental income
  monthlyGrossRent: 8_200,          // 4 units × $2,050/unit
  otherMonthlyIncome: 480,          // laundry + storage
  vacancyRatePercent: 5.5,
  numberOfUnits: 4,
  occupiedUnits: 4,

  // Operating expenses (monthly amounts)
  holdingCostTaxes: 600,            // $7,200/yr
  holdingCostInsurance: 310,        // $3,720/yr
  propertyManagementFeePercent: 8,
  monthlyMaintenanceReserve: 385,
  monthlyHOA: 0,

  // Exit / sale data
  actualSalePrice: 648_000,
  buyersAgentCommission: 2.5,
  sellersAgentCommission: 2.5,
  finalClosingCosts: 6_800,
  totalHoldingCosts: 28_400,

  // Required non-null fields
  costs: [
    { id: 'c1', description: 'Kitchen remodel', amount: 18_500, approved: true, addedBy: 'demo', createdAt: new Date('2025-03-01'), category: 'Other' },
    { id: 'c2', description: 'Bathroom renovations (4 units)', amount: 12_400, approved: true, addedBy: 'demo', createdAt: new Date('2025-03-15'), category: 'Plumbing' },
    { id: 'c3', description: 'HVAC replacement', amount: 11_100, approved: true, addedBy: 'demo', createdAt: new Date('2025-04-01'), category: 'HVAC' },
  ],
};

const AUTO_MS = 7_000;

export interface MetricSlide {
  id: number;
  metricId: string;
  name: string;
  badge: string;
  content: React.ReactNode;
}

export default function MetricsCarouselShell() {
  const [financials, setFinancials] = useState<ProjectFinancials>(DEMO_FINANCIALS);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('nullMetric') === 'true') {
      setFinancials({
        purchasePrice: 0,
        estimatedARV: 0,
        monthlyGrossRent: 0,
        otherMonthlyIncome: 0,
        vacancyRatePercent: 0,
        numberOfUnits: 4,
        occupiedUnits: 0,
        loanAmount: 0,
        loanInterestRate: 0,
        loanTermYears: 30,
        holdingCostTaxes: 0,
        holdingCostInsurance: 0,
        propertyManagementFeePercent: 0,
        monthlyMaintenanceReserve: 0,
        monthlyHOA: 0,
        costs: [],
      });
    } else if (params.get('testSeed') === 'true') {
      setFinancials({
        ...DEMO_FINANCIALS,
        purchasePrice: 550_000,
        estimatedARV: 680_000,
        monthlyGrossRent: 9_500,
        loanAmount: 440_000,
      });
    }
  }, []);

  // Compute derived variables reactively from financials state:
  const purchasePrice = financials.purchasePrice ?? 0;
  const estimatedARV = financials.estimatedARV ?? 0;
  const projectedRehabCost = financials.projectedRehabCost ?? 0;
  const fixedAcquisitionCosts = financials.fixedAcquisitionCosts ?? 0;
  const loanAmount = financials.loanAmount ?? 0;
  const loanInterestRate = financials.loanInterestRate ?? 0;
  const loanTermYears = financials.loanTermYears ?? 30;

  const noiComponents = computeNOIComponents(financials);
  const noi = noiComponents.noi;

  const loanTermMonths = loanTermYears * 12;
  const annualDebtService = computeAnnualDebtService(
    loanAmount,
    loanInterestRate,
    loanTermMonths
  );

  const { annual: annualCashFlow } = computeCashFlow(
    noi,
    annualDebtService
  );

  const totalCashInvested = computeTotalCashInvested(financials);

  const downPayment = purchasePrice > 0 ? purchasePrice - loanAmount : 0;
  const closingCosts = fixedAcquisitionCosts;
  const rehab = projectedRehabCost;
  const holdingCosts = financials.totalHoldingCosts ?? 0;

  const deals = purchasePrice > 0 && (financials.monthlyGrossRent ?? 0) > 0 ? [{
    id: 'demo-1',
    address: '4-Plex · Maple Creek',
    propertyPrice: purchasePrice,
    grossAnnualRent: (financials.monthlyGrossRent ?? 0) * 12,
  }] : [];

  const irrInputs = {
    totalCashInvested,
    annualCashFlow,
    purchasePrice,
    loanAmount,
    loanRate: loanInterestRate,
    loanTermYears,
  };

  const occupiedUnits = financials.occupiedUnits ?? 0;
  const totalUnits = financials.numberOfUnits ?? 0;
  const monthlyRentPerUnit = totalUnits > 0 ? (financials.monthlyGrossRent ?? 0) / totalUnits : 0;

  const operatingExpenses = noiComponents.totalOperatingExpenses;
  const grossRentalIncome = noiComponents.grossRentalIncome;

  const appreciationRate = 3;
  const basis = purchasePrice + fixedAcquisitionCosts;
  const appreciationData = Array.from({ length: 15 }, (_, i) => {
    const year = i + 1;
    const projected = estimatedARV * Math.pow(1 + appreciationRate / 100, year - 1);
    const cagr = basis > 0 ? (Math.pow(projected / basis, 1 / year) - 1) * 100 : 0;
    return { year, rate: cagr, isRealized: false as const };
  });

  const slides: MetricSlide[] = useMemo(() => [
    // ── METRIC-1: Net Operating Income ────────────────────────
    {
      id: 1,
      metricId: 'NOI',
      name: 'Net Operating Income',
      badge: 'Core Profitability',
      content: (
        <NOIBreakdownChart
          financials={financials}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-2: Cash Flow ───────────────────────────────────
    {
      id: 2,
      metricId: 'CASH_FLOW',
      name: 'Cash Flow',
      badge: 'Yield Analysis',
      content: (
        <CashFlowMeter
          noi={noi}
          annualDebtService={annualDebtService}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-3: Cap Rate ────────────────────────────────────
    {
      id: 3,
      metricId: 'CAP_RATE',
      name: 'Cap Rate',
      badge: 'Yield Analysis',
      content: (
        <CapRateIntelligenceCard
          noi={noi}
          purchasePrice={purchasePrice}
          marketAvgCapRate={5.2}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-4: Cash-on-Cash Return ─────────────────────────
    {
      id: 4,
      metricId: 'COC',
      name: 'Cash-on-Cash Return',
      badge: 'Leveraged Yield',
      content: (
        <CoCReturnCard
          annualCashFlow={annualCashFlow}
          totalCashInvested={totalCashInvested}
          breakdown={{
            downPayment,
            closingCosts,
            rehab,
            holdingCosts,
          }}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-5: Gross Rent Multiplier ──────────────────────
    {
      id: 5,
      metricId: 'GRM',
      name: 'Gross Rent Multiplier',
      badge: 'Valuation Index',
      content: (
        <GRMComparisonCard
          deals={deals}
          marketGRM={10.5}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-6: Debt Service Coverage Ratio ────────────────
    {
      id: 6,
      metricId: 'DSCR',
      name: 'Debt Service Coverage',
      badge: 'Risk & Leverage',
      content: (
        <DSCRGauge
          noi={noi}
          annualDebtService={annualDebtService}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-7: Internal Rate of Return ────────────────────
    {
      id: 7,
      metricId: 'IRR',
      name: 'Internal Rate of Return',
      badge: 'Lifetime Returns',
      content: (
        <IRRScenarioComparisonCard
          inputs={irrInputs}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-8: Occupancy Rate ──────────────────────────────
    {
      id: 8,
      metricId: 'OCCUPANCY',
      name: 'Occupancy Rate',
      badge: 'Operations',
      content: (
        <OccupancyCard
          occupiedUnits={occupiedUnits}
          totalUnits={totalUnits}
          monthlyRentPerUnit={monthlyRentPerUnit}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-9: Operating Expense Ratio ────────────────────
    {
      id: 9,
      metricId: 'OER',
      name: 'Expense Ratio',
      badge: 'Operational Efficiency',
      content: (
        <OERIndicator
          operatingExpenses={operatingExpenses}
          grossRentalIncome={grossRentalIncome}
          className="h-full border-none! p-2!"
        />
      ),
    },

    // ── METRIC-10: Appreciation Potential ───────────────────
    {
      id: 10,
      metricId: 'APPRECIATION',
      name: 'Appreciation Potential',
      badge: 'Equity Multiplier',
      content: (
        <div className="h-full w-full border-none! p-2!">
          <AppreciationChart data={appreciationData} holdYears={5} />
        </div>
      ),
    },
  ], [
    financials,
    noi,
    annualDebtService,
    purchasePrice,
    annualCashFlow,
    totalCashInvested,
    downPayment,
    closingCosts,
    rehab,
    holdingCosts,
    deals,
    irrInputs,
    occupiedUnits,
    totalUnits,
    monthlyRentPerUnit,
    operatingExpenses,
    grossRentalIncome,
    appreciationData
  ]);

  const total = slides.length;

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [autoOff, setAutoOff] = useState(false);

  // Auto-advance
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startAuto = useCallback(() => {
    clearAuto();
    if (autoOff || paused) return;
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setActive(prev => (prev + 1) % total);
    }, AUTO_MS);
  }, [autoOff, paused, total, clearAuto]);

  useEffect(() => {
    startAuto();
    return clearAuto;
  }, [startAuto, clearAuto]);

  const go = useCallback(
    (idx: number) => {
      setDirection(idx > active ? 1 : -1);
      setActive(idx);
      startAuto();
    },
    [active, startAuto],
  );

  const prev = useCallback(() => go((active - 1 + total) % total), [active, go, total]);
  const next = useCallback(() => go((active + 1) % total), [active, go, total]);

  // Pointer/touch swipe
  const swipeStartX = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    swipeStartX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const dx = e.clientX - swipeStartX.current;
    if (Math.abs(dx) > 44) {
      dx < 0 ? next() : prev();
    }
  };

  const slide = slides[active];
  const label = `${String(active + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  return (
    <div
      id="metrics-carousel-shell"
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* ── Outer panel (ui-ux-pro-max glassmorphic bento style) ── */}
      <div
        className="relative rounded-2xl overflow-hidden border backdrop-blur-xl"
        style={{
          background: 'var(--color-glass-bg)',
          borderColor: 'var(--color-outline-variant)',
          boxShadow: 'var(--color-glass-card-shadow, 0 8px 32px 0 rgba(69, 73, 85, 0.08))',
        }}
      >
        {/* ── Top bar: demo badge + auto advance status ───────────── */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: 'var(--color-outline-variant)' }}
        >
          {/* Demo badge — always visible, Honesty Rule */}
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{
              background: 'var(--color-primary-container)',
              color: 'var(--color-primary)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              science
            </span>
            Illustrative demo data
          </span>

          {/* Auto-advance toggle */}
          <button
            onClick={() => setAutoOff(v => !v)}
            className="text-[10px] font-medium flex items-center gap-1 transition-opacity duration-200 cursor-pointer"
            style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}
            aria-label={autoOff ? 'Resume auto-advance' : 'Pause auto-advance'}
            title={autoOff ? 'Resume auto-advance' : 'Pause auto-advance'}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              {autoOff ? 'play_circle' : 'pause_circle'}
            </span>
            {autoOff ? 'auto off' : 'auto'}
          </button>
        </div>

        {/* ── Browser-chrome mockup header frame ──────────────────── */}
        <div
          className="flex items-center gap-1.5 px-4 py-2"
          style={{
            background: 'rgba(0, 0, 0, 0.03)',
            borderBottom: '1px solid var(--color-outline-variant)',
          }}
        >
          {/* Traffic lights */}
          {['#FF5F57', '#FFBD2E', '#28CA41'].map(c => (
            <span key={c} className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} aria-hidden />
          ))}
          {/* URL bar */}
          <div
            className="flex-1 ml-2 h-5 rounded-md flex items-center px-3"
            style={{ background: 'rgba(0, 0, 0, 0.02)', border: '1px solid var(--color-outline-variant)' }}
          >
            <span
              className="text-[9px] tracking-wide truncate"
              style={{ color: 'var(--color-on-surface-variant)', opacity: 0.45 }}
            >
              paperworking.co/dashboard · {slide.name}
            </span>
          </div>
        </div>

        {/* ── Slide content viewport ───────────────────────────── */}
        <div
          className="relative overflow-hidden"
          style={{ height: 300 }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {/* Subtle watermarked indicator in the slide content area */}
          <div className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded text-[9px] font-black tracking-widest uppercase bg-black/40 text-white/95 backdrop-blur pointer-events-none border border-white/10">
            Demo data
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={active}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -60, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
              className="absolute inset-0 p-4 overflow-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              {slide.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Bottom: metric label & navigation controls ─────────────── */}
        <div
          className="px-4 py-3.5 border-t"
          style={{ borderColor: 'var(--color-outline-variant)' }}
        >
          {/* Metric metadata */}
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-primary-container)]"
                style={{ color: 'var(--color-primary)' }}
              >
                {slide.badge}
              </span>
              <p
                className="text-[13.5px] font-bold leading-tight mt-1"
                style={{ color: 'var(--color-on-surface)' }}
              >
                {slide.name}
              </p>
            </div>
            {/* Slide Index Counter */}
            <span
              className="font-mono text-[11px] tabular-nums"
              style={{ color: 'var(--color-on-surface-variant)', opacity: 0.5 }}
            >
              {label}
            </span>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3">
            {/* Prev button */}
            <button
              onClick={prev}
              aria-label="Previous metric"
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all hover:bg-[var(--color-outline-variant)] active:scale-90 cursor-pointer opacity-70 hover:opacity-100"
              style={{
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid var(--color-outline-variant)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-on-surface)' }} aria-hidden>
                chevron_left
              </span>
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 flex-1 justify-center flex-wrap" role="tablist" aria-label="KPI slides">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={s.name}
                  onClick={() => go(i)}
                  className="rounded-full transition-all duration-300 flex-shrink-0 cursor-pointer"
                  style={{
                    width: i === active ? 16 : 6,
                    height: 6,
                    background: i === active
                      ? 'var(--color-primary)'
                      : 'var(--color-outline)',
                  }}
                />
              ))}
            </div>

            {/* Next button */}
            <button
              onClick={next}
              aria-label="Next metric"
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all hover:bg-[var(--color-outline-variant)] active:scale-90 cursor-pointer opacity-70 hover:opacity-100"
              style={{
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid var(--color-outline-variant)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-on-surface)' }} aria-hidden>
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
