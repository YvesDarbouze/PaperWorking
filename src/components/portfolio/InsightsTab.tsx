"use client";

import React, { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { usePortfolioInsights, StressParameters } from "@/hooks/usePortfolioInsights";
import RiskStressTester from "./RiskStressTester";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function fmtRatio(n: number | null, suffix = ""): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}${suffix}`;
}

// ─── Custom Tooltip Component ────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  prefix?: string;
  suffix?: string;
  isCurrency?: boolean;
}

const ChartTooltip = ({ active, payload, label, prefix = "", suffix = "", isCurrency = false }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-white rounded-md border border-neutral-100 p-3 shadow-md text-[12px] text-neutral-800 flex flex-col gap-1.5"
        style={{
          boxShadow: "0 4px 20px rgba(69, 73, 85, 0.05)",
          fontFamily: "'PT Mono', monospace",
        }}
      >
        <p className="font-bold border-b border-neutral-100 pb-1 mb-1 text-neutral-900">Year {label}</p>
        {payload.map((item: any, index: number) => {
          let val = item.value;
          if (isCurrency) {
            val = fmtCurrency(val);
          } else if (suffix === "%") {
            val = fmtPct(val);
          } else {
            val = fmtRatio(val, suffix);
          }
          return (
            <p key={index} className="flex items-center gap-4 justify-between">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                {item.name}:
              </span>
              <span className="font-bold text-neutral-900">{prefix}{val}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InsightsTab() {
  const projects = useProjectStore((s) => s.projects);

  // Initial Stress Testing Parameters state
  const [stressParams, setStressParams] = useState<StressParameters>({
    vacancyRate: 5,
    interestRateSpike: 0,
    opexOverrun: 0,
    taxReassessment: 0,
    rentGrowthOverride: 3,
    expenseGrowthOverride: 2.5,
  });

  const {
    stabilizedProjects,
    workingCapitalProjects,
    portfolioRollup,
    portfolioProForma,
  } = usePortfolioInsights(projects, stressParams);

  if (projects.length === 0) {
    return (
      <div
        className="rounded-lg overflow-hidden py-16 px-8 text-center flex flex-col items-center justify-center bg-white border border-neutral-100 shadow-sm shadow-neutral-100"
        style={{
          boxShadow: "0 2px 12px rgba(69, 73, 85, 0.02)",
        }}
      >
        <span
          className="material-symbols-outlined text-5xl mb-4 text-neutral-300"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          monitoring
        </span>
        <h3
          className="text-[16px] font-bold mb-2 text-neutral-900"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          No Investments Sourced Yet
        </h3>
        <p
          className="text-[13px] max-w-xs leading-relaxed mb-6 text-neutral-500"
          style={{ fontFamily: "'Roboto', sans-serif" }}
        >
          Create a project and underwrite financials to enable portfolio-wide yield analysis and asset metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 bg-neutral-50 min-h-screen">
      {/* Left Column: Visual Analytics */}
      <main className="flex-1 flex flex-col gap-8 min-w-0">
        
        {/* Section 1: Portfolio Rollup Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cap Rate Card */}
          <article
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-6 flex flex-col justify-between h-[130px] relative overflow-hidden"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Capitalization Rate
              </span>
              <span className="material-symbols-outlined text-[20px] text-neutral-400">trending_up</span>
            </div>
            <div className="mt-2">
              <div
                className="text-[2.2rem] font-bold text-neutral-900 tracking-tight leading-none mb-1 font-mono"
                style={{ fontFamily: "'PT Mono', monospace" }}
              >
                {fmtPct(portfolioRollup.averageCapRate)}
              </div>
              <p
                className="text-[11px] text-neutral-500"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Average stabilized capitalization yield
              </p>
            </div>
          </article>

          {/* Cash-on-Cash Return Card */}
          <article
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-6 flex flex-col justify-between h-[130px] relative overflow-hidden"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Cash-on-Cash Return
              </span>
              <span className="material-symbols-outlined text-[20px] text-neutral-400">payments</span>
            </div>
            <div className="mt-2">
              <div
                className="text-[2.2rem] font-bold text-emerald-600 tracking-tight leading-none mb-1 font-mono"
                style={{ fontFamily: "'PT Mono', monospace" }}
              >
                {fmtPct(portfolioRollup.averageCoC)}
              </div>
              <p
                className="text-[11px] text-neutral-500"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Cash-in to cash-out operational dividend yield
              </p>
            </div>
            <div className="absolute top-0 right-0 w-[4px] h-full bg-emerald-600" />
          </article>

          {/* Operating Expense Ratio (OER) */}
          <article
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-6 flex flex-col justify-between h-[130px] relative overflow-hidden"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Operating Expense Ratio (OER)
              </span>
              <span className="material-symbols-outlined text-[20px] text-neutral-400">analytics</span>
            </div>
            <div className="mt-2">
              <div
                className="text-[2.2rem] font-bold text-neutral-900 tracking-tight leading-none mb-1 font-mono"
                style={{ fontFamily: "'PT Mono', monospace" }}
              >
                {fmtPct(portfolioRollup.averageOER)}
              </div>
              <p
                className="text-[11px] text-neutral-500"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Proportion of gross revenues consumed by expenses
              </p>
            </div>
          </article>
        </section>

        {/* Section 2: Charts (DSCR and NOI/Cash Flow) */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Chart A: DSCR 10-Year Area Chart */}
          <div
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-6 flex flex-col gap-4"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div>
              <h4
                className="text-neutral-900 text-[14px] font-bold tracking-tight mb-0.5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                10-Year Debt Service Coverage Ratio (DSCR)
              </h4>
              <p
                className="text-neutral-500 text-[11px]"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Stabilized portfolio solvency projection vs lender constraints.
              </p>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={portfolioProForma}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="dscrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fontFamily: "PT Mono", fill: "#888888" }}
                    stroke="#e5e5e5"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "PT Mono", fill: "#888888" }}
                    stroke="#e5e5e5"
                    domain={[0, 'auto']}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip suffix="x" />} />
                  <ReferenceLine
                    y={1.25}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{
                      value: "Lender Floor (1.25x)",
                      fill: "#ef4444",
                      fontSize: 9,
                      fontFamily: "PT Mono",
                      position: "insideBottomRight",
                      offset: 5,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="dscr"
                    name="Portfolio DSCR"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#dscrGradient)"
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart B: NOI vs Cash Flow Composed Chart */}
          <div
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-6 flex flex-col gap-4"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div>
              <h4
                className="text-neutral-900 text-[14px] font-bold tracking-tight mb-0.5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                10-Year Operating Income vs Cash Flow
              </h4>
              <p
                className="text-neutral-500 text-[11px]"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                YoY growth correlation between Net Operating Income and Net Cash Flow.
              </p>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={portfolioProForma}
                  margin={{ top: 10, right: -10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fontFamily: "PT Mono", fill: "#888888" }}
                    stroke="#e5e5e5"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "PT Mono", fill: "#888888" }}
                    stroke="#e5e5e5"
                    tickLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip isCurrency={true} />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: 10,
                      fontFamily: "Roboto",
                      paddingTop: 10,
                    }}
                  />
                  <Bar
                    dataKey="noi"
                    name="Net Operating Income"
                    fill="#18181b"
                    radius={[2, 2, 0, 0]}
                    barSize={18}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="preTaxCashFlow"
                    name="Pre-Tax Cash Flow"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Section 3: Context Widgets */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gross Rent Multiplier */}
          <article
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-5 flex flex-col justify-between"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div>
              <span
                className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Gross Rent Multiplier
              </span>
              <div
                className="text-[1.6rem] font-bold text-neutral-900 tracking-tight mb-1 font-mono"
                style={{ fontFamily: "'PT Mono', monospace" }}
              >
                {fmtRatio(portfolioRollup.averageGRM)}
              </div>
            </div>
            <p
              className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-50 pt-2 mt-2"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Estimated multiplier of price relative to gross rental income. Lower numbers indicate better value.
            </p>
          </article>

          {/* Days on Market */}
          <article
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-5 flex flex-col justify-between"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div>
              <span
                className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Days on Market (DOM)
              </span>
              <div
                className="text-[1.6rem] font-bold text-neutral-900 tracking-tight mb-1 font-mono"
                style={{ fontFamily: "'PT Mono', monospace" }}
              >
                {portfolioRollup.averageDOM > 0 ? `${portfolioRollup.averageDOM.toFixed(0)} days` : "—"}
              </div>
            </div>
            <p
              className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-50 pt-2 mt-2"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Average days on market representing liquidity. Sourced from project sales lists.
            </p>
          </article>

          {/* Price-to-Rent Ratio */}
          <article
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-5 flex flex-col justify-between"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div>
              <span
                className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Price-to-Rent Ratio
              </span>
              <div
                className="text-[1.6rem] font-bold text-neutral-900 tracking-tight mb-1 font-mono"
                style={{ fontFamily: "'PT Mono', monospace" }}
              >
                {fmtRatio(portfolioRollup.priceToRentRatio)}
              </div>
            </div>
            <p
              className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-50 pt-2 mt-2"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Median price to average annual rent. Ratio under 15 implies a stronger buy environment.
            </p>
          </article>
        </section>

        {/* Section 4: Stabilized Asset Table */}
        <section
          className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 overflow-hidden"
          style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
        >
          <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
            <h4
              className="text-neutral-900 text-[13px] font-bold uppercase tracking-wider"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Stabilized Asset Yields
            </h4>
            <span
              className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full"
              style={{ fontFamily: "'PT Mono', monospace" }}
            >
              {stabilizedProjects.length} Stabilized Assets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  <th className="px-6 py-3" style={{ fontFamily: "'Roboto', sans-serif" }}>Asset Name</th>
                  <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>NOI</th>
                  <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>Cap Rate</th>
                  <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>CoC Yield</th>
                  <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>ROI</th>
                  <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>DSCR</th>
                  <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>OER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-[13px] text-neutral-800">
                {stabilizedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-neutral-400" style={{ fontFamily: "'Roboto', sans-serif" }}>
                      No stabilized assets found. Adjust presets or filters to evaluate projects.
                    </td>
                  </tr>
                ) : (
                  stabilizedProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-900" style={{ fontFamily: "'Roboto', sans-serif" }}>
                        {p.propertyName}
                        <span className="block text-[10px] font-normal text-neutral-400 mt-0.5 uppercase tracking-wider">
                          {p.dispositionType === 'RENT'
                            ? (p.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
                            : (p.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip')} • Phase {p.currentPhase ?? 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-neutral-900" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtCurrency(p.noi)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtPct(p.capRate)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-emerald-600" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtPct(p.coc)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtPct(p.roi)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {p.dscr === 999 ? "N/A" : fmtRatio(p.dscr, "x")}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-neutral-600" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtPct(p.oer)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: Working Capital Assets */}
        {workingCapitalProjects.length > 0 && (
          <section
            className="bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 overflow-hidden"
            style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
          >
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <h4
                className="text-neutral-900 text-[13px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Working Capital (Active Flips & Rehabs)
              </h4>
              <span
                className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full"
                style={{ fontFamily: "'PT Mono', monospace" }}
              >
                {workingCapitalProjects.length} Assets In-Flight
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-neutral-100 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    <th className="px-6 py-3" style={{ fontFamily: "'Roboto', sans-serif" }}>Asset Name</th>
                    <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>Purchase Price</th>
                    <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>Current Value</th>
                    <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>Cash Invested</th>
                    <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>Net Profit</th>
                    <th className="px-6 py-3 text-right" style={{ fontFamily: "'Roboto', sans-serif" }}>Projected ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-[13px] text-neutral-800">
                  {workingCapitalProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-900" style={{ fontFamily: "'Roboto', sans-serif" }}>
                        {p.propertyName}
                        <span className="block text-[10px] font-normal text-neutral-400 mt-0.5 uppercase tracking-wider">
                          {p.dispositionType === 'RENT'
                            ? (p.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
                            : (p.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip')} • Phase {p.currentPhase ?? 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtCurrency(p.purchasePrice)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtCurrency(p.propertyValue)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtCurrency(p.totalCashInvested)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtCurrency(p.netProfit)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-emerald-600" style={{ fontFamily: "'PT Mono', monospace" }}>
                        {fmtPct(p.roi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Right Column: Risk Stress Simulator Sidebar */}
      <RiskStressTester params={stressParams} onChange={setStressParams} />
    </div>
  );
}
