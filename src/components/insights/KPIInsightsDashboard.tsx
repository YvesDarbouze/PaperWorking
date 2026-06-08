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
  computeNOIComponents,
  computeAnnualDebtService,
} from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";
import Link from "next/link";
import { usePortfolioMetricSnapshots } from "@/hooks/usePortfolioMetricSnapshots";

// ─── Palette constants ─────────────────────────────────────────────────────────

const C = {
  green:   "#5aaa3f",
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
    whyItMatters: "Isolates the property's pure operational performance to gauge baseline earning power.",
    benchmark:    "Target depends on asset class. $500+/mo per unit is a common starting threshold.",
    goodSign:     "Rising NOI year-over-year signals rent growth and expense control.",
  },
  CAP_RATE: {
    theData:      "NOI ÷ Current Property Value",
    whyItMatters: "Assesses the baseline return on investment and risk level without factoring in your specific loan structure.",
    benchmark:    "6–10% is typical for residential. Below 4% signals overpriced or low-yield market.",
    goodSign:     "Cap Rate above your target return threshold means the deal works without leverage.",
  },
  COC: {
    theData:      "Annual Pre-Tax Cash Flow ÷ Total Cash Invested",
    whyItMatters: "Measures the actual return you make on the money you put in, taking your specific mortgage terms into account.",
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
    whyItMatters: "Lenders look for a DSCR above 1.25 to ensure the property generates enough income to safely cover its loan payments.",
    benchmark:    "Lenders require ≥ 1.20. Green zone starts at 1.25. Below 1.0 is a red flag.",
    goodSign:     "DSCR ≥ 1.25 means the property covers its debt with a 25% safety buffer.",
  },
  OER: {
    theData:      "Total Operating Expenses ÷ Gross Operating Income",
    whyItMatters: "Highlights the cost-efficiency of the building; a high OER means a larger percentage of your income goes to maintenance and taxes.",
    benchmark:    "35–45% is typical for well-run residential. Above 60% signals expense problems.",
    goodSign:     "OER below 40% with stable rents indicates efficient operations and strong NOI margin.",
  },
  GRM: {
    theData:      "Property Price ÷ Gross Annual Rental Income",
    whyItMatters: "A quick screening tool that estimates how many years it would take for the property to pay for itself in gross income.",
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
}

function KPICard({ title, tooltipId, value, status, statusLabel, children, isDark, span = 1 }: KPICardProps) {
  const panelBg = isDark
    ? "linear-gradient(145deg, rgba(30,27,34,0.72) 0%, rgba(18,16,20,0.90) 100%)"
    : "#FFFFFF";
  const borderColor = isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)";
  const headingColor = isDark ? "rgba(253,255,252,0.90)" : "#0d0a0b";
  const mutedColor   = isDark ? "rgba(253,255,252,0.40)" : "rgba(69,73,85,0.55)";

  return (
    <article
      className={`rounded-xl flex flex-col overflow-hidden ${span === 2 ? "lg:col-span-2" : ""}`}
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
          stroke="#3279F9"
          strokeWidth={2}
          dot={{ fill: "#3279F9", r: 3 }}
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
          <div
            key={s.label}
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(69,73,85,0.05)",
              border: `1px solid ${isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)"}`,
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${color}18` }}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ color, fontVariationSettings: "'FILL' 0" }}
              >
                {s.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span
                  className="text-[1.5rem] font-bold leading-none tabular-nums"
                  style={{ color: s.value === "—" ? mutedClr : color }}
                >
                  {s.value}
                </span>
                <span className="text-[10px] font-bold uppercase" style={{ color: mutedClr }}>
                  {s.label}
                </span>
              </div>
              <p className="text-[11px] leading-snug" style={{ color: mutedClr }}>
                {s.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Portfolio aggregation hook ────────────────────────────────────────────────

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
  projectCount:      number;
  roiByProject:      Array<{ name: string; roi: number }>;
}

function usePortfolioInsights(projects: Project[]): PortfolioInsights {
  return useMemo(() => {
    if (projects.length === 0) {
      return {
        totalNOI: null, weightedCapRate: null, weightedCoC: null,
        portfolioDSCR: null, weightedOER: null, weightedGRM: null,
        priceToRent: null, avgVacancyRate: null, avgDOM: null,
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
    let roiByProject: Array<{ name: string; roi: number }> = [];

    for (const p of projects) {
      const f = p.financials;
      if (!f) continue;

      const m = deriveAllMetrics(
        f,
        f.estimatedCurrentValue || f.estimatedARV,
        p.strategyType,
        p.currentPhase,
        p.createdAt,
      );

      const propValue   = f.estimatedCurrentValue || f.estimatedARV || f.purchasePrice || f.targetPrice || 0;
      const propPrice   = f.purchasePrice || f.targetPrice || 0;
      const annualRent  = (f.monthlyGrossRent || f.projectedMonthlyRent || 0) * 12;
      const debtService = computeAnnualDebtService(
        f.loanAmount ?? 0,
        f.loanInterestRate ?? 0,
        (f.loanTermYears ?? 30) * 12,
      );
      const noiComp = computeNOIComponents(f, p.strategyType, p.currentPhase);

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

      // Vacancy: weight by gross rent; unit-weight fallback for projects with assumption but no income yet
      if (noiComp.grossRentalIncome > 0) {
        vacancyWeighted += m.vacancyRate * noiComp.grossRentalIncome;
        vacancyWeight   += noiComp.grossRentalIncome;
      } else if (m.vacancyRate > 0) {
        vacancyWeighted += m.vacancyRate;
        vacancyWeight   += 1;
      }

      // DOM — prefer actual listing-to-sale dates; fall back to comparable sales market data
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

      // Per-project ROI
      const name = (p.propertyName || p.address || `Project ${p.id.slice(0,4)}`).slice(0, 16);
      const flipROI = p.strategyType === "Fix & Flip" && m.totalCashInvested > 0
        ? ((propValue - (f.purchasePrice ?? 0) - (f.projectedRehabCost ?? 0)) / m.totalCashInvested) * 100
        : null;
      const rentROI = m.totalCashInvested > 0
        ? (m.annualCashFlow / m.totalCashInvested) * 100
        : null;
      const roi = flipROI ?? rentROI;
      if (roi !== null && Number.isFinite(roi)) {
        roiByProject.push({ name, roi: parseFloat(roi.toFixed(1)) });
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
      projectCount:    projects.length,
      roiByProject,
    };
  }, [projects]);
}

// ─── Section separator ─────────────────────────────────────────────────────────

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  const color  = isDark ? "rgba(253,255,252,0.35)" : "rgba(69,73,85,0.45)";
  const border = isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)";
  return (
    <div className="flex items-center gap-3">
      <p className="text-[10px] font-bold uppercase shrink-0" style={{ letterSpacing: "0.1em", color }}>
        {label}
      </p>
      <div className="flex-1 h-px" style={{ background: border }} />
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function KPIInsightsDashboard() {
  const projects = useProjectStore((s) => s.projects);
  const { theme } = useTheme();
  const isDark   = theme === "dark";
  const ins      = usePortfolioInsights(projects);
  const { snapshots } = usePortfolioMetricSnapshots("monthly", projects);

  const headingColor = isDark ? "rgba(253,255,252,0.95)" : "#0d0a0b";
  const subColor     = isDark ? "rgba(253,255,252,0.42)" : "rgba(69,73,85,0.58)";
  const divider      = isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)";

  // Overall health count
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

  return (
    <div className="px-5 py-6 lg:px-8 lg:py-7 max-w-[1400px] mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-[26px] font-bold leading-none mb-1"
            style={{ color: headingColor, letterSpacing: "-0.025em" }}
          >
            Insights
          </h1>
          <p className="text-[13px]" style={{ color: subColor }}>
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

      {ins.projectCount === 0 ? (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <div
          className="rounded-xl flex flex-col items-center justify-center py-20 text-center"
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
          {/* ── Section 1: Income Health ─────────────────────────────────── */}
          <SectionLabel label="Income & Efficiency" isDark={isDark} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* NOI Gauge */}
            <KPICard
              title="Net Operating Income"
              tooltipId="NOI"
              isDark={isDark}
              status={
                ins.totalNOI === null ? "neutral" :
                ins.totalNOI > 0     ? "good"    : "bad"
              }
              statusLabel={ins.totalNOI !== null ? (ins.totalNOI > 0 ? "Profitable" : "Negative") : undefined}
            >
              <div className="flex flex-col items-center gap-1">
                <SvgGauge
                  value={ins.totalNOI !== null
                    ? Math.min(100, Math.max(0, ((ins.totalNOI + 12000) / 24000) * 100))
                    : 0}
                  label={ins.totalNOI !== null
                    ? (Math.abs(ins.totalNOI) >= 12000
                      ? `$${(ins.totalNOI / 12000).toFixed(1)}K/mo`
                      : `$${Math.round(ins.totalNOI / 12).toLocaleString()}/mo`)
                    : "—"}
                  sublabel="Annual NOI"
                  color={ins.totalNOI !== null && ins.totalNOI > 0 ? C.green : C.red}
                  isDark={isDark}
                  size={160}
                />
                {ins.totalNOI !== null && (
                  <p className="text-[12px] text-center" style={{ color: subColor }}>
                    ${Math.abs(ins.totalNOI).toLocaleString()} / year
                  </p>
                )}
              </div>
            </KPICard>

            {/* OER Donut */}
            <KPICard
              title="Operating Expense Ratio"
              tooltipId="OER"
              isDark={isDark}
              status={
                ins.weightedOER === null ? "neutral" :
                ins.weightedOER < 40    ? "good"    :
                ins.weightedOER < 55    ? "warn"    : "bad"
              }
              statusLabel={
                ins.weightedOER !== null
                  ? (ins.weightedOER < 40 ? "Efficient" : ins.weightedOER < 55 ? "Moderate" : "High")
                  : undefined
              }
            >
              <OERDonut oer={ins.weightedOER} isDark={isDark} />
            </KPICard>

            {/* DSCR */}
            <KPICard
              title="Debt Service Coverage Ratio"
              tooltipId="DSCR"
              isDark={isDark}
              status={
                ins.portfolioDSCR === null ? "neutral" :
                ins.portfolioDSCR >= 1.25  ? "good"    :
                ins.portfolioDSCR >= 1.0   ? "warn"    : "bad"
              }
              statusLabel={
                ins.portfolioDSCR !== null
                  ? (ins.portfolioDSCR >= 1.25 ? "Safe" : ins.portfolioDSCR >= 1.0 ? "Tight" : "At Risk")
                  : undefined
              }
            >
              <DSCRIndicator dscr={ins.portfolioDSCR} isDark={isDark} />
            </KPICard>
          </div>

          {/* ── Section 2: Return Metrics ────────────────────────────────── */}
          <SectionLabel label="Return Metrics" isDark={isDark} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cap Rate */}
            <KPICard
              title="Capitalization Rate"
              tooltipId="CAP_RATE"
              isDark={isDark}
              value={ins.weightedCapRate !== null ? `${ins.weightedCapRate.toFixed(1)}%` : undefined}
              status={
                ins.weightedCapRate === null ? "neutral" :
                ins.weightedCapRate >= 7     ? "good"    :
                ins.weightedCapRate >= 4     ? "warn"    : "bad"
              }
            >
              <PercentageGauge
                value={ins.weightedCapRate}
                min={0} max={15}
                warnMin={4} goodMin={7}
                isDark={isDark}
              />
            </KPICard>

            {/* Cash-on-Cash */}
            <KPICard
              title="Cash-on-Cash Return"
              tooltipId="COC"
              isDark={isDark}
              value={ins.weightedCoC !== null ? `${ins.weightedCoC.toFixed(1)}%` : undefined}
              status={
                ins.weightedCoC === null ? "neutral" :
                ins.weightedCoC >= 10    ? "good"    :
                ins.weightedCoC >= 6     ? "warn"    : "bad"
              }
            >
              <PercentageGauge
                value={ins.weightedCoC}
                min={-5} max={25}
                warnMin={6} goodMin={10}
                isDark={isDark}
              />
            </KPICard>

            {/* ROI Trend */}
            <KPICard
              title="Return on Investment"
              tooltipId="ROI"
              isDark={isDark}
              value={
                snapshots.length > 0
                  ? `${((snapshots[snapshots.length - 1].cashOnCashReturn ?? 0) + (snapshots[snapshots.length - 1].appreciation ?? 0)).toFixed(1)}%`
                  : undefined
              }
              status={
                snapshots.length === 0 ? "neutral" :
                ((snapshots[snapshots.length - 1].cashOnCashReturn ?? 0) + (snapshots[snapshots.length - 1].appreciation ?? 0)) >= 10 ? "good" : "warn"
              }
            >
              <ROITrendLineChart snapshots={snapshots} isDark={isDark} />
            </KPICard>
          </div>

          {/* ── Section 3: Market Intelligence ──────────────────────────── */}
          <SectionLabel label="Market Intelligence" isDark={isDark} />

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
            >
              <GRMCounter grm={ins.weightedGRM} isDark={isDark} />
            </KPICard>

            {/* Price-to-Rent */}
            <KPICard
              title="Price-to-Rent Ratio"
              tooltipId="PRICE_TO_RENT"
              isDark={isDark}
              status={
                ins.priceToRent === null ? "neutral" :
                ins.priceToRent < 15     ? "good"    :
                ins.priceToRent < 20     ? "warn"    : "bad"
              }
            >
              <PriceToRentIndicator ptr={ins.priceToRent} isDark={isDark} />
            </KPICard>

            {/* Vacancy + DOM spanning 2 cols */}
            <div className="sm:col-span-1 lg:col-span-2">
              <KPICard
                title="Vacancy Rate & Days on Market"
                tooltipId="VACANCY"
                isDark={isDark}
                span={1}
              >
                <VacancyDOMStats
                  vacancyRate={ins.avgVacancyRate}
                  dom={ins.avgDOM}
                  isDark={isDark}
                />
              </KPICard>
            </div>
          </div>

          {/* ── Section 4: Data Coverage — REIL Input Map ───────────────── */}
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
