"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, ReferenceLine, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import type { Project } from "@/types/schema";
import type { DerivedMetrics, KPI33Value } from "@/lib/metrics/reiMetrics";
import { getKPI33, METRIC_TAXONOMY, MetricCategory, MetricTaxonomyEntry, getMetricEntry } from "@/lib/metrics/metricTaxonomy";
import { deriveAllMetrics } from "@/lib/metrics/reiMetrics";
import { calculateAmortization } from "@/lib/utils/reiCalculators";
import { RISK_SCALE_CONFIG, scoreFromBands } from "@/lib/metrics/riskScaleConfig";
import Link from "next/link";

interface KPICategoryChartsProps {
  project: Project | null;
  projects: Project[];
  isDark: boolean;
  snapshots: any[];
}

const C = {
  green: "#00DD94",
  amber: "#ffac5a",
  red: "#F06543",
  blue: "#7A9EAA",
  slate: "#454955",
  lightSlate: "#C0BEC2",
} as const;

// ─── Human-readable translation for missing instrument reason codes ───
export function getNullReasonText(reason: string | undefined): { text: string; linkTab: string } {
  switch (reason) {
    case 'REQUIRES_INCOME_LEDGER':
      return { text: "Requires Income Ledger entries to compute actual performance.", linkTab: "income" };
    case 'REQUIRES_EXPENSE_LEDGER':
      return { text: "Requires Expense Ledger entries to track actual operational costs.", linkTab: "expense" };
    case 'REQUIRES_TENANT_REGISTRY':
      return { text: "Requires Tenant Registry lease records to calculate operational metrics.", linkTab: "tenant" };
    case 'REQUIRES_SALE_RECORD':
      return { text: "Requires Sale/Disposition Record settlement details to compute realized returns.", linkTab: "sale" };
    case 'REQUIRES_RE_VALUATION':
      return { text: "Requires Re-Valuation Record appraisals to compute live metrics.", linkTab: "valuation" };
    case 'REQUIRES_LISTING_LOG':
      return { text: "Requires Listing & Showings Log entries to calculate market velocity.", linkTab: "listing" };
    case 'REQUIRES_PORTFOLIO_HISTORY':
      return { text: "Requires historical portfolio metrics to calculate comparative averages.", linkTab: "valuation" };
    case 'REQUIRES_COMPLIANCE_CHECKLIST':
      return { text: "Requires Due Diligence checklist items to calculate compliance rates.", linkTab: "compliance" };
    case 'MARKET_DATA_DEFERRED':
      return { text: "Awaiting live market data feed integration (RentCast).", linkTab: "" };
    case 'INCOMPLETE':
      return { text: "Required underwriting inputs are not yet populated.", linkTab: "" };
    default:
      return { text: "Underwriting values are incomplete or waiting for data ingestion.", linkTab: "" };
  }
}

export function KPICategorySections({ project, projects, isDark, snapshots }: KPICategoryChartsProps) {
  const [openCategory, setOpenCategory] = useState<MetricCategory | null>("Financial Performance");

  // Compute metrics for the active focus level
  const activeMetrics: DerivedMetrics | null = useMemo(() => {
    if (project) {
      if (!project.financials) return null;
      return deriveAllMetrics(
        project.financials,
        project.financials.estimatedCurrentValue || project.financials.estimatedARV,
        project.dispositionType,
        project.currentPhase ?? 1,
        project.createdAt
      );
    }
    return null;
  }, [project]);

  const categories: { key: MetricCategory; label: string; icon: string; desc: string }[] = [
    { key: "Financial Performance", label: "Financial Performance", icon: "account_balance", desc: "Return profiles, coverage ratios, and cash yield metrics (KPIs 1–17)" },
    { key: "Operational Efficiency", label: "Operational Efficiency", icon: "precision_manufacturing", desc: "Tenant retention, listing velocity, and operational costs (KPIs 18–24)" },
    { key: "Asset & Portfolio Management", label: "Asset & Portfolio Management", icon: "domain", desc: "Equity growth, payback timeline, and portfolio tracking (KPIs 25–29)" },
    { key: "Marketing & Sales", label: "Marketing & Sales", icon: "storefront", desc: "Listing funnel metrics and average commissions (KPIs 30–31)" },
    { key: "Risk Management & Compliance", label: "Risk Management & Compliance", icon: "shield", desc: "Composite risk dimensions and diligence compliance rate (KPIs 32–33)" }
  ];

  return (
    <div className="space-y-4 font-hanken">
      {categories.map((cat) => {
        const catKPIs = getKPI33().filter((k) => k.category === cat.key);
        const isOpen = openCategory === cat.key;

        // Calculate count of computed vs total
        const computedCount = catKPIs.reduce((acc, kpi) => {
          let hasVal = false;
          if (project && activeMetrics) {
            const val = activeMetrics.kpi33[kpi.id as keyof typeof activeMetrics.kpi33];
            hasVal = val && (val.projected !== null || val.actual !== null);
          } else {
            // Check if any project has computed data for this KPI
            hasVal = projects.some(p => {
              if (!p.financials) return false;
              const dm = deriveAllMetrics(p.financials, p.financials.estimatedCurrentValue || p.financials.estimatedARV, p.dispositionType, p.currentPhase, p.createdAt);
              const val = dm.kpi33[kpi.id as keyof typeof dm.kpi33];
              return val && (val.projected !== null || val.actual !== null);
            });
          }
          return acc + (hasVal ? 1 : 0);
        }, 0);

        return (
          <div
            key={cat.key}
            className="rounded-xl border overflow-hidden transition-all duration-200"
            style={{
              borderColor: isDark ? "rgba(253,255,252,0.07)" : "rgba(69,73,85,0.12)",
              background: isDark ? (isOpen ? "rgba(255,255,255,0.01)" : "transparent") : (isOpen ? "rgba(69,73,85,0.02)" : "transparent"),
            }}
          >
            {/* Header Accordion Button */}
            <button
              onClick={() => setOpenCategory(isOpen ? null : cat.key)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{
                    color: isOpen ? (isDark ? "#FDFFFC" : "#0d0a0b") : "rgba(158,157,160,0.8)",
                    fontVariationSettings: isOpen ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {cat.icon}
                </span>
                <div>
                  <h3
                    className="text-sm font-bold tracking-tight"
                    style={{ color: isOpen ? (isDark ? "#FDFFFC" : "#0d0a0b") : "rgba(158,157,160,0.8)" }}
                  >
                    {cat.label}
                  </h3>
                  <p className="text-[11px] font-light" style={{ color: "rgba(158,157,160,0.8)" }}>
                    {cat.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(69,73,85,0.08)",
                    color: computedCount > 0 ? C.green : "rgba(158,157,160,0.8)",
                  }}
                >
                  {computedCount}/{catKPIs.length}
                </span>
                <span
                  className="material-symbols-outlined text-[18px] transition-transform duration-200"
                  style={{
                    color: "rgba(158,157,160,0.8)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  expand_more
                </span>
              </div>
            </button>

            {/* Expanded Content Panel */}
            {isOpen && (
              <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 border-t border-white/[0.02] pt-4">
                {catKPIs.map((kpi) => (
                  <KPIChartCard
                    key={kpi.id}
                    kpi={kpi}
                    project={project}
                    projects={projects}
                    activeMetrics={activeMetrics}
                    isDark={isDark}
                    snapshots={snapshots}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface KPIChartCardProps {
  kpi: MetricTaxonomyEntry;
  project: Project | null;
  projects: Project[];
  activeMetrics: DerivedMetrics | null;
  isDark: boolean;
  snapshots: any[];
}

export function KPIChartCard({ kpi, project, projects, activeMetrics, isDark, snapshots }: KPIChartCardProps) {
  const [showFormula, setShowFormula] = useState(false);

  // Resolve projected/actual dual outputs for the current focus mode
  const { projected, actual, projectedReason, actualReason, stateLabel } = useMemo(() => {
    if (project) {
      // Project level
      if (!activeMetrics) {
        return { projected: null, actual: null, stateLabel: "incomplete" };
      }
      const val = activeMetrics.kpi33[kpi.id as keyof typeof activeMetrics.kpi33] as KPI33Value | undefined;
      return {
        projected: val?.projected ?? null,
        actual: val?.actual ?? null,
        projectedReason: val?.projectedNullReason,
        actualReason: val?.actualNullReason,
        stateLabel: val?.actual !== null ? "actual" : "projected"
      };
    } else {
      // Portfolio level roll-up / average
      let projSum = 0, projCount = 0;
      let actSum = 0, actCount = 0;
      let lastProjReason: any = undefined;
      let lastActReason: any = undefined;

      for (const p of projects) {
        if (!p.financials) continue;
        const dm = deriveAllMetrics(p.financials, p.financials.estimatedCurrentValue || p.financials.estimatedARV, p.dispositionType, p.currentPhase, p.createdAt);
        const val = dm.kpi33[kpi.id as keyof typeof dm.kpi33] as KPI33Value | undefined;
        if (val) {
          if (val.projected !== null) {
            projSum += val.projected;
            projCount++;
          } else {
            lastProjReason = val.projectedNullReason;
          }
          if (val.actual !== null) {
            actSum += val.actual;
            actCount++;
          } else {
            lastActReason = val.actualNullReason;
          }
        }
      }

      const isSumMetric = ["NOI", "CASH_FLOW", "CAPEX", "GOI"].includes(kpi.id);

      return {
        projected: projCount > 0 ? (isSumMetric ? projSum : projSum / projCount) : null,
        actual: actCount > 0 ? (isSumMetric ? actSum : actSum / actCount) : null,
        projectedReason: projCount === 0 ? (lastProjReason || 'INCOMPLETE') : undefined,
        actualReason: actCount === 0 ? (lastActReason || 'REQUIRES_INCOME_LEDGER') : undefined,
        stateLabel: actCount > 0 ? "actual" : "projected"
      };
    }
  }, [project, projects, activeMetrics, kpi.id]);

  const hasData = projected !== null || actual !== null;
  const isActual = actual !== null;
  const displayValue = isActual ? actual : projected;

  // Format helper
  const formatVal = (val: number | null): string => {
    if (val === null) return "—";
    if (["NOI", "CASH_FLOW", "CAPEX", "GOI", "AVG_RENT_PER_PROPERTY", "MAINTENANCE_COST_PER_UNIT", "projectedRent", "rehabBudget"].includes(kpi.id)) {
      return `$${Math.round(val).toLocaleString()}`;
    }
    if (["CAP_RATE", "COC", "OER", "LTV", "EQUITY_TO_VALUE", "ROI", "AAR", "REVENUE_GROWTH", "OCCUPANCY", "TENANT_TURNOVER", "LEASE_RENEWAL", "YOY_SOLD_PRICE_VARIANCE", "DEMAND_GROWTH", "COMPLIANCE_RATE", "appreciationRate", "vacancyRate"].includes(kpi.id)) {
      return `${val.toFixed(2)}%`;
    }
    if (["GRM", "DSCR", "INTEREST_COVERAGE", "EQUITY_MULTIPLE", "RISK_SCORE"].includes(kpi.id)) {
      return val.toFixed(2) + (kpi.id === "EQUITY_MULTIPLE" ? "x" : "");
    }
    return val.toFixed(1);
  };

  // Determine status color based on benchmark thresholds
  const cardStatus = useMemo(() => {
    if (displayValue === null) return "neutral";
    if (kpi.id === "DSCR") {
      return displayValue >= 1.25 ? "good" : displayValue >= 1.0 ? "warn" : "bad";
    }
    if (kpi.id === "OER") {
      return displayValue <= 40 ? "good" : displayValue <= 55 ? "warn" : "bad";
    }
    if (kpi.id === "COMPLIANCE_RATE") {
      return displayValue >= 95 ? "good" : "bad";
    }
    if (kpi.id === "RISK_SCORE") {
      return displayValue <= 3.0 ? "good" : displayValue <= 6.0 ? "warn" : "bad";
    }
    return "good";
  }, [displayValue, kpi.id]);

  const mainColor = cardStatus === "good" ? C.green : cardStatus === "warn" ? C.amber : cardStatus === "bad" ? C.red : C.lightSlate;

  // Honest state variables
  const nullReasonCode = isActual ? actualReason : projectedReason;
  const { text: nullReasonText, linkTab } = getNullReasonText(nullReasonCode);

  return (
    <div
      className="p-5 rounded-xl border flex flex-col justify-between min-h-[300px] relative transition-all duration-200 group shadow-lg"
      style={{
        background: isDark ? "rgba(30, 27, 34, 0.40)" : "#FDFFFC",
        borderColor: isDark ? "rgba(253,255,252,0.07)" : "rgba(69,73,85,0.12)",
      }}
    >
      {/* Formula Modal Overlay */}
      {showFormula && (
        <div className="absolute inset-0 bg-black/90 dark:bg-black/95 text-white p-5 rounded-xl z-20 flex flex-col justify-between font-hanken">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Formula Explainer</span>
              <button onClick={() => setShowFormula(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">Metric Name:</p>
              <p className="text-sm font-semibold">{kpi.name} (KPI #{kpi.kpiNumber})</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">Canonical Formula:</p>
              <p className="text-[13px] font-mono p-2 bg-white/5 rounded border border-white/5 mt-1 overflow-x-auto text-pw-success">
                {kpi.formula}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">Diligence Benchmark:</p>
              <p className="text-xs text-slate-200 font-semibold">{kpi.benchmark}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">Description:</p>
              <p className="text-[11px] text-slate-400 leading-normal font-light">{kpi.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowFormula(false)}
            className="w-full text-center py-2 bg-white/10 hover:bg-white/15 rounded text-xs font-semibold uppercase tracking-wider mt-4 cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      )}

      {/* Card Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              KPI #{kpi.kpiNumber}
            </span>
            <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wide truncate max-w-[160px] md:max-w-[200px]" title={kpi.name}>
              {kpi.name}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {stateLabel && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                 stateLabel === 'actual' ? 'bg-[var(--pw-success)]/10 text-[var(--pw-success)]' : 'bg-[#7A9EAA]/10 text-[#7A9EAA]'
              }`}>
                {stateLabel === 'actual' ? 'LIVE' : 'PROJECTED'}
              </span>
            )}
            <button
              onClick={() => setShowFormula(true)}
              className="text-[#9E9DA0] hover:text-white p-0.5 rounded hover:bg-white/5 cursor-pointer"
              title="View formula & definitions"
            >
              <span className="material-symbols-outlined text-[15px]">info</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Display Value / Chart Area */}
      <div className="my-4 flex-grow flex flex-col justify-center min-h-[140px]">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-3 font-hanken">
            <span className="material-symbols-outlined text-amber-500 text-3xl">warning</span>
            <div className="space-y-1">
              <p className="text-[11px] text-text-secondary leading-snug font-light max-w-[200px]">
                {nullReasonText}
              </p>
              {project && linkTab && (
                <Link
                  href={`/dashboard/projects/${project.id}/instruments?tab=${linkTab}`}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wider mt-1.5 border border-amber-500/20 px-2 py-0.5 rounded bg-amber-500/5 hover:bg-amber-500/10 transition-all cursor-pointer"
                >
                  Go to Ingestion
                  <span className="material-symbols-outlined text-[10px]">arrow_right_alt</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderKPIChart(kpi.id, displayValue, isActual, project, projects, snapshots, isDark)}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="flex items-end justify-between border-t border-black/5 dark:border-white/5 pt-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-text-secondary font-bold">Value</span>
          <span className="text-xl font-black font-mono tracking-tight" style={{ color: mainColor }}>
            {formatVal(displayValue)}
          </span>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] uppercase text-text-secondary font-bold">Target</span>
          <span className="text-xs font-semibold text-text-primary">{kpi.benchmark}</span>
        </div>
      </div>
    </div>
  );
}

// ─── RENDER CUSTOM CHART PER KPI ID ───
function renderKPIChart(
  id: string,
  value: number | null,
  isActual: boolean,
  project: Project | null,
  projects: Project[],
  snapshots: any[],
  isDark: boolean
) {
  const chartColor = isActual ? C.green : C.blue;

  switch (id) {
    case "NOI": {
      let proFormaIncome = 0;
      let proFormaExpense = 0;
      let proFormaNet = 0;
      let actualIncome = 0;
      let actualExpense = 0;
      let actualNet = value ?? 0;

      if (project) {
        const f = project.financials;
        if (f) {
          const metrics = deriveAllMetrics(f, f.estimatedCurrentValue || f.estimatedARV, project.dispositionType, project.currentPhase, project.createdAt);
          proFormaIncome = (metrics.noiComponents.grossRentalIncome + metrics.noiComponents.otherIncome);
          proFormaExpense = metrics.noiComponents.totalOperatingExpenses;
          proFormaNet = metrics.noi;
          
          actualIncome = metrics.kpi33.GOI.actual ?? 0;
          const actNOI = metrics.kpi33.NOI.actual ?? 0;
          actualExpense = actualIncome - actNOI;
          actualNet = actNOI;
        }
      } else {
        projects.forEach(p => {
          const f = p.financials;
          if (f) {
            const metrics = deriveAllMetrics(f, f.estimatedCurrentValue || f.estimatedARV, p.dispositionType, p.currentPhase, p.createdAt);
            proFormaIncome += (metrics.noiComponents.grossRentalIncome + metrics.noiComponents.otherIncome);
            proFormaExpense += metrics.noiComponents.totalOperatingExpenses;
            proFormaNet += metrics.noi;

            const actGOI = metrics.kpi33.GOI.actual ?? 0;
            const actNOI = metrics.kpi33.NOI.actual ?? 0;
            actualIncome += actGOI;
            actualExpense += (actGOI - actNOI);
            actualNet += actNOI;
          }
        });
      }

      const data = [
        { name: "Pro-Forma", income: proFormaIncome, expense: proFormaExpense, net: proFormaNet },
        { name: "Actual", income: actualIncome, expense: actualExpense, net: actualNet }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip contentStyle={{ background: "#161318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10 }} />
          <Bar dataKey="income" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Income" />
          <Bar dataKey="expense" fill="#F06543" radius={[4, 4, 0, 0]} name="Expenses" />
          <Bar dataKey="net" fill="#00DD94" radius={[4, 4, 0, 0]} name="NOI" />
        </BarChart>
      );
    }
    case "CAP_RATE": {
      const data = [
        { name: "Purchase", value: value ? Number(value.toFixed(1)) : 4.5 },
        { name: "Pro Forma", value: 4.5 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 15]} />
          <ReferenceLine y={4} stroke="#ffac5a" strokeDasharray="3 3" label={{ value: "Watch (4%)", fill: "#ffac5a", fontSize: 7, position: "insideBottomLeft" }} />
          <ReferenceLine y={6} stroke="#00DD94" strokeDasharray="3 3" label={{ value: "Target (6%)", fill: "#00DD94", fontSize: 7, position: "insideBottomLeft" }} />
          <Bar dataKey="value" fill={chartColor} radius={[4, 4, 0, 0]} name="Cap Rate (%)">
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={idx === 0 ? chartColor : C.amber} />
            ))}
          </Bar>
        </BarChart>
      );
    }
    case "COC": {
      const chartData = snapshots.length > 0 ? snapshots.map(s => ({
        period: s.period,
        value: s.coc !== undefined && s.coc !== null ? s.coc : (value ?? -7.41)
      })) : [
        { period: "M1", value: -7.41 },
        { period: "M2", value: -7.41 },
        { period: "M3", value: isActual ? -2.19 : -7.41 },
        { period: "M4", value: isActual ? 0.05 : -7.41 }
      ];
      return (
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="period" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={{ background: "#161318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10 }} />
          <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} dot={{ r: 3 }} name="CoC Return" />
        </LineChart>
      );
    }
    case "IRR": {
      const irrData = [
        { year: "Yr 1", irr: -20 },
        { year: "Yr 2", irr: -5 },
        { year: "Yr 3", irr: 8 },
        { year: "Yr 4", irr: 12 },
        { year: "Yr 5", irr: value ? Number(value.toFixed(1)) : 15 }
      ];
      return (
        <AreaChart data={irrData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="year" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={{ background: "#161318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10 }} />
          <ReferenceLine y={15} stroke={C.green} strokeDasharray="3 3" label={{ value: "Target (15%)", fill: C.green, fontSize: 7, position: "insideBottomLeft" }} />
          <Area type="monotone" dataKey="irr" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={2} name="IRR (%)" />
        </AreaChart>
      );
    }
    case "CASH_FLOW": {
      const cfData = [
        { name: "M1", projected: -370, actual: isActual ? -370 : 0, cumulative: -370 },
        { name: "M2", projected: -370, actual: isActual ? -370 : 0, cumulative: -740 },
        { name: "M3", projected: -370, actual: isActual ? -370 : 0, cumulative: -1110 },
        { name: "M4", projected: -370, actual: isActual ? -370 : 0, cumulative: -1480 }
      ];
      return (
        <BarChart data={cfData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip contentStyle={{ background: "#161318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10 }} />
          <Bar dataKey="projected" fill="rgba(69,73,85,0.3)" name="Projected" radius={[4, 4, 0, 0]} />
          {isActual && <Bar dataKey="actual" fill={C.red} name="Actual" radius={[4, 4, 0, 0]} />}
        </BarChart>
      );
    }
    case "GRM": {
      const grmData = [
        { name: "Min Comp", grm: 9.5 },
        { name: "Subject", grm: value ? Number(value.toFixed(1)) : 11.9 },
        { name: "Max Comp", grm: 14.2 }
      ];
      return (
        <BarChart data={grmData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis type="number" stroke="#9E9DA0" fontSize={8} tickLine={false} domain={[0, 20]} />
          <YAxis dataKey="name" type="category" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <Bar dataKey="grm" fill={C.blue} radius={[0, 4, 4, 0]} name="GRM">
            {grmData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={idx === 1 ? C.amber : C.slate} />
            ))}
          </Bar>
        </BarChart>
      );
    }
    case "DSCR": {
      const dscrData = [
        { period: "M1", value: 0.74 },
        { period: "M2", value: 0.74 },
        { period: "M3", value: isActual ? 0.85 : 0.74 },
        { period: "M4", value: isActual ? 1.10 : 0.74 }
      ];
      return (
        <AreaChart data={dscrData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="period" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} domain={[0, 2]} />
          <Tooltip contentStyle={{ background: "#161318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10 }} />
          <ReferenceLine y={1.25} stroke={C.red} strokeDasharray="3 3" label={{ value: "Lender (1.25)", fill: C.red, fontSize: 7, position: "insideBottomLeft" }} />
          <Area type="monotone" dataKey="value" stroke={chartColor} fill="rgba(90,170,63,0.1)" strokeWidth={2} name="DSCR" />
        </AreaChart>
      );
    }
    case "LTV":
    case "EQUITY_TO_VALUE": {
      const ltvPct = value ? Number(value.toFixed(1)) : 80;
      const eqPct = 100 - ltvPct;
      const donutData = [
        { name: "Loan share", value: ltvPct, fill: C.red },
        { name: "Equity share", value: eqPct, fill: C.green }
      ];
      return (
        <div className="flex items-center justify-around h-full">
          <div className="w-[80px] h-[80px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={22} outerRadius={36} startAngle={90} endAngle={450}>
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1 text-[9px] text-[#9E9DA0]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#F06543]" />
              <span>Loan: {ltvPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[var(--pw-success)]" />
              <span>Equity: {eqPct}%</span>
            </div>
          </div>
        </div>
      );
    }
    case "OER": {
      const oerVal = value ? Number(value.toFixed(1)) : 40.0;
      const breakData = [
        { name: "Taxes", value: 20 },
        { name: "Ins", value: 6 },
        { name: "PM", value: 10 },
        { name: "Maint", value: 4 }
      ];
      return (
        <BarChart data={breakData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis type="number" stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <YAxis dataKey="name" type="category" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <Bar dataKey="value" fill={C.amber} radius={[0, 4, 4, 0]} name="Expense breakdown" />
        </BarChart>
      );
    }
    case "INTEREST_COVERAGE": {
      let firstYearInterestVal = 0;
      let noiVal = 0;

      if (project) {
        const f = project.financials;
        if (f) {
          const loanAmount = f.loanAmount ?? 0;
          const loanInterestRate = f.loanInterestRate ?? 0;
          const loanTermMonths = (f.loanTermYears ?? 30) * 12;
          const amortResult = calculateAmortization(loanAmount, loanInterestRate, loanTermMonths);
          firstYearInterestVal = amortResult.firstYearInterest;
          const metrics = deriveAllMetrics(f, f.estimatedCurrentValue || f.estimatedARV, project.dispositionType, project.currentPhase, project.createdAt);
          noiVal = metrics.noi;
        }
      } else {
        projects.forEach(p => {
          const f = p.financials;
          if (f) {
            const loanAmount = f.loanAmount ?? 0;
            const loanInterestRate = f.loanInterestRate ?? 0;
            const loanTermMonths = (f.loanTermYears ?? 30) * 12;
            const amortResult = calculateAmortization(loanAmount, loanInterestRate, loanTermMonths);
            firstYearInterestVal += amortResult.firstYearInterest;
            const metrics = deriveAllMetrics(f, f.estimatedCurrentValue || f.estimatedARV, p.dispositionType, p.currentPhase, p.createdAt);
            noiVal += metrics.noi;
          }
        });
      }

      const data = [
        { name: "Year-1 Interest", amount: firstYearInterestVal },
        { name: "NOI", amount: noiVal }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Bar dataKey="amount" fill="#7A9EAA" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
    case "ROI": {
      const data = [
        { name: "Projected ROI", value: 25.4 },
        { name: "Realized ROI", value: value ? Number(value.toFixed(1)) : 0 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Bar dataKey="value" fill={C.green} radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
    case "CAPEX": {
      const data = [
        { name: "Stage", spend: 1200 },
        { name: "Refurbish", spend: 4500 },
        { name: "Renovate", spend: value ? Number(value) : 0 },
        { name: "Gut", spend: 0 },
        { name: "Develop", spend: 0 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Bar dataKey="spend" fill="#ffac5a" radius={[4, 4, 0, 0]} name="Spend ($)" />
        </BarChart>
      );
    }
    case "GOI": {
      const data = [
        { name: "Pro Forma", rent: 23400, other: 600 },
        { name: "Actual", rent: value ? Number(value) : 0, other: 0 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Bar dataKey="rent" stackId="a" fill="#3b82f6" name="Rent" />
          <Bar dataKey="other" stackId="a" fill="#7A9EAA" name="Other" />
        </BarChart>
      );
    }
    case "AAR": {
      const data = [
        { name: "Yr 1", return: 4.5 },
        { name: "Yr 2", return: 6.2 },
        { name: "Yr 3", return: value ? Number(value.toFixed(1)) : 8.0 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Bar dataKey="return" fill="#00DD94" radius={[4, 4, 0, 0]} name="AAR (%)" />
        </BarChart>
      );
    }
    case "EQUITY_MULTIPLE": {
      const emVal = value ? Number(value.toFixed(2)) : 1.25;
      const progress = Math.min((emVal / 3.0) * 100, 100);
      return (
        <div className="flex flex-col justify-center h-full p-4 space-y-4 font-mono text-[9px] text-[#9E9DA0]">
          <div className="flex justify-between">
            <span>Multiple: {emVal}x</span>
            <span>Target: 2.00x</span>
          </div>
          <div className="w-full bg-[#454955]/20 h-4 rounded-full overflow-hidden border border-white/5 relative">
            <div className="bg-[var(--pw-success)] h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            <div className="absolute top-0 bottom-0 left-[33.3%] w-[1px] bg-white/30" title="1.0x Multiple" />
            <div className="absolute top-0 bottom-0 left-[66.6%] w-[1px] bg-white/30" title="2.0x Multiple" />
          </div>
          <div className="flex justify-between text-[8px]">
            <span>0.0x</span>
            <span>1.0x</span>
            <span>2.0x</span>
            <span>3.0x</span>
          </div>
        </div>
      );
    }
    case "REVENUE_GROWTH": {
      const data = [
        { period: "M1", rent: 1950, growth: 0 },
        { period: "M2", rent: 1950, growth: 0 },
        { period: "M3", rent: 2000, growth: 2.56 },
        { period: "M4", rent: 2000, growth: value ? Number(value.toFixed(2)) : 2.56 }
      ];
      return (
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="period" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip contentStyle={{ background: "#161318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10 }} />
          <Line type="monotone" dataKey="rent" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Monthly Rent" />
        </LineChart>
      );
    }
    case "OCCUPANCY": {
      const tiles = [
        { unit: "U1", status: "occupied" },
        { unit: "U2", status: "occupied" },
        { unit: "U3", status: "occupied" },
        { unit: "U4", status: "vacant" }
      ];
      return (
        <div className="flex flex-col justify-around h-full font-hanken p-2">
          <div className="grid grid-cols-4 gap-2">
            {tiles.map((t, idx) => (
              <div
                key={idx}
                className={`p-2 rounded text-center text-[10px] font-bold border transition-all ${
                  t.status === "occupied" ? "bg-[var(--pw-success-container)] border-[var(--pw-success-border)] text-[var(--pw-success)]" : "bg-[#F06543]/10 border-[#F06543]/20 text-[#F06543]"
                }`}
              >
                {t.unit}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-secondary text-center mt-2 font-light">
            Current Physical Occupancy: {value ? value.toFixed(1) : 75}%
          </p>
        </div>
      );
    }
    case "TENANT_TURNOVER": {
      const data = [
        { year: "2024", moveOuts: 1 },
        { year: "2025", moveOuts: 2 },
        { year: "2026", moveOuts: value ? Number(value.toFixed(0)) : 1 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="year" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} allowDecimals={false} />
          <Bar dataKey="moveOuts" fill="#F06543" radius={[4, 4, 0, 0]} name="Move-outs" />
        </BarChart>
      );
    }
    case "AVG_RENT_PER_PROPERTY": {
      const data = projects.length > 0 ? projects.map(p => ({
        name: (p.propertyName || p.name || "Project").slice(0, 10),
        rent: p.financials?.monthlyGrossRent || p.financials?.projectedMonthlyRent || p.financials?.projectedRent || 0
      })) : [
        { name: "Subject", rent: 1950 },
        { name: "Portfolio", rent: 1950 }
      ];
      const avg = data.reduce((acc, curr) => acc + curr.rent, 0) / data.length;
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <ReferenceLine y={avg} stroke={C.amber} strokeDasharray="3 3" label={{ value: `Avg ($${Math.round(avg)})`, fill: C.amber, fontSize: 7, position: "insideBottomLeft" }} />
          <Bar dataKey="rent" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Avg Rent ($)" />
        </BarChart>
      );
    }
    case "LEASE_RENEWAL": {
      const renVal = value ? Number(value.toFixed(1)) : 80;
      const donutData = [
        { name: "Renewed", value: renVal, fill: C.green },
        { name: "Non-Renewed", value: 100 - renVal, fill: C.red }
      ];
      return (
        <div className="flex items-center justify-center h-full">
          <PieChart width={80} height={80}>
            <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={22} outerRadius={36} startAngle={90} endAngle={450}>
              {donutData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </div>
      );
    }
    case "MAINTENANCE_COST_PER_UNIT": {
      const data = [
        { unit: "Unit 1", cost: value ? Number(value) : 180 },
        { unit: "Unit 2", cost: 210 },
        { unit: "Unit 3", cost: 150 },
        { unit: "Unit 4", cost: 0 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="unit" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Bar dataKey="cost" fill="#7A9EAA" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
    case "DOM": {
      const data = [
        { name: "Market Avg", days: 30 },
        { name: "Listing 1", days: value ? Number(value) : 12 }
      ];
      return (
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 15 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis type="number" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis dataKey="name" type="category" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <Bar dataKey="days" fill={C.amber} radius={[0, 4, 4, 0]} name="Days on Market" />
        </BarChart>
      );
    }
    case "CONSTRUCTION_COST_SQFT": {
      const data = [
        { name: "Subject sqft", cost: value ? Number(value) : 29 },
        { name: "Market Low", cost: 15 },
        { name: "Market High", cost: 45 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
    case "PORTFOLIO_VALUE_GROWTH": {
      const data = [
        { period: "Q1", value: 279000 },
        { period: "Q2", value: 310000 },
        { period: "Q3", value: 320000 },
        { period: "Q4", value: value ? Number(value) : 320000 }
      ];
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="period" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${Math.round(v/1000)}k`} />
          <Tooltip contentStyle={{ background: "#161318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10 }} />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={2} name="Portfolio Value ($)" />
        </AreaChart>
      );
    }
    case "PAYBACK_PERIOD": {
      const val = value ? Number(value.toFixed(1)) : 4.8;
      const progress = Math.min((val / 10) * 100, 100);
      return (
        <div className="flex flex-col justify-center h-full p-4 space-y-4 font-mono text-[9px] text-[#9E9DA0]">
          <div className="flex justify-between">
            <span>Progress: {val} yrs</span>
            <span>Target: 10.0 yrs</span>
          </div>
          <div className="w-full bg-[#454955]/20 h-4 rounded-full overflow-hidden border border-white/5 relative">
            <div className="bg-[var(--pw-success)] h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      );
    }
    case "YOY_SOLD_PRICE_VARIANCE": {
      const data = [
        { year: "2024", price: 250000, variance: 0 },
        { year: "2025", price: 279000, variance: 11.6 },
        { year: "2026", price: 320000, variance: value ? Number(value.toFixed(1)) : 14.6 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="year" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `$${Math.round(v/1000)}k`} />
          <Bar dataKey="price" fill="#00DD94" radius={[4, 4, 0, 0]} name="Average Sold Price ($)" />
        </BarChart>
      );
    }
    case "SOLD_PER_INVENTORY":
    case "DEMAND_GROWTH": {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <span className="material-symbols-outlined text-text-secondary text-2xl mb-1">lock</span>
          <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">MARKET DATA DEFERRED</span>
        </div>
      );
    }
    case "LISTING_TO_MEETING": {
      const data = [
        { name: "Listings", count: 100 },
        { name: "Showings", count: 65 },
        { name: "Meetings", count: value ? Number(value) : 18 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <Bar dataKey="count" fill="#7A9EAA" radius={[4, 4, 0, 0]} name="Funnel Count" />
        </BarChart>
      );
    }
    case "AVG_COMMISSION": {
      const data = [
        { name: "Sale 1", rate: 2.8 },
        { name: "Sale 2", rate: 3.0 },
        { name: "Sale 3", rate: value ? Number(value) : 2.9 }
      ];
      return (
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
          <XAxis dataKey="name" stroke="#9E9DA0" fontSize={8} tickLine={false} />
          <YAxis stroke="#9E9DA0" fontSize={8} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <ReferenceLine y={2.9} stroke={C.red} strokeDasharray="3 3" label={{ value: "Mean (2.9%)", fill: C.red, fontSize: 7, position: "insideBottomLeft" }} />
          <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Commission Rate (%)" />
        </BarChart>
      );
    }
    case "RISK_SCORE": {
      const financials = (project?.financials || {}) as any;
      
      // Financial: DSCR
      const dscr = financials.dscr ?? 1.25;
      const financialScore = scoreFromBands(dscr, RISK_SCALE_CONFIG.subCategories[0].bands);

      // Market: YoY growth
      const yoyGrowth = financials.yoyGrowth ?? 2.5;
      const marketScore = scoreFromBands(yoyGrowth, RISK_SCALE_CONFIG.subCategories[1].bands);

      // Operational: Occupancy
      const units = project?.units ?? financials.numberOfUnits ?? 1;
      const occupied = project?.occupiedUnits ?? financials.occupiedUnits ?? units;
      const occupancy = units > 0 ? (occupied / units) * 100 : 95;
      const operationalScore = scoreFromBands(occupancy, RISK_SCALE_CONFIG.subCategories[2].bands);

      // Compliance: compliance rate
      const hasPSA = !!financials.psaDocumentUrl;
      const hasEMD = !!financials.emdReceiptUrl && financials.emdVerified;
      const hasTitle = financials.titleVestingConfirmed && financials.titleOwnersPolicyOrdered && (financials.titleCommitmentReceived || !!financials.titleCommitmentUrl);
      const totalChecks = 3;
      const passChecks = (hasPSA ? 1 : 0) + (hasEMD ? 1 : 0) + (hasTitle ? 1 : 0);
      const complianceRate = (passChecks / totalChecks) * 100;
      const complianceScore = scoreFromBands(complianceRate, RISK_SCALE_CONFIG.subCategories[3].bands);

      const data = [
        { subject: "Financial", value: financialScore, fullMark: 10 },
        { subject: "Market", value: marketScore, fullMark: 10 },
        { subject: "Operational", value: operationalScore, fullMark: 10 },
        { subject: "Compliance", value: complianceScore, fullMark: 10 }
      ];
      return (
        <div className="w-full h-full pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
              <PolarAngleAxis dataKey="subject" stroke="#9E9DA0" fontSize={7} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#9E9DA0" fontSize={6} />
              <Radar name="Risk Index" dataKey="value" stroke={C.red} fill={C.red} fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    case "COMPLIANCE_RATE": {
      const compVal = value ? Number(value.toFixed(0)) : 80;
      const donutData = [
        { name: "Compliant", value: compVal, fill: C.green },
        { name: "Outstanding", value: 100 - compVal, fill: C.red }
      ];
      return (
        <div className="flex items-center justify-around h-full">
          <div className="w-[80px] h-[80px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={22} outerRadius={36} startAngle={90} endAngle={450}>
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[9px] text-text-secondary leading-snug">
            <p className="font-bold text-text-primary">Diligence Rate: {compVal}%</p>
            <p className="font-light">Items to audit: {compVal === 100 ? "0" : "1"}</p>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
