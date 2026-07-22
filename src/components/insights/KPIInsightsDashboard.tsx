"use client";

/**
 * KPIInsightsDashboard — Portfolio KPI Visualization Hub
 *
 * Visualizes 9 core real estate investment KPIs with:
 * - Custom SVG gauges (NOI, DSCR, Cap Rate, CoC)
 * - Recharts donut chart (OER)
 * - Recharts bar/line chart (ROI, project comparison)
 * - Numeric counters with range context (GRM, Price-to-Rent)
 * - Stat cards with trend indicators (Vacancy Rate, DOM)
 * - Hover tooltips with formula + benchmark on every metric
 */

import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from "recharts";
import { useProjectStore } from "@/store/projectStore";
import { useTheme } from "@/lib/utils/ThemeProvider";
import {
  deriveAllMetrics,
} from "@/lib/metrics/reiMetrics";
import {
  computeLTVMetric,
  computeDebtYieldMetric,
  computeEquityMultipleMetric,
  computeBreakEvenOccupancyMetric,
  computeCapitalReservesMetric,
  computePaybackPeriodMetric,
  computeTenantTurnoverMetric,
  computeLeaseRenewalMetric,
  computeMaintenanceCostPerUnitMetric,
  computeDOMMetric,
  computeBudgetVarianceMetric,
  computeIRRMetric,
  computeAppreciationMetric,
  computeCashFlowMetric,
  computeOccupancyMetric,
} from "@/lib/metrics";
import type { Project } from "@/types/schema";
import Link from "next/link";
import { usePortfolioMetricSnapshots } from "@/hooks/usePortfolioMetricSnapshots";
import { KPICategorySections } from "./KPICategoryCharts";

// ─── Palette constants ─────────────────────────────────────────────────────────

const C = {
  green:   "#00DD94",
  amber:   "#ffac5a",
  red:     "#F06543",
  blue:    "#7A9EAA",
  slate:   "#454955",
} as const;

function statusColor(status: "good" | "warn" | "bad" | "neutral"): string {
  if (status === "good")    return C.green;
  if (status === "warn")    return C.amber;
  if (status === "bad")     return C.red;
  return C.blue;
}

// ─── Tooltip definitions ───────────────────────────────────────────────────────

interface TooltipDef {
  theData: string;
  whyItMatters: string;
  benchmark: string;
  goodSign: string;
}

const TOOLTIPS: Record<string, TooltipDef> = {
  NOI: {
    theData:      "Total Income − Operating Expenses (excludes mortgage and income taxes)",
    whyItMatters: "Net Operating Income is the foundation of your real estate wealth. It dictates your property’s market value, drives your Cap Rate, and proves your portfolio’s strength. If you can’t pull this number up in five seconds, you’re leaving money on the table. PaperWorking eliminates the data-entry homework, turning your daily milestone logs into instant financial clarity.",
    benchmark:    "Target depends on asset class. $500+/mo per unit is a common starting threshold.",
    goodSign:     "Rising NOI year-over-year signals rent growth and expense control.",
  },
  CAP_RATE: {
    theData:      "NOI ÷ Current Property Value",
    whyItMatters: "A bad deal can hide behind creative loan terms. Savvy investors look past the financing to measure the pure, cash-equivalent strength of the property itself. But when rehab milestones run over budget, your Cap Rate plummets without you knowing. The exact second you enter a cost against a Project milestone, PaperWorking recalculates your true Cap Rate — turning daily project management into an early-warning system.",
    benchmark:    "6–10% is typical for residential. Below 4% signals overpriced or low-yield market.",
    goodSign:     "Cap Rate above your target return threshold means the deal works without leverage.",
  },
  COC: {
    theData:      "Annual Pre-Tax Cash Flow ÷ Total Cash Invested",
    whyItMatters: "Never fly blind on your actual returns. Command your capital efficiency with an automated dashboard that connects your daily workflow directly to your bottom line.",
    benchmark:    "8–12% is a healthy range. Below 6% may not justify the risk vs. alternatives.",
    goodSign:     "CoC above 10% with positive leverage means you're amplifying your equity return.",
  },
  ROI: {
    theData:      "Net Profit ÷ Total Investment Cost",
    whyItMatters: "Evaluates the overall profitability of the deal, including long-term appreciation and principal paydown.",
    benchmark:    "Long-term RE ROI historically averages 8–12% annualized. Above 15% is excellent.",
    goodSign:     "A rising ROI trend confirms the asset is compounding wealth effectively.",
  },
  DSCR: {
    theData:      "NOI ÷ Total Debt Service (Annual Mortgage Payments)",
    whyItMatters: "Stop letting complex bank underwriting slow down your portfolio growth. Command your leverage with a real-time index of your property’s true borrowing strength.",
    benchmark:    "Lenders require ≥ 1.20. Green zone starts at 1.25. Below 1.0 is a red flag.",
    goodSign:     "DSCR ≥ 1.25 means the property covers its debt with a 25% safety buffer.",
  },
  OER: {
    theData:      "Total Operating Expenses ÷ Gross Operating Income",
    whyItMatters: "What percentage of your gross income do operating costs consume? Most investors can’t answer — and rising expenses quietly eat returns that look healthy on the surface. PaperWorking calculates your Expense Ratio live from the costs you’re already logging, so margin erosion shows up as a dashboard alert, not a year-end surprise.",
    benchmark:    "35–45% is typical for well-run residential. Above 60% signals expense problems.",
    goodSign:     "OER below 40% with stable rents indicates efficient operations and strong NOI margin.",
  },
  GRM: {
    theData:      "Property Price ÷ Gross Annual Rental Income",
    whyItMatters: "In a competitive market, listing prices can be misleading. GRM is a straight-to-the-point reality check — exactly how many years of gross rent it takes to cover the purchase price. PaperWorking visualizes it instantly, keeping your capital safe from bad valuations.",
    benchmark:    "GRM of 8–12 is common in mid-market. Below 8 is a strong deal; above 15 is pricey.",
    goodSign:     "A falling GRM across your portfolio means you're buying income more efficiently.",
  },
  PRICE_TO_RENT: {
    theData:      "Median Home Price ÷ Average Annual Rent",
    whyItMatters: "A high ratio indicates a better environment for renting out properties, as people are priced out of buying.",
    benchmark:    "Below 15: strong buy market — cheap to own, lower rental demand. 15–20: balanced. Above 20: strong rental market — people are priced out of buying, boosting landlord demand.",
    goodSign:     "A high P/R in your target market means tenants can't afford to buy, keeping rental demand and your occupancy rates strong.",
  },
  VACANCY: {
    theData:      "Percentage of time the property sits empty, uncollected, or between tenant turnover.",
    whyItMatters: "Accurately forecasts cash flow disruptions and determines if a local market has high tenant churn.",
    benchmark:    "5–7% is standard economic vacancy. Above 10% requires immediate leasing attention.",
    goodSign:     "Falling vacancy with stable rents means strong demand in your target markets. Enter actual occupied/total days in your project to replace the assumption.",
  },
  DOM: {
    theData:      "How long similar properties in your target zip code spend listed for sale.",
    whyItMatters: "Indicates local liquidity; high DOM means you may have more leverage to negotiate a discount.",
    benchmark:    "Under 30 days is a hot market. 30–60 is moderate. Over 90 days signals softness.",
    goodSign:     "Low DOM in your target markets means faster exits and lower holding cost exposure. Add listing + closing dates to your project for exact figures.",
  },
  CASH_FLOW: {
    theData:      "NOI − Annual Debt Service",
    whyItMatters: "Stop guesstimating your margins. Command your portfolio like an institution with real-time liquidity tracking that requires zero accounting experience.",
    benchmark:    "Positive cash flow is essential. Targets depend on cash-on-cash return goals.",
    goodSign:     "Stable, positive monthly cash flow provides a buffer for maintenance and vacancies.",
  },
  IRR: {
    theData:      "Solve NPV = 0 for all project cash flows (initial equity, annual cash flows, exit proceeds)",
    whyItMatters: "Profit tells you how much. IRR tells you how fast — the metric institutions use to rank every deal, because a dollar returned this year beats a dollar returned in year five. Two Deals with identical profit can have wildly different IRRs. PaperWorking computes yours live from your actual cash-in and cash-out dates, so you rank opportunities the way professionals do.",
    benchmark:    "12–15% is standard for real estate. Higher rates reflect development or repositioning risk.",
    goodSign:     "A strong IRR shows that the combined cash flow and equity growth outperform index fund returns.",
  },
  OCCUPANCY: {
    theData:      "Occupied Units ÷ Total Units (or Occupied Days ÷ Total Hold Days)",
    whyItMatters: "Vacancy is the silent tax on your portfolio — invisible on a spreadsheet until the year is already lost. PaperWorking tracks occupancy across every unit you hold and shows you exactly what empty days are costing you, in dollars, right now.",
    benchmark:    "90–95% is considered stabilized. Below 85% suggests pricing, leasing, or management issues.",
    goodSign:     "Consistent high occupancy at market rents ensures top-line revenue targets are met.",
  },
  APPRECIATION: {
    theData:      "CAGR of Property Value relative to Purchase Price",
    whyItMatters: "Cash flow pays you monthly; appreciation builds your net worth. PaperWorking tracks your property’s estimated market value over time — powered by live market data — so your equity growth is visible on the same dashboard as your income, and your hold-versus-exit decision is a calculation, not a guess.",
    benchmark:    "3–5% historically matches long-term inflation and real estate averages.",
    goodSign:     "Value compounding above the local inflation rate increases equity multiple at exit.",
  },
  EQUITY_MULTIPLE: {
    theData:      "Total Cash Return ÷ Initial Cash Invested",
    whyItMatters: "Shows the total return multiple on your invested capital, including sale proceeds and cumulative cash flow.",
    benchmark:    "≥ 2.0× over a standard 5-year hold period is considered strong.",
    goodSign:     "A multiple above 2.5× means your capital has more than doubled over the lifecycle.",
  },
  PAYBACK_PERIOD: {
    theData:      "Years to recoup initial cash investment from cumulative cash flows",
    whyItMatters: "Measures capital recovery speed. Shorter payback periods lower the duration risk of the investment.",
    benchmark:    "≤ 8–10 years for stabilized value-add acquisitions.",
    goodSign:     "Fast payback allows you to recycle capital into new deals sooner.",
  },
  TENANT_TURNOVER: {
    theData:      "Annual Tenant Move-outs ÷ Total Units",
    whyItMatters: "High turnover dramatically increases leasing commissions, rehab costs, and vacancy loss.",
    benchmark:    "≤ 15% is optimal; warning triggers above 25% overrun.",
    goodSign:     "Low turnover indicates strong tenant retention and stable operations.",
  },
  LEASE_RENEWAL: {
    theData:      "Renewed Leases ÷ Expiring Leases",
    whyItMatters: "High lease renewals minimize turn costs (painting, repair) and leasing agent fees.",
    benchmark:    "≥ 75% is healthy. Below 60% signals tenant retention friction.",
    goodSign:     "High renewal rates keep occupancy steady and maintenance costs low.",
  },
  MAINTENANCE_COST_PER_UNIT: {
    theData:      "Annual Maintenance & Repair Cost ÷ Number of Units",
    whyItMatters: "Monitors if maintenance expenses are drifting above pro-forma targets on a per-door basis.",
    benchmark:    "≤ $1,500–$1,800/yr per unit depending on asset age.",
    goodSign:     "Stable or declining maintenance cost per unit indicates good preventative asset care.",
  },
  BUDGET_VARIANCE: {
    theData:      "(Actual Rehab Spend − Budgeted Rehab Spend) ÷ Budgeted Rehab Spend",
    whyItMatters: "Tracks construction and rehab budget overruns during the Acquisition/Fund phases.",
    benchmark:    "≤ 0% variance is ideal; warning zone triggers above 5% overrun.",
    goodSign:     "Zero or negative variance means rehab projects are executing on time and on budget.",
  },
  CAPITAL_RESERVES: {
    theData:      "Liquid Reserves ÷ Monthly Operating Expenses",
    whyItMatters: "Ensures the property has a cash cushion to cover unexpected repairs, tenant defaults, or economic defaults.",
    benchmark:    "≥ 6–12 months of operating expenses + debt service funded in reserve.",
    goodSign:     "Fully funded reserves ensure project solvency through major capital improvement cycles.",
  },
  LTV: {
    theData:      "Current Loan Balance ÷ Current Property Value",
    whyItMatters: "Indicates leverage and refinancing risk. Higher LTV ratios mean higher interest expense.",
    benchmark:    "≤ 75% for initial acquisition; ≤ 65% for refinancing.",
    goodSign:     "A declining LTV ratio over time indicates loan amortization and appreciation are building equity.",
  },
  DEBT_YIELD: {
    theData:      "NOI ÷ Loan Amount",
    whyItMatters: "The cash-on-cash return a lender would receive if they foreclosed and took 100% of the cash flow.",
    benchmark:    "≥ 10% is preferred by commercial lenders. Below 8% limits refinancing options.",
    goodSign:     "High debt yield makes the property highly attractive to refinance lenders.",
  },
  BREAK_EVEN_OCCUPANCY: {
    theData:      "(Operating Expenses + Debt Service) ÷ Gross Potential Rent",
    whyItMatters: "The minimum occupancy percentage required to cover all cash expenses without dipping into reserves.",
    benchmark:    "≤ 75% occupancy. Lower break-even percentages provide a wider safety margin.",
    goodSign:     "A break-even occupancy below 65% ensures solvency even during severe tenant defaults.",
  },
};

// ─── Tooltip component ─────────────────────────────────────────────────────────

function KPITooltip({ id, isDark }: { id: string; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const def = TOOLTIPS[id];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!def) return null;

  const panelBg = isDark ? "#1e1b20" : "#ffffff";
  const border  = isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)";
  const textHd  = isDark ? "rgba(253,255,252,0.92)" : "#0d0a0b";
  const textBd  = isDark ? "rgba(253,255,252,0.55)" : "rgba(69,73,85,0.75)";

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Learn more about this metric"
        className="flex items-center justify-center w-5 h-5 rounded-full transition-opacity duration-150 hover:opacity-80 cursor-pointer"
        style={{
          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.09)",
          color: isDark ? "rgba(253,255,252,0.4)" : "rgba(69,73,85,0.55)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "13px", fontVariationSettings: "'FILL' 0" }}>
          info
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-72 rounded-xl z-50 p-4 space-y-2.5"
          style={{
            background: panelBg,
            border: `1px solid ${border}`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            backdropFilter: "blur(20px)",
          }}
        >
          <p
            className="text-[11px] font-mono font-medium rounded px-2 py-1"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(69,73,85,0.06)",
              color: C.blue,
            }}
          >
            {def.theData}
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: textBd }}>
            {def.whyItMatters}
          </p>
          <div className="flex gap-1.5">
            <span
              className="material-symbols-outlined text-[14px] mt-0.5 shrink-0"
              style={{ color: C.amber, fontVariationSettings: "'FILL' 1" }}
            >
              rule
            </span>
            <p className="text-[11px] leading-relaxed" style={{ color: textBd }}>
              <strong style={{ color: textHd }}>Benchmark:</strong> {def.benchmark}
            </p>
          </div>
          <div className="flex gap-1.5">
            <span
              className="material-symbols-outlined text-[14px] mt-0.5 shrink-0"
              style={{ color: C.green, fontVariationSettings: "'FILL' 1" }}
            >
              thumb_up
            </span>
            <p className="text-[11px] leading-relaxed" style={{ color: textBd }}>
              {def.goodSign}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI card shell ────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  tooltipId: string;
  value?: string;
  status?: "good" | "warn" | "bad" | "neutral";
  statusLabel?: string;
  children: React.ReactNode;
  isDark: boolean;
  span?: 1 | 2;
  formula?: string;
  benchmark?: string;
  inputs?: string[];
  statusNote?: string;
  missingFields?: string[];
  collectingRoute?: string;
  collectingLabel?: string;
}

function KPICard({
  title,
  tooltipId,
  value,
  status,
  statusLabel,
  children,
  isDark,
  span = 1,
  formula,
  benchmark,
  inputs,
  statusNote,
  missingFields,
  collectingRoute,
  collectingLabel,
}: KPICardProps) {
  const panelBg = isDark
    ? "linear-gradient(145deg, rgba(30,27,34,0.72) 0%, rgba(18,16,20,0.90) 100%)"
    : "#FFFFFF";
  const borderColor = isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)";
  const headingColor = isDark ? "rgba(253,255,252,0.90)" : "#0d0a0b";
  const mutedColor   = isDark ? "rgba(253,255,252,0.40)" : "rgba(69,73,85,0.55)";

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      onClick={() => setIsExpanded(!isExpanded)}
      className={`rounded-xl flex flex-col overflow-hidden transition-all duration-200 cursor-pointer ${span === 2 ? "lg:col-span-2" : ""} ${isExpanded ? "ring-1 ring-[#627C85]" : "hover:border-[#627C85]/50"}`}
      style={{
        background: panelBg,
        backdropFilter: isDark ? "blur(20px)" : undefined,
        WebkitBackdropFilter: isDark ? "blur(20px)" : undefined,
        border: `1px solid ${borderColor}`,
        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.28)" : "0 2px 10px rgba(0,0,0,0.06)",
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.08em", color: mutedColor }}
          >
            {title}
          </span>
          <KPITooltip id={tooltipId} isDark={isDark} />
        </div>
        {status && statusLabel && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: `${statusColor(status)}18`,
              color: statusColor(status),
            }}
          >
            {statusLabel}
          </span>
        )}
        {value && !statusLabel && (
          <span
            className="text-[13px] font-bold tabular-nums"
            style={{ color: status ? statusColor(status) : headingColor }}
          >
            {value}
          </span>
        )}
      </div>

      {/* Chart / visualization area */}
      <div className="flex-1 p-4">
        {children}
      </div>

      {/* Expanded metadata area */}
      {isExpanded && (
        <div
          className="px-4 pb-4 pt-3 border-t border-white/[0.06] space-y-3 bg-white/[0.01] text-xs"
          onClick={(e) => e.stopPropagation()} // Prevent clicking inner content from closing card
        >
          {formula && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0] block mb-0.5">Formula / Method</span>
              <code className="text-white text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">{formula}</code>
            </div>
          )}
          {benchmark && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0] block mb-0.5">Target / Benchmark</span>
              <span className="text-[var(--pw-success)] font-semibold">{benchmark}</span>
            </div>
          )}
          {statusNote && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0] block mb-0.5">Status Detail</span>
              <p className="text-[#C0BEC2] text-[11px] leading-relaxed">{statusNote}</p>
            </div>
          )}
          {missingFields && missingFields.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 p-3 mt-2" style={{ background: 'rgba(245,158,11,0.03)' }}>
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 block mb-1">Lacking Inputs (Honesty Rule)</span>
              <ul className="space-y-1">
                {missingFields.map((f) => (
                  <li key={f} className="text-[11px] text-amber-300/70 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-400/50 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {collectingRoute && (
                <Link
                  href={collectingRoute}
                  className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-amber-400 hover:text-amber-300 underline"
                >
                  Go to {collectingLabel || "Project"} to enter data
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </Link>
              )}
            </div>
          )}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[9px] font-bold uppercase text-[#9E9DA0] hover:text-white flex items-center gap-0.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[12px]">keyboard_arrow_up</span>
              Collapse
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ─── SVG Semi-Circular Gauge ───────────────────────────────────────────────────
// Renders a half-donut gauge from 0° (left) to 180° (right)

interface SvgGaugeProps {
  value: number;        // 0–100 (percent of scale)
  label: string;        // center label
  sublabel?: string;
  color: string;
  isDark: boolean;
  size?: number;
}

function SvgGauge({ value, label, sublabel, color, isDark, size = 140 }: SvgGaugeProps) {
  const cx = size / 2;
  const cy = size * 0.58;
  const r  = size * 0.38;
  const strokeW = size * 0.09;

  function polarToXY(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arcPath(startDeg: number, endDeg: number) {
    const s = polarToXY(startDeg);
    const e = polarToXY(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const clampedValue = Math.min(100, Math.max(0, value));
  const startDeg = 180;
  const endDeg   = 180 + (180 * clampedValue) / 100;

  const trackColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(69,73,85,0.08)";
  const textColor  = isDark ? "rgba(253,255,252,0.9)"  : "#0d0a0b";
  const subColor   = isDark ? "rgba(253,255,252,0.4)"  : "rgba(69,73,85,0.55)";

  return (
    <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`}>
      {/* Track */}
      <path
        d={arcPath(180, 360)}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* Fill */}
      {clampedValue > 0 && (
        <path
          d={arcPath(startDeg, endDeg)}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      )}
      {/* Label */}
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.145}
        fontWeight={700}
        fill={textColor}
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={cx}
          y={cy + size * 0.11}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.075}
          fill={subColor}
          style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}
        >
          {sublabel}
        </text>
      )}
    </svg>
  );
}

// ─── DSCR Indicator ────────────────────────────────────────────────────────────

function DSCRIndicator({ dscr, isDark }: { dscr: number | null; isDark: boolean }) {
  const status =
    dscr === null    ? "neutral" :
    dscr >= 1.25     ? "good"    :
    dscr >= 1.0      ? "warn"    : "bad";

  const color     = statusColor(status);
  const textColor = isDark ? "rgba(253,255,252,0.9)"  : "#0d0a0b";
  const mutedClr  = isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)";
  const barBg     = isDark ? "rgba(255,255,255,0.07)" : "rgba(69,73,85,0.09)";

  // Scale: 0 → 2.5, thresholds at 1.0 and 1.25
  const MAX = 2.5;
  const val = dscr !== null ? Math.min(dscr, MAX) : 0;
  const pct = (val / MAX) * 100;
  const t1  = (1.0  / MAX) * 100; // 40%
  const t2  = (1.25 / MAX) * 100; // 50%

  return (
    <div className="flex flex-col gap-4">
      {/* Big number */}
      <div className="flex items-end gap-2">
        <span
          className="text-[3.5rem] font-bold leading-none tabular-nums"
          style={{ color: dscr !== null ? color : mutedClr, letterSpacing: "-0.03em" }}
        >
          {dscr !== null ? dscr.toFixed(2) : "—"}
        </span>
        {dscr !== null && (
          <span className="text-base font-semibold mb-1.5" style={{ color: mutedClr }}>
            {status === "good" ? "✓ Safe" : status === "warn" ? "⚠ Borderline" : "✗ At Risk"}
          </span>
        )}
      </div>

      {/* Progress bar with thresholds */}
      <div className="space-y-1.5">
        <div className="relative h-3 rounded-full overflow-visible" style={{ background: barBg }}>
          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
          {/* Threshold markers */}
          {[
            { pct: t1, label: "1.0",  sublabel: "Min" },
            { pct: t2, label: "1.25", sublabel: "Safe" },
          ].map(({ pct: tp, label, sublabel }) => (
            <div
              key={label}
              className="absolute top-0 bottom-0 w-0.5 z-10"
              style={{ left: `${tp}%`, background: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)" }}
            >
              <span
                className="absolute top-4 text-[9px] font-bold whitespace-nowrap"
                style={{
                  transform: "translateX(-50%)",
                  color: isDark ? "rgba(255,255,255,0.35)" : "rgba(69,73,85,0.5)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Zone labels */}
        <div className="flex justify-between text-[10px]" style={{ color: mutedClr }}>
          <span>At Risk</span>
          <span>Borderline</span>
          <span style={{ color: C.green }}>Safe Zone</span>
        </div>
      </div>

      {dscr === null && (
        <p className="text-[12px]" style={{ color: mutedClr }}>
          Add loan details and rental income to compute DSCR.
        </p>
      )}
    </div>
  );
}

// ─── OER Donut ────────────────────────────────────────────────────────────────

function OERDonut({ oer, isDark }: { oer: number | null; isDark: boolean }) {
  const income  = oer !== null ? Math.max(0, 100 - oer) : 50;
  const expense = oer !== null ? Math.min(100, oer)     : 50;
  const status  =
    oer === null  ? "neutral" :
    oer < 40      ? "good"    :
    oer < 55      ? "warn"    : "bad";
  const expColor = statusColor(status);
  const textColor = isDark ? "rgba(253,255,252,0.9)"  : "#0d0a0b";
  const mutedClr  = isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)";

  const data = [
    { name: "Net Income", value: income,  color: C.green   },
    { name: "Expenses",   value: expense, color: expColor  },
  ];

  const customLabel = ({ cx, cy }: { cx: number; cy: number }) => (
    <>
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize={22} fontWeight={700} fill={textColor}
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        {oer !== null ? `${oer.toFixed(0)}%` : "—"}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fill={mutedClr}
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        expense ratio
      </text>
    </>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={46}
            outerRadius={68}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            paddingAngle={2}
            labelLine={false}
            label={customLabel as any}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px]" style={{ color: mutedClr }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: C.green }} />
          Net Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: expColor }} />
          Expenses
        </span>
      </div>
    </div>
  );
}

// ─── Percentage gauge (Cap Rate, Cash-on-Cash) ────────────────────────────────

interface PctGaugeProps {
  value: number | null;    // raw percent (0–100)
  min: number;
  max: number;
  goodMin: number;         // threshold where "good" starts
  warnMin: number;         // threshold where "warn" starts
  unit?: string;
  isDark: boolean;
}

function PercentageGauge({ value, min, max, goodMin, warnMin, unit = "%", isDark }: PctGaugeProps) {
  const status =
    value === null  ? "neutral" :
    value >= goodMin ? "good"  :
    value >= warnMin ? "warn"  : "bad";
  const color    = statusColor(status);
  const pct      = value !== null ? ((Math.min(value, max) - min) / (max - min)) * 100 : 0;
  const textColor = isDark ? "rgba(253,255,252,0.9)"  : "#0d0a0b";
  const mutedClr  = isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)";
  const barBg     = isDark ? "rgba(255,255,255,0.07)" : "rgba(69,73,85,0.09)";

  // threshold markers
  const warnPct = ((warnMin - min) / (max - min)) * 100;
  const goodPct = ((goodMin - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-3">
      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span
          className="text-[2.8rem] font-bold leading-none tabular-nums"
          style={{ color: value !== null ? color : mutedClr, letterSpacing: "-0.03em" }}
        >
          {value !== null ? value.toFixed(1) : "—"}
        </span>
        <span className="text-lg font-semibold" style={{ color: mutedClr }}>{unit}</span>
      </div>

      {/* Bar */}
      <div className="relative h-2.5 rounded-full overflow-visible" style={{ background: barBg }}>
        {/* Gradient fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
        />
        {/* Zone ticks */}
        {[warnPct, goodPct].map((tp, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${tp}%`, background: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)" }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[10px]" style={{ color: mutedClr }}>
        <span>{min}{unit}</span>
        <span style={{ color: C.amber }}>{warnMin}{unit}</span>
        <span style={{ color: C.green }}>{goodMin}{unit}+</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── ROI Trend Line Chart (Trend line graph showing long-term profitability) ───

interface ROITrendProps {
  snapshots: any[];
  isDark: boolean;
}

function ROITrendLineChart({ snapshots, isDark }: ROITrendProps) {
  const mutedClr  = isDark ? "rgba(253,255,252,0.3)"  : "rgba(69,73,85,0.45)";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(69,73,85,0.07)";

  const trendData = useMemo(() => {
    return snapshots.map(s => {
      // Blended ROI: Cash-on-Cash + Appreciation
      const roi = (s.cashOnCashReturn ?? 0) + (s.appreciation ?? 0);
      return {
        period: s.period,
        roi: parseFloat(roi.toFixed(1)),
      };
    });
  }, [snapshots]);

  if (trendData.length === 0) {
    return (
      <div className="flex items-center justify-center h-36" style={{ color: mutedClr }}>
        <p className="text-[12px]">No historical trend data yet.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={trendData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fill: mutedClr, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          unit="%"
          tick={{ fill: mutedClr, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <ReTooltip
          contentStyle={{
            background: isDark ? "#1e1b20" : "#fff",
            border: `1px solid ${isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)"}`,
            borderRadius: "8px",
            fontSize: "11px",
            color: isDark ? "rgba(253,255,252,0.8)" : "#0d0a0b",
          }}
          formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Blended ROI"]}
        />
        <Line
          type="monotone"
          dataKey="roi"
          stroke="#627C85"
          strokeWidth={2}
          dot={{ fill: "#627C85", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── GRM Counter ───────────────────────────────────────────────────────────────

function GRMCounter({ grm, isDark }: { grm: number | null; isDark: boolean }) {
  const status =
    grm === null  ? "neutral" :
    grm <= 8      ? "good"    :
    grm <= 12     ? "warn"    : "bad";
  const color    = statusColor(status);
  const mutedClr = isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)";

  // Scale: 4 → 20, mark at 8 and 12
  const MAX = 20;
  const pct  = grm !== null ? Math.min(((grm - 4) / (MAX - 4)) * 100, 100) : 0;
  const t1   = ((8  - 4) / (MAX - 4)) * 100;
  const t2   = ((12 - 4) / (MAX - 4)) * 100;
  const barBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(69,73,85,0.09)";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[3.2rem] font-bold leading-none tabular-nums"
          style={{ color: grm !== null ? color : mutedClr, letterSpacing: "-0.03em" }}
        >
          {grm !== null ? grm.toFixed(1) : "—"}
        </span>
        {grm !== null && (
          <span className="text-base" style={{ color: mutedClr }}>× GRM</span>
        )}
      </div>

      <div className="relative h-2.5 rounded-full overflow-visible" style={{ background: barBg }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
        {[t1, t2].map((tp, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${tp}%`, background: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)" }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: mutedClr }}>
        <span style={{ color: C.green }}>≤8 Best</span>
        <span style={{ color: C.amber }}>8–12 Avg</span>
        <span style={{ color: C.red }}>12+ Pricey</span>
      </div>

      {grm === null && (
        <p className="text-[12px]" style={{ color: mutedClr }}>
          Add purchase price and monthly rent to compute GRM.
        </p>
      )}
    </div>
  );
}

// ─── Price-to-Rent Ratio ───────────────────────────────────────────────────────

function PriceToRentIndicator({ ptr, isDark }: { ptr: number | null; isDark: boolean }) {
  // Rule of 15: <15 buy, 15-20 neutral, >20 rent market
  const status =
    ptr === null  ? "neutral" :
    ptr < 15      ? "good"    :
    ptr < 20      ? "warn"    : "bad";
  const color    = statusColor(status);
  const mutedClr = isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)";
  const barBg    = isDark ? "rgba(255,255,255,0.07)" : "rgba(69,73,85,0.09)";

  const MAX = 30;
  const pct  = ptr !== null ? Math.min((ptr / MAX) * 100, 100) : 0;
  const t1   = (15 / MAX) * 100;
  const t2   = (20 / MAX) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[3.2rem] font-bold leading-none tabular-nums"
          style={{ color: ptr !== null ? color : mutedClr, letterSpacing: "-0.03em" }}
        >
          {ptr !== null ? ptr.toFixed(1) : "—"}
        </span>
        {ptr !== null && <span className="text-base" style={{ color: mutedClr }}>× P/R</span>}
      </div>

      <div className="relative h-2.5 rounded-full overflow-visible" style={{ background: barBg }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
        {[t1, t2].map((tp, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${tp}%`, background: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)" }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: mutedClr }}>
        <span style={{ color: C.green }}>&#60;15 Buy</span>
        <span style={{ color: C.amber }}>15–20 Mixed</span>
        <span style={{ color: C.red }}>&#62;20 Rent Mkt</span>
      </div>

      {ptr === null && (
        <p className="text-[12px]" style={{ color: mutedClr }}>
          Price-to-Rent requires purchase price and annual rent data.
        </p>
      )}
    </div>
  );
}

// ─── Vacancy + DOM Stat cards ─────────────────────────────────────────────────

function VacancyDOMStats({
  vacancyRate,
  dom,
  isDark,
}: { vacancyRate: number | null; dom: number | null; isDark: boolean }) {
  const vStatus =
    vacancyRate === null ? "neutral" :
    vacancyRate < 5      ? "good"    :
    vacancyRate < 10     ? "warn"    : "bad";
  const dStatus =
    dom === null  ? "neutral" :
    dom < 30      ? "good"    :
    dom < 60      ? "warn"    : "bad";

  const mutedClr = isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)";

  const stats = [
    {
      label:    "Vacancy Rate",
      value:    vacancyRate !== null ? `${vacancyRate.toFixed(1)}%` : "—",
      sub:      vacancyRate !== null
        ? (vacancyRate < 5 ? "Below avg — tight market" : vacancyRate < 10 ? "Near average" : "High — act on leasing")
        : "No vacancy data",
      status:   vStatus,
      icon:     "home_work",
    },
    {
      label:    "Days on Market",
      value:    dom !== null ? `${Math.round(dom)}d` : "—",
      sub:      dom !== null
        ? (dom < 30 ? "Hot market — fast exits" : dom < 60 ? "Moderate demand" : "Slow — plan longer hold")
        : "No listing data",
      status:   dStatus,
      icon:     "calendar_today",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 h-full">
      {stats.map((s) => {
        const color = statusColor(s.status);
        return (
          <div key={s.label} className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-[#9E9DA0]">{s.label}</p>
                <p className="text-lg font-semibold mt-1" style={{ color }}>{s.value}</p>
                <p className="text-[10px] text-[#6B6870] mt-0.5">{s.sub}</p>
              </div>
              <span className="material-symbols-outlined text-lg" style={{ color }}>{s.icon}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PortfolioInsights {
  totalNOI:          number | null;
  weightedCapRate:   number | null;
  weightedCoC:       number | null;
  portfolioDSCR:     number | null;
  weightedOER:       number | null;
  weightedGRM:       number | null;
  priceToRent:       number | null;
  avgVacancyRate:    number | null;
  avgDOM:            number | null;
  totalCashFlow:     number | null;
  averageIRR:        number | null;
  appreciationRate:  number | null;
  projectCount:      number;
  roiByProject:      Array<{ name: string; roi: number }>;
}

function getPhaseName(phaseNum: number): string {
  switch (phaseNum) {
    case 1: return "Acquisition";
    case 2: return "Fund";
    case 3: return "Hold";
    case 4: return "Exit";
    default: return "Acquisition";
  }
}

function usePortfolioInsights(projects: Project[]): PortfolioInsights {
  return useMemo(() => {
    if (projects.length === 0) {
      return {
        totalNOI: null, weightedCapRate: null, weightedCoC: null,
        portfolioDSCR: null, weightedOER: null, weightedGRM: null,
        priceToRent: null, avgVacancyRate: null, avgDOM: null,
        totalCashFlow: null, averageIRR: null, appreciationRate: null,
        projectCount: 0, roiByProject: [],
      };
    }

    let sumNOI              = 0;
    let sumPropertyValue    = 0;
    let sumAnnualCashFlow   = 0;
    let sumCashInvested     = 0;
    let sumDebtService      = 0;
    let sumOpEx             = 0;
    let sumGrossIncome      = 0;
    let sumPropPrice        = 0;
    let sumGrossRent        = 0;
    let vacancyWeighted     = 0;
    let vacancyWeight       = 0;
    let domTotal            = 0;
    let domCount            = 0;
    let irrTotal            = 0;
    let irrCount            = 0;
    let appTotal            = 0;
    let appCount            = 0;
    let roiByProject: Array<{ name: string; roi: number }> = [];

    for (const p of projects) {
      const f = p.financials;
      if (!f) continue;

      const m = deriveAllMetrics(
        f,
        f.estimatedCurrentValue || f.estimatedARV,
        p.dispositionType,
        p.currentPhase,
        p.createdAt,
      );

      const propValue   = f.estimatedCurrentValue || f.estimatedARV || f.purchasePrice || f.targetPrice || 0;
      const propPrice   = f.purchasePrice || f.targetPrice || 0;
      const annualRent  = (f.monthlyGrossRent || f.projectedMonthlyRent || 0) * 12;
      const debtService = m.annualDebtService;
      const noiComp = m.noiComponents;

      sumNOI            += m.noi;
      sumPropertyValue  += propValue;
      sumAnnualCashFlow += m.annualCashFlow;
      sumCashInvested   += m.totalCashInvested;
      sumDebtService    += debtService;
      sumOpEx           += noiComp.totalOperatingExpenses;
      sumGrossIncome    += noiComp.grossRentalIncome;

      if (propPrice > 0 && annualRent > 0) {
        sumPropPrice += propPrice;
        sumGrossRent += annualRent;
      }

      if (noiComp.grossRentalIncome > 0) {
        vacancyWeighted += m.vacancyRate * noiComp.grossRentalIncome;
        vacancyWeight   += noiComp.grossRentalIncome;
      } else if (m.vacancyRate > 0) {
        vacancyWeighted += m.vacancyRate;
        vacancyWeight   += 1;
      }

      const fAny = f as any;
      if (fAny.listingDate && (fAny.closingDate || fAny.actualClosingDate || fAny.soldDate)) {
        const start = new Date(fAny.listingDate as string);
        const end   = new Date((fAny.closingDate || fAny.actualClosingDate || fAny.soldDate) as string);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
          domTotal += days;
          domCount++;
        }
      } else if (f.comparableSales && f.comparableSales.length > 0) {
        const compDoms = (f.comparableSales as Array<{ daysOnMarket: number }>)
          .map(c => c.daysOnMarket)
          .filter(d => d > 0);
        if (compDoms.length > 0) {
          domTotal += compDoms.reduce((a, b) => a + b, 0) / compDoms.length;
          domCount++;
        }
      }

      const name = (p.propertyName || p.address || `Project ${p.id.slice(0,4)}`).slice(0, 16);
      const flipROI = p.dispositionType === "SALE" && m.totalCashInvested > 0
        ? ((propValue - (f.purchasePrice ?? 0) - (f.projectedRehabCost ?? 0)) / m.totalCashInvested) * 100
        : null;
      const rentROI = m.totalCashInvested > 0
        ? (m.annualCashFlow / m.totalCashInvested) * 100
        : null;
      const roi = flipROI ?? rentROI;
      if (roi !== null && Number.isFinite(roi)) {
        roiByProject.push({ name, roi: parseFloat(roi.toFixed(1)) });
      }

      const irrRes = computeIRRMetric(p);
      if (irrRes.value !== null && irrRes.state !== 'n/a') {
        irrTotal += irrRes.value;
        irrCount++;
      }

      const appRes = computeAppreciationMetric(p);
      if (appRes.value !== null && appRes.state !== 'n/a') {
        appTotal += appRes.value;
        appCount++;
      }
    }

    return {
      totalNOI:        sumNOI > 0 || sumGrossIncome > 0 ? sumNOI : null,
      weightedCapRate: sumPropertyValue > 0 ? (sumNOI / sumPropertyValue) * 100 : null,
      weightedCoC:     sumCashInvested > 0 ? (sumAnnualCashFlow / sumCashInvested) * 100 : null,
      portfolioDSCR:   sumDebtService > 0 ? sumNOI / sumDebtService : null,
      weightedOER:     sumGrossIncome > 0 ? (sumOpEx / sumGrossIncome) * 100 : null,
      weightedGRM:     sumGrossRent > 0 ? sumPropPrice / sumGrossRent : null,
      priceToRent:     sumGrossRent > 0 ? sumPropPrice / sumGrossRent : null,
      avgVacancyRate:  vacancyWeight > 0 ? vacancyWeighted / vacancyWeight : null,
      avgDOM:          domCount > 0 ? domTotal / domCount : null,
      totalCashFlow:    sumAnnualCashFlow,
      averageIRR:       irrCount > 0 ? irrTotal / irrCount : null,
      appreciationRate: appCount > 0 ? appTotal / appCount : null,
      projectCount:    projects.length,
      roiByProject,
    };
  }, [projects]);
}

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  const lineClr = isDark ? "rgba(255,255,255,0.07)" : "rgba(69,73,85,0.11)";
  const textClr = isDark ? "rgba(253,255,252,0.48)" : "rgba(69,73,85,0.65)";
  return (
    <div className="flex items-center gap-4 py-2 mt-4">
      <h2
        className="text-[12px] font-bold uppercase tracking-widest shrink-0"
        style={{ color: textClr, letterSpacing: "0.18em" }}
      >
        {label}
      </h2>
      <div className="h-[1px] w-full" style={{ background: lineClr }} />
    </div>
  );
}

function CashFlowIndicator({ cashFlow, isDark }: { cashFlow: number | null; isDark: boolean }) {
  const status = cashFlow === null ? "neutral" : cashFlow >= 0 ? "good" : "bad";
  const color = statusColor(status);
  const mutedClr = isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)";
  
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-end gap-2">
        <span
          className="text-[2.2rem] font-bold leading-none tabular-nums"
          style={{ color: cashFlow !== null ? color : mutedClr, letterSpacing: "-0.03em" }}
        >
          {cashFlow !== null ? `$${Math.round(cashFlow / 12).toLocaleString()}` : "—"}
          <span className="text-sm font-normal text-[#9E9DA0] ml-1">/mo</span>
        </span>
      </div>
      <div className="text-xs font-light text-[#9E9DA0]">
        Annual projected: <span className="font-semibold text-white font-mono">{cashFlow !== null ? `$${Math.round(cashFlow).toLocaleString()}/yr` : "—"}</span>
      </div>
    </div>
  );
}

function InsufficientDataState({
  categoryName,
  isDark,
}: {
  categoryName: string;
  isDark: boolean;
}) {
  const cardBg = isDark ? "rgba(30,27,34,0.2)" : "rgba(69,73,85,0.02)";
  const borderColor = isDark ? "rgba(253,255,252,0.05)" : "rgba(69,73,85,0.05)";
  const subColor = isDark ? "rgba(253,255,252,0.40)" : "rgba(69,73,85,0.55)";

  return (
    <div
      className="p-6 rounded-xl border border-dashed flex flex-col items-center justify-center text-center space-y-2 py-8"
      style={{
        background: cardBg,
        borderColor,
      }}
    >
      <span
        className="material-symbols-outlined text-[#6B6870] text-3xl"
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        lock
      </span>
      <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
        No Active {categoryName} Metrics
      </h4>
      <p className="text-[11px] max-w-md leading-relaxed" style={{ color: subColor }}>
        The active project focus does not have data or is not in the correct REIL phases for this category yet. Advance the project phase or enter corresponding financials to unlock.
      </p>
    </div>
  );
}

interface SupplementalMetricDisplay {
  id: string;
  name: string;
  category: 'financial' | 'operational' | 'asset' | 'marketing' | 'risk';
  benchmark: string;
  phaseLabel: string;
  value: number | null;
  format: (v: number) => string;
  description: string;
  status: "good" | "warn" | "bad" | "neutral";
}

function SupplementalCard({
  metric,
  isDark,
}: {
  metric: SupplementalMetricDisplay;
  isDark: boolean;
}) {
  const headingColor = isDark ? "rgba(253,255,252,0.90)" : "#0d0a0b";
  const mutedColor   = isDark ? "rgba(253,255,252,0.40)" : "rgba(69,73,85,0.55)";
  const cardBg       = isDark ? "rgba(30,27,34,0.4)" : "#FFFFFF";
  const borderColor  = isDark ? "rgba(230, 234, 240, 0.08)" : "rgba(33, 34, 38, 0.08)";

  const hasData = metric.value !== null;
  const displayVal = hasData ? metric.format(metric.value!) : "—";
  const color = hasData ? statusColor(metric.status) : mutedColor;

  return (
    <div
      className="p-4 rounded-xl border flex flex-col justify-between h-[135px] relative group transition-all duration-200"
      style={{
        background: cardBg,
        borderColor,
      }}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0] truncate max-w-[80%]">
            {metric.name}
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              color: mutedColor,
            }}
          >
            {metric.phaseLabel}
          </span>
        </div>
        <p className="text-[9px] text-[#9E9DA0] leading-snug line-clamp-2">
          {metric.description}
        </p>
      </div>

      <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-white/[0.03]">
        <span
          className="text-2xl font-bold font-mono tracking-tight"
          style={{ color }}
        >
          {displayVal}
        </span>
        <span className="text-[10px] text-[#9E9DA0]" style={{ letterSpacing: "0.02em" }}>
          Target: {metric.benchmark}
        </span>
      </div>
    </div>
  );
}

// ─── Supplemental Accordions (5-category collapsible groups) ──────────────────

const SUPPLEMENTAL_CATEGORIES = [
  {
    key: 'financial' as const,
    label: 'Financial Performance',
    icon: 'account_balance',
    description: 'Return multiples and payback horizon',
  },
  {
    key: 'operational' as const,
    label: 'Operational Efficiency',
    icon: 'precision_manufacturing',
    description: 'Tenant retention, maintenance, and budget discipline',
  },
  {
    key: 'asset' as const,
    label: 'Asset & Portfolio Management',
    icon: 'domain',
    description: 'Capital reserves and vacancy tracking',
  },
  {
    key: 'marketing' as const,
    label: 'Marketing & Sales',
    icon: 'storefront',
    description: 'Market positioning and listing velocity',
  },
  {
    key: 'risk' as const,
    label: 'Risk Management & Compliance',
    icon: 'shield',
    description: 'Leverage exposure and debt coverage thresholds',
  },
];

function SupplementalAccordions({
  metrics,
  isDark,
}: {
  metrics: SupplementalMetricDisplay[];
  isDark: boolean;
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const headingColor = isDark ? "rgba(253,255,252,0.90)" : "#0d0a0b";
  const mutedColor   = isDark ? "rgba(253,255,252,0.40)" : "rgba(69,73,85,0.55)";
  const divider      = isDark ? "rgba(230, 234, 240, 0.08)" : "rgba(33, 34, 38, 0.08)";
  const panelBg      = isDark ? "rgba(30,27,34,0.4)" : "#FFFFFF";

  return (
    <div className="space-y-2">
      {SUPPLEMENTAL_CATEGORIES.map((cat) => {
        const catMetrics = metrics.filter((m) => m.category === cat.key);
        const isOpen = openCategory === cat.key;
        const hasData = catMetrics.some((m) => m.value !== null);

        return (
          <div
            key={cat.key}
            className="rounded-xl border overflow-hidden transition-all duration-200"
            style={{
              borderColor: divider,
              background: isOpen ? panelBg : 'transparent',
            }}
          >
            {/* Accordion header */}
            <button
              onClick={() => setOpenCategory(isOpen ? null : cat.key)}
              className="w-full flex items-center justify-between px-5 py-4 text-left transition-all duration-150 cursor-pointer hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{
                    color: isOpen ? headingColor : mutedColor,
                    fontVariationSettings: isOpen ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {cat.icon}
                </span>
                <div>
                  <h3
                    className="text-[13px] font-semibold"
                    style={{ color: isOpen ? headingColor : mutedColor }}
                  >
                    {cat.label}
                  </h3>
                  <p className="text-[10px] mt-0.5" style={{ color: mutedColor }}>
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                    color: hasData ? C.green : mutedColor,
                  }}
                >
                  {catMetrics.filter((m) => m.value !== null).length}/{catMetrics.length}
                </span>
                <span
                  className="material-symbols-outlined text-[16px] transition-transform duration-200"
                  style={{
                    color: mutedColor,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    fontVariationSettings: "'FILL' 0",
                  }}
                >
                  expand_more
                </span>
              </div>
            </button>

            {/* Accordion body */}
            {isOpen && (
              <div className="px-5 pb-5">
                {catMetrics.length === 0 ? (
                  <InsufficientDataState categoryName={cat.label} isDark={isDark} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catMetrics.map((m) => (
                      <SupplementalCard key={m.id} metric={m} isDark={isDark} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function KPIInsightsDashboard() {
  const projects = useProjectStore((s) => s.projects);
  const currentProject = useProjectStore((s) => s.currentProject);
  const setDeal = useProjectStore((s) => s.setDeal);
  const clearDeal = useProjectStore((s) => s.clearDeal);

  const { theme } = useTheme();
  const isDark   = theme === "dark";

  const [globalPhaseFilter, setGlobalPhaseFilter] = useState<'all' | 'Acquisition' | 'Fund' | 'Hold' | 'Exit'>('all');
  const [globalStrategyFilter, setGlobalStrategyFilter] = useState<'all' | 'LTR' | 'STR'>('all');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (globalPhaseFilter !== 'all') {
        const phaseNum = p.currentPhase ?? 1;
        const phaseLabel = getPhaseName(phaseNum);
        if (phaseLabel !== globalPhaseFilter) {
          return false;
        }
      }
      if (globalStrategyFilter !== 'all') {
        const sub = p.subStrategy || '';
        const isLTR = sub === 'LONG_TERM' || sub === 'BRRRR';
        const isSTR = sub === 'SHORT_TERM' || sub === 'MID_TERM';
        if (globalStrategyFilter === 'LTR' && !isLTR) return false;
        if (globalStrategyFilter === 'STR' && !isSTR) return false;
      }
      return true;
    });
  }, [projects, globalPhaseFilter, globalStrategyFilter]);

  const focusedProjects = useMemo(() => {
    if (currentProject) {
      return [currentProject];
    }
    return filteredProjects;
  }, [currentProject, filteredProjects]);

  const filteredProjectsForDropdown = filteredProjects;

  useEffect(() => {
    if (currentProject) {
      const isValid = filteredProjects.some(p => p.id === currentProject.id);
      if (!isValid) {
        clearDeal();
      }
    }
  }, [filteredProjects, currentProject, clearDeal]);

  const ins = usePortfolioInsights(focusedProjects);
  const { snapshots } = usePortfolioMetricSnapshots("monthly", focusedProjects);

  const headingColor = isDark ? "rgba(253,255,252,0.95)" : "#0d0a0b";
  const subColor     = isDark ? "rgba(253,255,252,0.42)" : "rgba(69,73,85,0.58)";
  const divider      = isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)";

  const healthBadge = useMemo(() => {
    const checks = [
      ins.portfolioDSCR !== null  && ins.portfolioDSCR  >= 1.25,
      ins.weightedCoC   !== null  && ins.weightedCoC    >= 8,
      ins.weightedCapRate !== null && ins.weightedCapRate >= 6,
      ins.weightedOER   !== null  && ins.weightedOER    < 50,
      ins.avgVacancyRate !== null  && ins.avgVacancyRate < 7,
    ];
    const passing = checks.filter(Boolean).length;
    return { passing, total: checks.length };
  }, [ins]);

  const supplementalMetrics = useMemo(() => {
    if (focusedProjects.length === 0) {
      return {
        ltv: null,
        debtYield: null,
        equityMultiple: null,
        breakEvenOccupancy: null,
        capitalReserves: null,
        paybackPeriod: null,
        tenantTurnover: null,
        leaseRenewal: null,
        maintenancePerUnit: null,
        budgetVariance: null,
      };
    }

    const ltvVals: number[] = [];
    const dyVals: number[] = [];
    const emVals: number[] = [];
    const beoVals: number[] = [];
    const crVals: number[] = [];
    const pbVals: number[] = [];
    const ttVals: number[] = [];
    const lrVals: number[] = [];
    const mcVals: number[] = [];
    const bvVals: number[] = [];

    for (const p of focusedProjects) {
      const ltvRes = computeLTVMetric(p);
      if (ltvRes.value !== null && ltvRes.state !== 'n/a' && !isNaN(ltvRes.value)) ltvVals.push(ltvRes.value);

      const dyRes = computeDebtYieldMetric(p);
      if (dyRes.value !== null && dyRes.state !== 'n/a' && !isNaN(dyRes.value)) dyVals.push(dyRes.value);

      const emRes = computeEquityMultipleMetric(p);
      if (emRes.value !== null && emRes.state !== 'n/a' && !isNaN(emRes.value)) emVals.push(emRes.value);

      const beoRes = computeBreakEvenOccupancyMetric(p);
      if (beoRes.value !== null && beoRes.state !== 'n/a' && !isNaN(beoRes.value)) beoVals.push(beoRes.value);

      const crRes = computeCapitalReservesMetric(p);
      if (crRes.value !== null && crRes.state !== 'n/a' && !isNaN(crRes.value)) crVals.push(crRes.value);

      const pbRes = computePaybackPeriodMetric(p);
      if (pbRes.value !== null && pbRes.state !== 'n/a' && !isNaN(pbRes.value)) pbVals.push(pbRes.value);

      const ttRes = computeTenantTurnoverMetric(p);
      if (ttRes.value !== null && ttRes.state !== 'n/a' && !isNaN(ttRes.value)) ttVals.push(ttRes.value);

      const lrRes = computeLeaseRenewalMetric(p);
      if (lrRes.value !== null && lrRes.state !== 'n/a' && !isNaN(lrRes.value)) lrVals.push(lrRes.value);

      const mcRes = computeMaintenanceCostPerUnitMetric(p);
      if (mcRes.value !== null && mcRes.state !== 'n/a' && !isNaN(mcRes.value)) mcVals.push(mcRes.value);

      const bvRes = computeBudgetVarianceMetric(p);
      if (bvRes.value !== null && bvRes.state !== 'n/a' && !isNaN(bvRes.value)) bvVals.push(bvRes.value);
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return {
      ltv: avg(ltvVals),
      debtYield: avg(dyVals),
      equityMultiple: avg(emVals),
      breakEvenOccupancy: avg(beoVals),
      capitalReserves: avg(crVals),
      paybackPeriod: avg(pbVals),
      tenantTurnover: avg(ttVals),
      leaseRenewal: avg(lrVals),
      maintenancePerUnit: avg(mcVals),
      budgetVariance: avg(bvVals),
    };
  }, [focusedProjects]);

  const supplementalDisplayList = useMemo(() => {
    const data = supplementalMetrics;
    const list: Omit<SupplementalMetricDisplay, 'status'>[] = [
      {
        id: 'EQUITY_MULTIPLE',
        name: 'Equity Multiple',
        category: 'financial',
        benchmark: '≥ 2.0×',
        phaseLabel: 'Hold / Exit',
        value: data.equityMultiple,
        format: (v) => `${v.toFixed(2)}×`,
        description: 'Pairs with IRR to measure total return divided by initial capital invested.',
      },
      {
        id: 'PAYBACK_PERIOD',
        name: 'Payback Period',
        category: 'financial',
        benchmark: '≤ 10 yrs',
        phaseLabel: 'Hold / Exit',
        value: data.paybackPeriod,
        format: (v) => `${v.toFixed(1)} yrs`,
        description: 'Horizon when cumulative cash flow matches initial cash invested.',
      },
      {
        id: 'TENANT_TURNOVER',
        name: 'Tenant Turnover Rate',
        category: 'operational',
        benchmark: '≤ 15%',
        phaseLabel: 'Hold',
        value: data.tenantTurnover,
        format: (v) => `${v.toFixed(1)}%`,
        description: 'Calculates historical annual move-outs relative to total asset units.',
      },
      {
        id: 'LEASE_RENEWAL',
        name: 'Lease Renewal Rate',
        category: 'operational',
        benchmark: '≥ 75%',
        phaseLabel: 'Hold',
        value: data.leaseRenewal,
        format: (v) => `${v.toFixed(1)}%`,
        description: 'Percentage of expiring leases successfully renewed without unit turnover.',
      },
      {
        id: 'MAINTENANCE_COST_PER_UNIT',
        name: 'Maintenance / Unit',
        category: 'operational',
        benchmark: '≤ $1,800/yr',
        phaseLabel: 'Hold',
        value: data.maintenancePerUnit,
        format: (v) => `$${Math.round(v).toLocaleString()}/yr`,
        description: 'Standardized annual maintenance cost allocated per leasable unit.',
      },
      {
        id: 'BUDGET_VARIANCE',
        name: 'Budget Variance',
        category: 'operational',
        benchmark: '≤ 0%',
        phaseLabel: 'Acquisition / Fund',
        value: data.budgetVariance,
        format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
        description: 'Measures project construction actuals against budgeted numbers.',
      },
      {
        id: 'CAPITAL_RESERVES',
        name: 'CapEx Funded Reserves',
        category: 'asset',
        benchmark: '≥ 12 mo',
        phaseLabel: 'Hold',
        value: data.capitalReserves,
        format: (v) => `${Math.round(v)} months`,
        description: 'Months of monthly maintenance reserves currently covered by liquid capital.',
      },
      {
        id: 'VACANCY',
        name: 'Vacancy Rate',
        category: 'asset',
        benchmark: '≤ 7%',
        phaseLabel: 'Acquisition / Hold',
        value: ins.avgVacancyRate,
        format: (v) => `${v.toFixed(1)}%`,
        description: 'Percentage of time the property sits empty, uncollected, or between tenant turnover.',
      },
      {
        id: 'PRICE_TO_RENT',
        name: 'Price-to-Rent Ratio',
        category: 'marketing',
        benchmark: '15–20',
        phaseLabel: 'Acquisition',
        value: ins.priceToRent,
        format: (v) => `${v.toFixed(1)}`,
        description: 'Price-to-Rent Ratio compares home purchase prices to average rental rates.',
      },
      {
        id: 'DOM',
        name: 'Days on Market (DOM)',
        category: 'marketing',
        benchmark: '≤ 45 days',
        phaseLabel: 'Acquisition / Exit',
        value: ins.avgDOM,
        format: (v) => `${Math.round(v)} days`,
        description: 'Market timeline benchmark for initial acquisition or disposition.',
      },
      {
        id: 'LTV',
        name: 'Loan-to-Value (LTV)',
        category: 'risk',
        benchmark: '≤ 75%',
        phaseLabel: 'Fund / Hold',
        value: data.ltv,
        format: (v) => `${v.toFixed(1)}%`,
        description: 'Represents the lender risk framework relative to the current valuation.',
      },
      {
        id: 'DEBT_YIELD',
        name: 'Debt Yield',
        category: 'risk',
        benchmark: '≥ 10%',
        phaseLabel: 'Fund / Hold',
        value: data.debtYield,
        format: (v) => `${v.toFixed(1)}%`,
        description: 'Measures cash-on-cash yield for the debt stack, ignoring underwriting terms.',
      },
      {
        id: 'BREAK_EVEN_OCCUPANCY',
        name: 'Break-Even Occupancy',
        category: 'risk',
        benchmark: '≤ 75%',
        phaseLabel: 'Hold',
        value: data.breakEvenOccupancy,
        format: (v) => `${v.toFixed(1)}%`,
        description: 'Required utilization to cover operating expenses and mortgage debt service.',
      },
    ];

    return list.map(item => {
      let status: "good" | "warn" | "bad" | "neutral" = "neutral";
      const v = item.value;
      if (v !== null) {
        if (item.id === 'EQUITY_MULTIPLE') status = v >= 2.0 ? "good" : v >= 1.5 ? "warn" : "bad";
        else if (item.id === 'PAYBACK_PERIOD') status = v <= 8 ? "good" : v <= 12 ? "warn" : "bad";
        else if (item.id === 'TENANT_TURNOVER') status = v <= 15 ? "good" : v <= 25 ? "warn" : "bad";
        else if (item.id === 'LEASE_RENEWAL') status = v >= 75 ? "good" : v >= 60 ? "warn" : "bad";
        else if (item.id === 'MAINTENANCE_COST_PER_UNIT') status = v <= 1500 ? "good" : v <= 2500 ? "warn" : "bad";
        else if (item.id === 'BUDGET_VARIANCE') status = v <= 0 ? "good" : v <= 5 ? "warn" : "bad";
        else if (item.id === 'CAPITAL_RESERVES') status = v >= 12 ? "good" : v >= 6 ? "warn" : "bad";
        else if (item.id === 'VACANCY') status = v <= 5 ? "good" : v <= 8 ? "warn" : "bad";
        else if (item.id === 'PRICE_TO_RENT') status = v < 15 ? "good" : v < 20 ? "warn" : "bad";
        else if (item.id === 'DOM') status = v <= 45 ? "good" : v <= 75 ? "warn" : "bad";
        else if (item.id === 'LTV') status = v <= 70 ? "good" : v <= 80 ? "warn" : "bad";
        else if (item.id === 'DEBT_YIELD') status = v >= 10 ? "good" : v >= 8 ? "warn" : "bad";
        else if (item.id === 'BREAK_EVEN_OCCUPANCY') status = v <= 70 ? "good" : v <= 80 ? "warn" : "bad";
      }
      return { ...item, status };
    });
  }, [supplementalMetrics, ins]);

  const occupancyRate = useMemo(() => {
    return ins.avgVacancyRate !== null ? 100 - ins.avgVacancyRate : null;
  }, [ins.avgVacancyRate]);

  const getMetricData = (title: string) => {
    const hasRent      = projects.some(p => (p.financials?.monthlyGrossRent ?? p.financials?.projectedMonthlyRent) != null);
    const hasOpEx      = projects.some(p =>
      (p.financials?.holdingCostTaxes ?? p.financials?.holdingCostInsurance ?? p.financials?.propertyManagementFeePercent) != null
    );
    const hasValue     = projects.some(p => (p.financials?.estimatedCurrentValue ?? p.financials?.estimatedARV ?? p.financials?.purchasePrice) != null && (p.financials?.estimatedCurrentValue ?? p.financials?.estimatedARV ?? p.financials?.purchasePrice)! > 0);
    const hasLoan      = projects.some(p => (p.financials?.loanAmount ?? 0) > 0);
    const hasRate      = projects.some(p => (p.financials?.loanInterestRate ?? 0) > 0);
    const hasVacancy   = projects.some(p => p.financials?.vacancyRatePercent != null);
    const hasOccupied  = projects.some(p => p.financials?.daysOccupied != null && p.financials?.totalHoldDays != null);
    const hasPurchase  = projects.some(p => (p.financials?.purchasePrice ?? p.financials?.targetPurchasePrice ?? 0) > 0);

    const firstProjectId = projects[0]?.id || "";
    const collectingRoute = firstProjectId ? `/dashboard/projects/${firstProjectId}` : "/dashboard/projects";
    const collectingLabel = firstProjectId ? "Project Workspace" : "Projects List";

    let formula = "";
    let benchmark = "";
    let statusNote = "";
    let missingFields: string[] = [];

    switch (title) {
      case "Net Operating Income":
        formula = "Total Income − Operating Expenses";
        benchmark = "Positive (> $0)";
        statusNote = ins.totalNOI !== null && hasRent && hasOpEx 
          ? "All income + expense inputs present — computing live."
          : hasRent
          ? "Rent found; add operating expense breakdown for a precise NOI."
          : "Enter Monthly Gross Rent in the project to unlock NOI.";
        if (ins.totalNOI === null || !hasRent || !hasOpEx) {
          missingFields = ["Monthly Gross Rent", "Vacancy Rate %", "Taxes / Insurance / Utilities", "Property Mgmt Fee", "Maintenance Reserve"];
        }
        break;
      case "Cash Flow":
        formula = "NOI − Annual Debt Service";
        benchmark = "Positive (> $0/mo)";
        statusNote = ins.totalCashFlow !== null && ins.totalCashFlow >= 0
          ? "Positive cash flow — operations are fully covered."
          : "Add Monthly Gross Rent, operating expenses, and loan terms to compute net cash flow.";
        if (ins.totalCashFlow === null) {
          missingFields = ["Monthly Gross Rent", "Operating Expenses", "Loan Amount", "Interest Rate"];
        }
        break;
      case "Capitalization Rate":
        formula = "NOI ÷ Current Property Value";
        benchmark = "4.0% - 8.0%";
        statusNote = ins.weightedCapRate !== null
          ? "Computing from NOI and estimated property value."
          : "Set Estimated ARV or Current Value in the project financials.";
        if (ins.weightedCapRate === null) {
          missingFields = ["Estimated ARV / Current Value", "NOI (Monthly Gross Rent, Expenses)"];
        }
        break;
      case "Cash-on-Cash Return":
        formula = "Annual Cash Flow ÷ Total Cash Invested";
        benchmark = "≥ 8.0%";
        statusNote = ins.weightedCoC !== null
          ? "Loan details found — computing leveraged cash-on-cash return."
          : "Enter loan details in the project to unlock CoC Return.";
        if (ins.weightedCoC === null) {
          missingFields = ["Loan Amount", "Interest Rate", "Down Payment / Cash Invested"];
        }
        break;
      case "Gross Rent Multiplier":
        formula = "Property Price ÷ Gross Annual Rent";
        benchmark = "8.0 - 12.0";
        statusNote = ins.weightedGRM !== null
          ? "GRM computing — use this to screen deals quickly against market comps."
          : "Enter Purchase Price and Monthly Rent to compute GRM.";
        if (ins.weightedGRM === null) {
          missingFields = ["Purchase Price (or Target Price)", "Monthly Gross Rent"];
        }
        break;
      case "Debt Service Coverage":
        formula = "NOI ÷ Annual Debt Service";
        benchmark = "≥ 1.25";
        statusNote = ins.portfolioDSCR !== null
          ? "DSCR is live — lender underwriting benchmark active."
          : "Enter Loan Amount and Interest Rate in the project to unlock DSCR.";
        if (ins.portfolioDSCR === null) {
          missingFields = ["Loan Amount", "Interest Rate", "NOI"];
        }
        break;
      case "Internal Rate of Return":
        formula = "Annualized rate of return equating NPV to zero";
        benchmark = "≥ 15.0%";
        statusNote = ins.averageIRR !== null
          ? "Weighted avg IRR across portfolio."
          : "Add exit data or hold period to compute IRR.";
        if (ins.averageIRR === null) {
          missingFields = ["Purchase Price", "Rehab Cost", "Hold Period", "Exit Price"];
        }
        break;
      case "Occupancy Rate":
        formula = "Occupied Days ÷ Total Hold Days × 100";
        benchmark = "≥ 90.0%";
        statusNote = hasOccupied
          ? "Using actual occupied / total hold day data."
          : "Showing underwriting assumption (default 93%). Set Vacancy Rate % or enter actual hold-phase occupancy to refine.";
        if (!hasOccupied) {
          missingFields = ["Vacancy Rate % (assumption)", "Occupied Days + Total Hold Days (actual)"];
        }
        break;
      case "Expense Ratio (OER)":
        formula = "Total Operating Expenses ÷ Gross Operating Income";
        benchmark = "≤ 45.0%";
        statusNote = ins.weightedOER !== null
          ? "OER computing from income and expense breakdown."
          : "Enter income and at least one expense line to compute OER.";
        if (ins.weightedOER === null) {
          missingFields = ["Monthly Gross Rent", "Taxes / Insurance / Utilities", "Property Mgmt Fee"];
        }
        break;
      case "Long-Term Appreciation":
        formula = "Annualized CAGR of Property Value";
        benchmark = "3.0% - 5.0% / yr";
        statusNote = ins.appreciationRate !== null
          ? "Appreciation rate CAGRs calculated."
          : "Needs current value + purchase price.";
        if (ins.appreciationRate === null) {
          missingFields = ["Purchase Price", "Estimated Current Value"];
        }
        break;
      default:
        break;
    }

    return {
      formula,
      benchmark,
      statusNote,
      missingFields,
      collectingRoute,
      collectingLabel,
    };
  };

  return (
    <div className="px-5 py-6 lg:px-8 lg:py-7 max-w-[1400px] mx-auto space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-[26px] font-bold leading-none mb-1 font-hanken"
            style={{ color: headingColor, letterSpacing: "-0.025em" }}
          >
            Insights
          </h1>
          <p className="text-[13px] font-hanken" style={{ color: subColor }}>
            {ins.projectCount > 0
              ? `Portfolio analytics across ${ins.projectCount} project${ins.projectCount !== 1 ? "s" : ""} — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
              : "Add projects to unlock portfolio-wide KPI analytics."}
          </p>
        </div>

        {ins.projectCount > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl shrink-0"
            style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(69,73,85,0.05)",
              border: `1px solid ${divider}`,
            }}
          >
            <div className="text-right">
              <p className="text-[11px] font-bold" style={{ color: subColor }}>
                Health Score
              </p>
              <p className="text-[20px] font-bold leading-tight" style={{
                color: healthBadge.passing >= 4 ? C.green : healthBadge.passing >= 2 ? C.amber : C.red,
              }}>
                {healthBadge.passing}<span className="text-[13px] font-normal" style={{ color: subColor }}>/{healthBadge.total}</span>
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: healthBadge.passing >= 4 ? `${C.green}20` : healthBadge.passing >= 2 ? `${C.amber}20` : `${C.red}20`,
              }}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{
                  color: healthBadge.passing >= 4 ? C.green : healthBadge.passing >= 2 ? C.amber : C.red,
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                {healthBadge.passing >= 4 ? "shield" : healthBadge.passing >= 2 ? "warning" : "error"}
              </span>
            </div>
          </div>
        )}
      </div>

      {projects.length > 0 && (
        <div
          className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 font-hanken"
          style={{
            background: isDark ? "rgba(255,255,255,0.01)" : "rgba(69,73,85,0.02)",
            borderColor: divider,
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: subColor }}>Focus Mode:</span>
              <div className="relative">
                <button
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-light hover:text-white transition-all duration-200 cursor-pointer"
                  style={{
                    background: isDark ? "#161318" : "#FFFFFF",
                    border: `1px solid ${divider}`,
                    color: isDark ? "#C0BEC2" : "rgba(69,73,85,0.8)",
                  }}
                >
                  <span className="max-w-[150px] truncate">{currentProject ? currentProject.propertyName : 'All Projects (Roll-up)'}</span>
                  <span className="material-symbols-outlined text-[14px]" style={{ color: subColor }}>
                    keyboard_arrow_down
                  </span>
                </button>
                {isProjectDropdownOpen && (
                  <div
                    className="absolute left-0 mt-1 w-60 rounded-xl p-1.5 shadow-2xl z-30 space-y-0.5"
                    style={{
                      background: isDark ? "#161318" : "#FFFFFF",
                      border: `1px solid ${divider}`,
                    }}
                  >
                    <button
                      onClick={() => {
                        clearDeal();
                        setIsProjectDropdownOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-left text-xs hover:bg-white/5 cursor-pointer"
                      style={{ color: isDark ? "#C0BEC2" : "rgba(69,73,85,0.8)" }}
                    >
                      <span>All Projects (Roll-up)</span>
                      {!currentProject && (
                        <span className="material-symbols-outlined text-[14px]" style={{ color: C.blue }}>
                          check
                        </span>
                      )}
                    </button>
                    {filteredProjectsForDropdown.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setDeal(p);
                          setIsProjectDropdownOpen(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-left text-xs hover:bg-white/5 cursor-pointer"
                        style={{ color: isDark ? "#C0BEC2" : "rgba(69,73,85,0.8)" }}
                      >
                        <span className="truncate">{p.propertyName ?? p.name}</span>
                        {currentProject?.id === p.id && (
                          <span className="material-symbols-outlined text-[14px]" style={{ color: C.blue }}>
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: subColor }}>Phase:</span>
              <select
                value={globalPhaseFilter}
                onChange={(e) => setGlobalPhaseFilter(e.target.value as any)}
                className="text-xs rounded-lg px-3 py-1.5 focus:outline-none font-light cursor-pointer"
                style={{
                  background: isDark ? "#161318" : "#FFFFFF",
                  border: `1px solid ${divider}`,
                  color: isDark ? "#C0BEC2" : "rgba(69,73,85,0.8)",
                }}
              >
                <option value="all">All Phases</option>
                <option value="Acquisition">Acquisition</option>
                <option value="Fund">Fund</option>
                <option value="Hold">Hold</option>
                <option value="Exit">Exit</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: subColor }}>Strategy:</span>
              <select
                value={globalStrategyFilter}
                onChange={(e) => setGlobalStrategyFilter(e.target.value as any)}
                className="text-xs rounded-lg px-3 py-1.5 focus:outline-none font-light cursor-pointer"
                style={{
                  background: isDark ? "#161318" : "#FFFFFF",
                  border: `1px solid ${divider}`,
                  color: isDark ? "#C0BEC2" : "rgba(69,73,85,0.8)",
                }}
              >
                <option value="all">All Strategies</option>
                <option value="LTR">Long-Term Rental (LTR)</option>
                <option value="STR">Short-Term Rental (STR)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {ins.projectCount === 0 ? (
        <div
          className="rounded-xl flex flex-col items-center justify-center py-20 text-center font-hanken"
          style={{
            background: isDark ? "rgba(30,27,34,0.7)" : "#FFFFFF",
            border: `1px solid ${divider}`,
          }}
        >
          <span
            className="material-symbols-outlined text-5xl mb-4"
            style={{ color: C.slate, fontVariationSettings: "'FILL' 0" }}
          >
            monitoring
          </span>
          <h2 className="text-[18px] font-semibold mb-2" style={{ color: headingColor }}>
            No project data yet
          </h2>
          <p className="text-[13px] max-w-xs leading-relaxed mb-6" style={{ color: subColor }}>
            Add at least one project with financial data to see your portfolio KPIs.
          </p>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold"
            style={{ background: C.slate, color: "#FDFFFC" }}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              add
            </span>
            Create first project
          </Link>
        </div>
      ) : (
        <>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/*  HERO TIER — The 33 Key Performance Indicators                   */}
          {/* ══════════════════════════════════════════════════════════════════ */}

          <SectionLabel label="The 33 Key Performance Indicators" isDark={isDark} />

          {/* Row 1: NOI (gauge) · Cash Flow · Cap Rate (gauge) · CoC (gauge) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* NOI */}
            <KPICard
              title="Net Operating Income"
              tooltipId="NOI"
              isDark={isDark}
              value={ins.totalNOI !== null ? `$${Math.round(ins.totalNOI).toLocaleString()}/yr` : undefined}
              status={
                ins.totalNOI === null ? "neutral" :
                ins.totalNOI > 0      ? "good"    : "bad"
              }
              {...getMetricData("Net Operating Income")}
            >
              <div className="flex justify-center py-2">
                <SvgGauge
                  value={ins.totalNOI !== null ? Math.min((ins.totalNOI / 50000) * 100, 100) : 0}
                  label={ins.totalNOI !== null ? `$${Math.round(ins.totalNOI / 1000)}k` : "—"}
                  sublabel="annual"
                  color={ins.totalNOI !== null && ins.totalNOI > 0 ? C.green : C.red}
                  isDark={isDark}
                />
              </div>
            </KPICard>

            {/* Cash Flow */}
            <KPICard
              title="Cash Flow"
              tooltipId="CASH_FLOW"
              isDark={isDark}
              status={
                ins.totalCashFlow === null ? "neutral" :
                ins.totalCashFlow >= 0     ? "good"    : "bad"
              }
              {...getMetricData("Cash Flow")}
            >
              <CashFlowIndicator cashFlow={ins.totalCashFlow} isDark={isDark} />
            </KPICard>

            {/* Cap Rate */}
            <KPICard
              title="Capitalization Rate"
              tooltipId="CAP_RATE"
              isDark={isDark}
              status={
                ins.weightedCapRate === null ? "neutral" :
                ins.weightedCapRate >= 6     ? "good"    :
                ins.weightedCapRate >= 4     ? "warn"    : "bad"
              }
              {...getMetricData("Capitalization Rate")}
            >
              <PercentageGauge
                value={ins.weightedCapRate}
                min={0} max={15}
                goodMin={6} warnMin={4}
                isDark={isDark}
              />
            </KPICard>

            {/* CoC */}
            <KPICard
              title="Cash-on-Cash Return"
              tooltipId="COC"
              isDark={isDark}
              status={
                ins.weightedCoC === null ? "neutral" :
                ins.weightedCoC >= 8     ? "good"    :
                ins.weightedCoC >= 5     ? "warn"    : "bad"
              }
              {...getMetricData("Cash-on-Cash Return")}
            >
              <PercentageGauge
                value={ins.weightedCoC}
                min={0} max={20}
                goodMin={8} warnMin={5}
                isDark={isDark}
              />
            </KPICard>
          </div>

          {/* Row 2: GRM · DSCR · IRR · Occupancy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GRM */}
            <KPICard
              title="Gross Rent Multiplier"
              tooltipId="GRM"
              isDark={isDark}
              status={
                ins.weightedGRM === null ? "neutral" :
                ins.weightedGRM <= 8     ? "good"    :
                ins.weightedGRM <= 12    ? "warn"    : "bad"
              }
              {...getMetricData("Gross Rent Multiplier")}
            >
              <GRMCounter grm={ins.weightedGRM} isDark={isDark} />
            </KPICard>

            {/* DSCR */}
            <KPICard
              title="Debt Service Coverage"
              tooltipId="DSCR"
              isDark={isDark}
              status={
                ins.portfolioDSCR === null ? "neutral" :
                ins.portfolioDSCR >= 1.25  ? "good"    :
                ins.portfolioDSCR >= 1.0   ? "warn"    : "bad"
              }
              {...getMetricData("Debt Service Coverage")}
            >
              <DSCRIndicator dscr={ins.portfolioDSCR} isDark={isDark} />
            </KPICard>

            {/* IRR */}
            <KPICard
              title="Internal Rate of Return"
              tooltipId="IRR"
              isDark={isDark}
              value={ins.averageIRR !== null ? `${ins.averageIRR.toFixed(1)}%` : undefined}
              status={
                ins.averageIRR === null ? "neutral" :
                ins.averageIRR >= 15    ? "good"    :
                ins.averageIRR >= 10    ? "warn"    : "bad"
              }
              {...getMetricData("Internal Rate of Return")}
            >
              <div className="flex flex-col gap-2 py-2">
                <span
                  className="text-[2.8rem] font-bold leading-none tabular-nums"
                  style={{
                    color: ins.averageIRR !== null
                      ? statusColor(ins.averageIRR >= 15 ? "good" : ins.averageIRR >= 10 ? "warn" : "bad")
                      : (isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)"),
                    letterSpacing: "-0.03em",
                  }}
                >
                  {ins.averageIRR !== null ? `${ins.averageIRR.toFixed(1)}` : "—"}
                  <span className="text-lg font-semibold" style={{ color: isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)" }}>%</span>
                </span>
                <p className="text-[11px]" style={{ color: isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)" }}>
                  {ins.averageIRR !== null ? "Weighted avg across portfolio" : "Add exit data or hold period to compute IRR."}
                </p>
              </div>
            </KPICard>

            {/* Occupancy Rate */}
            <KPICard
              title="Occupancy Rate"
              tooltipId="OCCUPANCY"
              isDark={isDark}
              value={occupancyRate !== null ? `${occupancyRate.toFixed(1)}%` : undefined}
              status={
                occupancyRate === null ? "neutral" :
                occupancyRate >= 90    ? "good"    :
                occupancyRate >= 80    ? "warn"    : "bad"
              }
              {...getMetricData("Occupancy Rate")}
            >
              <PercentageGauge
                value={occupancyRate}
                min={0} max={100}
                goodMin={90} warnMin={80}
                isDark={isDark}
              />
            </KPICard>
          </div>

          {/* Row 3: OER (donut) · Appreciation · ROI Trend (line chart, spans 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* OER */}
            <KPICard
              title="Expense Ratio (OER)"
              tooltipId="OER"
              isDark={isDark}
              status={
                ins.weightedOER === null ? "neutral" :
                ins.weightedOER < 40     ? "good"    :
                ins.weightedOER < 55     ? "warn"    : "bad"
              }
              {...getMetricData("Expense Ratio (OER)")}
            >
              <OERDonut oer={ins.weightedOER} isDark={isDark} />
            </KPICard>

            {/* Appreciation */}
            <KPICard
              title="Long-Term Appreciation"
              tooltipId="APPRECIATION"
              isDark={isDark}
              value={ins.appreciationRate !== null ? `${ins.appreciationRate.toFixed(1)}%/yr` : undefined}
              status={
                ins.appreciationRate === null ? "neutral" :
                ins.appreciationRate >= 3     ? "good"    :
                ins.appreciationRate >= 1     ? "warn"    : "bad"
              }
              {...getMetricData("Long-Term Appreciation")}
            >
              <div className="flex flex-col gap-2 py-2">
                <span
                  className="text-[2.8rem] font-bold leading-none tabular-nums"
                  style={{
                    color: ins.appreciationRate !== null
                      ? statusColor(ins.appreciationRate >= 3 ? "good" : ins.appreciationRate >= 1 ? "warn" : "bad")
                      : (isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)"),
                    letterSpacing: "-0.03em",
                  }}
                >
                  {ins.appreciationRate !== null ? `${ins.appreciationRate.toFixed(1)}` : "—"}
                  <span className="text-lg font-semibold" style={{ color: isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)" }}>%</span>
                </span>
                <p className="text-[11px]" style={{ color: isDark ? "rgba(253,255,252,0.38)" : "rgba(69,73,85,0.5)" }}>
                  {ins.appreciationRate !== null ? "Annualized CAGR" : "Needs current value + purchase price."}
                </p>
              </div>
            </KPICard>

            {/* ROI Trend spanning 2 cols */}
            <KPICard
              title="Portfolio ROI Trend"
              tooltipId="ROI"
              isDark={isDark}
              span={2}
              formula="Net Profit ÷ Total Investment Cost"
              benchmark="≥ 15.0%"
              statusNote="Trend of actual and projected ROI across the portfolio timeline."
            >
              <ROITrendLineChart snapshots={snapshots} isDark={isDark} />
            </KPICard>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/*  SUPPLEMENTAL TIER — 5-category accordions                       */}
          {/* ══════════════════════════════════════════════════════════════════ */}

          <SectionLabel label="All 33 KPIs by Category" isDark={isDark} />

          <KPICategorySections
            project={currentProject}
            projects={focusedProjects}
            isDark={isDark}
            snapshots={snapshots}
          />

          {/* ── Data Coverage — REIL Input Map ───────────────────────────── */}
          <SectionLabel label="Formula → Input Mapping" isDark={isDark} />
          <DataCoveragePanel projects={projects} ins={ins} isDark={isDark} />
        </>
      )}
    </div>
  );
}

// ─── Data Coverage Panel ───────────────────────────────────────────────────────
// Shows each metric, its formula inputs, the REIL wizard step that collects them,
// and whether the current project data satisfies that requirement.

interface DataCoverageRow {
  metric:      string;
  formula:     string;
  reilStep:    string;
  phase:       string;
  inputs:      string[];
  status:      "live" | "assumption" | "missing";
  statusNote:  string;
}

function DataCoveragePanel({
  projects,
  ins,
  isDark,
}: {
  projects: Project[];
  ins: PortfolioInsights;
  isDark: boolean;
}) {
  const headingColor = isDark ? "rgba(253,255,252,0.90)" : "#0d0a0b";
  const subColor     = isDark ? "rgba(253,255,252,0.40)" : "rgba(69,73,85,0.55)";
  const borderColor  = isDark ? "rgba(230, 234, 240, 0.10)" : "rgba(33, 34, 38, 0.10)";
  const cardBg       = isDark ? "rgba(30,27,34,0.50)" : "#FFFFFF";

  // Derive per-field coverage by inspecting the first project's financials
  const hasRent      = projects.some(p => (p.financials?.monthlyGrossRent ?? p.financials?.projectedMonthlyRent) != null);
  const hasOpEx      = projects.some(p =>
    (p.financials?.holdingCostTaxes ?? p.financials?.holdingCostInsurance ?? p.financials?.propertyManagementFeePercent) != null
  );
  const hasValue     = projects.some(p => (p.financials?.estimatedCurrentValue ?? p.financials?.estimatedARV ?? p.financials?.purchasePrice) != null && (p.financials?.estimatedCurrentValue ?? p.financials?.estimatedARV ?? p.financials?.purchasePrice)! > 0);
  const hasLoan      = projects.some(p => (p.financials?.loanAmount ?? 0) > 0);
  const hasRate      = projects.some(p => (p.financials?.loanInterestRate ?? 0) > 0);
  const hasCashInv   = ins.weightedCoC !== null;
  const hasVacancy   = projects.some(p => p.financials?.vacancyRatePercent != null);
  const hasOccupied  = projects.some(p => p.financials?.daysOccupied != null && p.financials?.totalHoldDays != null);
  const hasDomDates  = projects.some(p => (p.financials as any)?.listingDate && ((p.financials as any)?.soldDate ?? (p.financials as any)?.closingDate));
  const hasComps     = projects.some(p => (p.financials?.comparableSales ?? []).length > 0);
  const hasPurchase  = projects.some(p => (p.financials?.purchasePrice ?? p.financials?.targetPurchasePrice ?? 0) > 0);

  const rows: DataCoverageRow[] = [
    {
      metric:     "Net Operating Income",
      formula:    "Total Income − Operating Expenses",
      reilStep:   "Property → Hold",
      phase:      "Phase 1+",
      inputs:     ["Monthly Gross Rent", "Vacancy Rate %", "Taxes / Insurance / Utilities", "Property Mgmt Fee", "Maintenance Reserve"],
      status:     ins.totalNOI !== null && hasRent && hasOpEx ? "live" : hasRent ? "assumption" : "missing",
      statusNote: ins.totalNOI !== null && hasRent && hasOpEx
        ? "All income + expense inputs present — computing live."
        : hasRent
        ? "Rent found; add operating expense breakdown for a precise NOI."
        : "Enter Monthly Gross Rent in the project to unlock NOI.",
    },
    {
      metric:     "Capitalization Rate",
      formula:    "NOI ÷ Current Property Value",
      reilStep:   "Property",
      phase:      "Phase 1",
      inputs:     ["Estimated ARV / Current Value", "NOI (see above)"],
      status:     ins.weightedCapRate !== null ? "live" : hasValue ? "assumption" : "missing",
      statusNote: ins.weightedCapRate !== null
        ? "Computing from NOI and estimated property value."
        : "Set Estimated ARV or Current Value in the project financials.",
    },
    {
      metric:     "Cash-on-Cash Return",
      formula:    "Annual Cash Flow ÷ Total Cash Invested",
      reilStep:   "Ownership → Terms",
      phase:      "Phase 2",
      inputs:     ["Loan Amount", "Interest Rate", "Loan Term (years)", "Down Payment / Cash Invested"],
      status:     hasCashInv ? "live" : hasLoan ? "assumption" : "missing",
      statusNote: hasCashInv
        ? "Loan details found — computing leveraged cash-on-cash return."
        : hasLoan
        ? "Loan amount found; add interest rate and term to compute debt service."
        : "Enter loan details in the project to unlock CoC Return.",
    },
    {
      metric:     "Return on Investment",
      formula:    "Net Profit ÷ Total Investment Cost",
      reilStep:   "Property → Exit (tracked over time)",
      phase:      "Phase 1+",
      inputs:     ["Purchase Price", "Rehab Cost", "Annual Cash Flow", "Appreciation (estimated or realized)"],
      status:     hasPurchase ? "live" : "missing",
      statusNote: hasPurchase
        ? "Showing blended ROI (CoC Return + annualized appreciation) as the trend builds over time."
        : "Enter Purchase Price and hold timeline data to compute ROI.",
    },
    {
      metric:     "Debt Service Coverage Ratio",
      formula:    "NOI ÷ Annual Debt Service",
      reilStep:   "Terms",
      phase:      "Phase 2",
      inputs:     ["Loan Amount", "Interest Rate", "Loan Term (years)"],
      status:     ins.portfolioDSCR !== null ? "live" : hasLoan && hasRate ? "assumption" : "missing",
      statusNote: ins.portfolioDSCR !== null
        ? "DSCR is live — lender underwriting benchmark active."
        : hasLoan && hasRate
        ? "Loan + rate found; NOI is needed to compute DSCR ratio."
        : "Enter Loan Amount and Interest Rate in the project to unlock DSCR.",
    },
    {
      metric:     "Vacancy Rate",
      formula:    "Vacant Days ÷ Total Hold Days × 100",
      reilStep:   "Property (assumption) → Hold (actuals)",
      phase:      "Phase 1 assumption / Phase 3 actuals",
      inputs:     ["Vacancy Rate % (assumption, default 7%)", "Occupied Days + Total Hold Days (actual)"],
      status:     hasOccupied ? "live" : hasVacancy || ins.avgVacancyRate !== null ? "assumption" : "missing",
      statusNote: hasOccupied
        ? "Using actual occupied / total hold day data."
        : ins.avgVacancyRate !== null
        ? "Showing underwriting assumption (default 7%). Set Vacancy Rate % in the project or enter actual hold-phase occupancy to refine."
        : "No vacancy data. Defaulting to 7% economic vacancy assumption.",
    },
    {
      metric:     "Operating Expense Ratio",
      formula:    "Total Operating Expenses ÷ Gross Operating Income",
      reilStep:   "Property",
      phase:      "Phase 1+",
      inputs:     ["Monthly Gross Rent", "Taxes / Insurance / Utilities", "Property Mgmt Fee", "Maintenance Reserve", "HOA"],
      status:     ins.weightedOER !== null ? "live" : hasRent || hasOpEx ? "assumption" : "missing",
      statusNote: ins.weightedOER !== null
        ? "OER computing from income and expense breakdown."
        : "Enter income and at least one expense line to compute OER.",
    },
    {
      metric:     "Gross Rent Multiplier",
      formula:    "Property Price ÷ Gross Annual Rent",
      reilStep:   "Property",
      phase:      "Phase 1",
      inputs:     ["Purchase Price (or Target Price)", "Monthly Gross Rent"],
      status:     ins.weightedGRM !== null ? "live" : hasPurchase || hasRent ? "assumption" : "missing",
      statusNote: ins.weightedGRM !== null
        ? "GRM computing — use this to screen deals quickly against market comps."
        : "Enter Purchase Price and Monthly Rent to compute GRM.",
    },
    {
      metric:     "Days on Market",
      formula:    "Listing Date → Closing Date (actual) or Avg of Comparable Sales",
      reilStep:   "Property (comps) → Exit (actuals)",
      phase:      "Phase 1 via comps / Phase 4 actuals",
      inputs:     ["Listing Date + Closing Date (actual)", "OR: Comparable Sales DOM (market proxy)"],
      status:     ins.avgDOM !== null ? (hasDomDates ? "live" : "assumption") : hasComps ? "assumption" : "missing",
      statusNote: hasDomDates
        ? "Using actual listing-to-close date range."
        : hasComps
        ? "Sourced from comparable sales comps. Add Listing Date + Closing Date to the project for exact figures."
        : "No DOM data yet. Add comparable sales comps to your project, or enter listing and closing dates in the Exit phase.",
    },
    {
      metric:     "Price-to-Rent Ratio",
      formula:    "Property Price ÷ Gross Annual Rent (project-level proxy)",
      reilStep:   "Property",
      phase:      "Phase 1",
      inputs:     ["Purchase Price", "Monthly Gross Rent", "(Ideal: Market Median Price + Market Avg Rent for true market P/R)"],
      status:     ins.priceToRent !== null ? "live" : hasPurchase || hasRent ? "assumption" : "missing",
      statusNote: ins.priceToRent !== null
        ? "Showing project-level P/R (same formula as GRM). A high value signals a strong rental demand market."
        : "Enter Purchase Price and Monthly Rent. For true market-level P/R, use your market's median home price ÷ median annual rent.",
    },
  ];

  const statusConfig = {
    live:       { dot: C.green, label: "Live",       text: isDark ? C.green  : "#2d7a2d" },
    assumption: { dot: C.amber, label: "Assumption", text: isDark ? C.amber  : "#b36800" },
    missing:    { dot: C.red,   label: "Missing",    text: isDark ? C.red    : "#c0392b" },
  } as const;

  return (
    <article
      className="rounded-xl overflow-hidden"
      style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        backdropFilter: isDark ? "blur(20px)" : undefined,
        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-start gap-3"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.07)" }}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: C.blue, fontVariationSettings: "'FILL' 0" }}
          >
            schema
          </span>
        </div>
        <div>
          <h2 className="text-[14px] font-bold" style={{ color: headingColor }}>
            REIL Wizard → Metric Input Map
          </h2>
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: subColor }}>
            Every KPI above is derived from specific fields in your project. Use this map to know exactly what to fill in — and why — during the REIL creation flow.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {(["live", "assumption", "missing"] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: statusConfig[s].dot }} />
              <span className="text-[10px] font-semibold uppercase" style={{ color: subColor, letterSpacing: "0.07em" }}>
                {statusConfig[s].label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
              {["Metric", "Formula", "REIL Step", "Phase Gate", "Required Inputs", "Status"].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-[10px] font-bold uppercase"
                  style={{ color: subColor, letterSpacing: "0.08em", whiteSpace: "nowrap" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const cfg = statusConfig[row.status];
              return (
                <tr
                  key={row.metric}
                  style={{
                    borderBottom: i < rows.length - 1 ? `1px solid ${borderColor}` : undefined,
                    background: i % 2 === 0
                      ? isDark ? "rgba(255,255,255,0.015)" : "rgba(69,73,85,0.025)"
                      : "transparent",
                  }}
                >
                  {/* Metric */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                      <span className="text-[12px] font-semibold" style={{ color: headingColor, whiteSpace: "nowrap" }}>
                        {row.metric}
                      </span>
                    </div>
                  </td>

                  {/* Formula */}
                  <td className="px-4 py-3 align-top">
                    <span
                      className="text-[11px] font-mono px-2 py-0.5 rounded"
                      style={{
                        background: isDark ? "rgba(122,158,170,0.12)" : "rgba(122,158,170,0.12)",
                        color: C.blue,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.formula}
                    </span>
                  </td>

                  {/* REIL Step */}
                  <td className="px-4 py-3 align-top">
                    <span className="text-[11px]" style={{ color: subColor, whiteSpace: "nowrap" }}>
                      {row.reilStep}
                    </span>
                  </td>

                  {/* Phase Gate */}
                  <td className="px-4 py-3 align-top">
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.07)",
                        color: subColor,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.phase}
                    </span>
                  </td>

                  {/* Required Inputs */}
                  <td className="px-4 py-3 align-top max-w-[260px]">
                    <ul className="space-y-0.5">
                      {row.inputs.map(inp => (
                        <li key={inp} className="flex items-start gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: subColor }} />
                          <span className="text-[11px]" style={{ color: subColor }}>
                            {inp}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 align-top min-w-[180px]">
                    <div className="space-y-1">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{
                          background: `${cfg.dot}18`,
                          color: cfg.text,
                          letterSpacing: "0.06em",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </span>
                      <p className="text-[11px] leading-relaxed" style={{ color: subColor }}>
                        {row.statusNote}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer CTA */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-4"
        style={{ borderTop: `1px solid ${borderColor}` }}
      >
        <p className="text-[12px]" style={{ color: subColor }}>
          Missing inputs? Fill them in during the project creation flow or directly inside the project workspace.
        </p>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold shrink-0"
          style={{ background: C.slate, color: "#FDFFFC" }}
        >
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0" }}>
            add
          </span>
          New REIL Project
        </Link>
      </div>
    </article>
  );
}
