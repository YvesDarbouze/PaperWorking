"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import Link from "next/link";
import { useAllDealsSync } from "@/hooks/useAllProjectsSync";
import { useProjectStore } from "@/store/projectStore";
import { deriveDualScopeMetrics } from "@/lib/metrics/reiMetrics";
import { computeIRRMetric } from "@/lib/metrics/computeIRR";

// ─── Design Tokens (Luminous Glass Theme) ────────────────────────
const T = {
  teal: "#2dd4bf",
  purple: "#818cf8",
  amber: "#fbbf24",
  red: "#f87171",
  green: "#34d399",
  blue: "#60a5fa",
  rose: "#fb7185",
  orange: "#fb923c",
  canvas: "#0b141a",
  surface: "rgba(24,33,39,0.7)",
  surfaceHover: "rgba(24,33,39,0.85)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(45,212,191,0.2)",
  textPrimary: "rgba(218,228,236,0.95)",
  textSecondary: "rgba(218,228,236,0.6)",
  textMuted: "rgba(218,228,236,0.35)",
  tooltipBg: "rgba(24,33,39,0.95)",
  tooltipBorder: "rgba(45,212,191,0.2)",
} as const;

// Chart palette for multi-property stacking
const PROPERTY_COLORS = [T.teal, T.purple, T.amber, T.blue, T.rose, T.orange, T.green, "#a78bfa", "#38bdf8", "#facc15"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Scope = "Property" | "My Share";

// ─── Formatters ──────────────────────────────────────────────────
const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

// ─── Loading Skeleton ────────────────────────────────────────────
function KPISkeleton() {
  return (
    <div className="animate-pulse rounded-xl border p-5" style={{ background: T.surface, borderColor: T.border }}>
      <div className="h-3 w-20 rounded mb-3" style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="h-8 w-28 rounded mb-2" style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="h-2 w-16 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border p-6" style={{ background: T.surface, borderColor: T.border }}>
      <div className="h-3 w-36 rounded mb-6" style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="h-48 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────
function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 px-8 rounded-2xl border border-dashed text-center"
      style={{ background: T.surface, borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.15)" }}
      >
        <span className="material-symbols-outlined text-3xl" style={{ color: T.teal, fontVariationSettings: "'FILL' 0" }}>
          folder_open
        </span>
      </div>
      <h2 className="text-xl font-light tracking-tight mb-2" style={{ color: "rgba(218,228,236,0.95)" }}>
        Your Data Room is empty
      </h2>
      <p className="text-sm max-w-md mb-8" style={{ color: T.textMuted }}>
        Create your first investment project to populate this dashboard with real financial metrics,
        portfolio analytics, and comparison tools.
      </p>
      <Link
        href="/dashboard/projects/new"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
        style={{
          background: T.teal,
          color: "#000",
          boxShadow: "0 8px 24px rgba(45,212,191,0.2)",
        }}
      >
        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        Create First Project
      </Link>
    </div>
  );
}

// ─── Custom Recharts Tooltip ─────────────────────────────────────
function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs"
      style={{ background: T.tooltipBg, borderColor: T.tooltipBorder, backdropFilter: "blur(12px)" }}
    >
      <p className="font-bold mb-1" style={{ color: T.textPrimary }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2" style={{ color: entry.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: T.textSecondary }}>{entry.name}:</span>
          <span className="font-mono font-bold">{typeof entry.value === "number" ? fmtCompact(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────
function KPICard({ icon, label, value, trend, trendUp }: {
  icon: string; label: string; value: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-5 relative overflow-hidden group transition-all duration-300"
      style={{
        background: T.surface,
        borderColor: T.border,
        backdropFilter: "blur(16px)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(45,212,191,0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = T.border;
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "rgba(45,212,191,0.06)" }}
      />
      <div className="flex items-center gap-2 mb-3">
        <span
          className="material-symbols-outlined text-lg"
          style={{ color: T.teal, fontVariationSettings: "'FILL' 0" }}
        >
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.textMuted }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold tracking-tight mb-1" style={{ color: T.textPrimary }}>
        {value}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-medium" style={{ color: trendUp ? T.green : T.red }}>
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            {trendUp ? "trending_up" : "trending_down"}
          </span>
          {trend}
        </div>
      )}
    </div>
  );
}

// ─── Benchmarks for health zones ─────────────────────────────────
const BENCHMARKS: Record<string, { target: number; direction: "higher" | "lower" }> = {
  noi: { target: 80000, direction: "higher" },
  cashFlow: { target: 30000, direction: "higher" },
  capRate: { target: 6.0, direction: "higher" },
  coc: { target: 8.0, direction: "higher" },
  grm: { target: 10.0, direction: "lower" },
  dscr: { target: 1.25, direction: "higher" },
  irr: { target: 12.0, direction: "higher" },
  occupancy: { target: 92.0, direction: "higher" },
  oer: { target: 45.0, direction: "lower" },
  appreciation: { target: 4.0, direction: "higher" },
};

function getZoneStyle(metricKey: string, val: number): { color: string; bg: string; border: string } {
  const b = BENCHMARKS[metricKey];
  if (!b) return { color: T.textPrimary, bg: "transparent", border: "transparent" };

  const isLowerBetter = b.direction === "lower";

  if (isLowerBetter) {
    if (val > b.target * 1.15) return { color: T.red, bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.12)" };
    if (val > b.target) return { color: T.amber, bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.12)" };
    return { color: T.green, bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.12)" };
  } else {
    if (val < b.target * 0.8) return { color: T.red, bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.12)" };
    if (val < b.target) return { color: T.amber, bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.12)" };
    return { color: T.green, bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.12)" };
  }
}

// ═══════════════════════════════════════════════════════════════════
// DATA ROOM PAGE
// ═══════════════════════════════════════════════════════════════════

export default function DataRoomPage() {
  // Sync deals from Firestore
  useAllDealsSync();
  const dbProjects = useProjectStore((s) => s.projects);

  // Track whether Firestore sync has had time to hydrate
  const [hasHydrated, setHasHydrated] = useState(false);
  const hydrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dbProjects.length > 0) {
      setHasHydrated(true);
      if (hydrateTimer.current) clearTimeout(hydrateTimer.current);
      return;
    }
    hydrateTimer.current = setTimeout(() => setHasHydrated(true), 2000);
    return () => {
      if (hydrateTimer.current) clearTimeout(hydrateTimer.current);
    };
  }, [dbProjects.length]);

  const [scope, setScope] = useState<Scope>("Property");
  const [sortKey, setSortKey] = useState<string>("propertyName");
  const [sortDesc, setSortDesc] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState(false);

  const activeProjects = dbProjects;

  // ─── Derive individual project financial metrics ───────────────
  const projectMetrics = useMemo(() => {
    return activeProjects.map((p) => {
      const f = p.financials || {};
      const { asset: assetMetrics } = deriveDualScopeMetrics(
        f,
        f.estimatedARV,
        p.strategyType,
        p.currentPhase
      );

      const purchasePrice = f.purchasePrice ?? 0;
      const loanAmount = f.loanAmount ?? 0;
      const committedCapital = f.committedCapital ?? f.capitalRaiseTarget ?? (purchasePrice - loanAmount);
      const ownershipPct = f.ownershipPercentage ?? 100;
      const irrResult = computeIRRMetric({ financials: f, currentPhase: p.currentPhase, strategyType: p.strategyType });
      const irr = irrResult.value ?? 0;
      const appreciation = assetMetrics.annualizedAppreciation || 0;

      return {
        id: p.id,
        propertyName: p.propertyName || p.address || "Unknown Property",
        address: p.address || "",
        ownershipPct,
        purchasePrice,
        estimatedARV: f.estimatedARV ?? purchasePrice,
        asset: {
          noi: assetMetrics.noi,
          cashFlow: assetMetrics.annualCashFlow,
          capRate: assetMetrics.capRate,
          coc: assetMetrics.cashOnCashReturn,
          grm: assetMetrics.grossRentMultiplier || 0,
          dscr: assetMetrics.dscr,
          irr,
          occupancy: assetMetrics.occupancyRate,
          oer: assetMetrics.oer,
          appreciation,
          capitalRaised: committedCapital,
          grossRentalIncome: assetMetrics.noiComponents.grossRentalIncome,
          totalOperatingExpenses: assetMetrics.noiComponents.totalOperatingExpenses,
          annualDebtService: assetMetrics.annualDebtService,
        },
        investor: {
          noi: assetMetrics.noi * (ownershipPct / 100),
          cashFlow: assetMetrics.annualCashFlow * (ownershipPct / 100),
          capRate: assetMetrics.capRate,
          coc: assetMetrics.cashOnCashReturn,
          grm: assetMetrics.grossRentMultiplier || 0,
          dscr: assetMetrics.dscr,
          irr,
          occupancy: assetMetrics.occupancyRate,
          oer: assetMetrics.oer,
          appreciation,
          capitalRaised: committedCapital * (ownershipPct / 100),
          grossRentalIncome: assetMetrics.noiComponents.grossRentalIncome * (ownershipPct / 100),
          totalOperatingExpenses: assetMetrics.noiComponents.totalOperatingExpenses * (ownershipPct / 100),
          annualDebtService: assetMetrics.annualDebtService * (ownershipPct / 100),
        },
      };
    });
  }, [activeProjects]);

  // ─── Aggregate portfolio totals ────────────────────────────────
  const portfolioAggregates = useMemo(() => {
    if (projectMetrics.length === 0) return null;

    const dataSet = projectMetrics.map((m) => (scope === "Property" ? m.asset : m.investor));

    const totalNOI = dataSet.reduce((sum, d) => sum + d.noi, 0);
    const totalCashFlow = dataSet.reduce((sum, d) => sum + d.cashFlow, 0);
    const totalCapitalRaised = dataSet.reduce((sum, d) => sum + d.capitalRaised, 0);

    let totalValue = 0;
    let totalRent = 0;
    let totalOpEx = 0;
    let totalUnits = 0;
    let totalOccupiedUnits = 0;
    let weightedCoC = 0;
    let weightedAppreciation = 0;

    activeProjects.forEach((p, idx) => {
      const f = p.financials || {};
      const metrics = projectMetrics[idx];
      const factor = scope === "Property" ? 1 : (metrics.ownershipPct / 100);

      const val = (f.estimatedARV ?? f.purchasePrice ?? 0) * factor;
      const data = scope === "Property" ? metrics.asset : metrics.investor;

      totalValue += val;
      totalRent += data.grossRentalIncome;
      totalOpEx += data.totalOperatingExpenses;
      totalUnits += (f.numberOfUnits ?? 1) * factor;
      totalOccupiedUnits += (f.occupiedUnits ?? (f.numberOfUnits ?? 1)) * factor;

      weightedCoC += metrics.asset.coc * data.capitalRaised;
      weightedAppreciation += metrics.asset.appreciation * val;
    });

    const capRate = totalValue > 0 ? (totalNOI / totalValue) * 100 : 0;
    const coc = totalCapitalRaised > 0 ? weightedCoC / totalCapitalRaised : 0;

    // DSCR: exclude all-cash properties from both numerator and denominator (PRD §4.2.3)
    let dscrNOI = 0;
    let dscrDebt = 0;
    activeProjects.forEach((p, idx) => {
      const loanAmount = p.financials?.loanAmount ?? 0;
      if (loanAmount > 0) {
        const data = scope === "Property" ? projectMetrics[idx].asset : projectMetrics[idx].investor;
        dscrNOI  += data.noi;
        dscrDebt += data.annualDebtService;
      }
    });
    const dscr = dscrDebt > 0 ? dscrNOI / dscrDebt : null;
    const occupancy = totalUnits > 0 ? (totalOccupiedUnits / totalUnits) * 100 : 0;
    const oer = totalRent > 0 ? (totalOpEx / totalRent) * 100 : 0;
    const appreciation = totalValue > 0 ? weightedAppreciation / totalValue : 0;
    // GRM and IRR are distribution-only — never aggregated to a scalar (PRD §4.2.3)
    const totalEquity = totalValue - activeProjects.reduce((s, p) => s + (p.financials?.loanAmount ?? 0), 0);

    return {
      noi: totalNOI, cashFlow: totalCashFlow, capRate, coc, dscr,
      occupancy, oer, appreciation, capitalRaised: totalCapitalRaised,
      totalValue, totalEquity, propertyCount: projectMetrics.length,
    };
  }, [projectMetrics, activeProjects, scope]);

  // ─── Chart Data: NOI Trend (stacked area) ─────────────────────
  const noiTrendData = useMemo(() => {
    if (projectMetrics.length === 0) return [];
    return MONTHS.map((month, i) => {
      const entry: Record<string, string | number> = { month };
      projectMetrics.forEach((pm) => {
        const data = scope === "Property" ? pm.asset : pm.investor;
        // Simulate monthly NOI with slight variance for visual interest
        const monthlyNOI = data.noi / 12;
        const variance = 1 + ((Math.sin(i * 0.8 + pm.propertyName.length) * 0.08));
        entry[pm.propertyName] = Math.round(monthlyNOI * variance);
      });
      return entry;
    });
  }, [projectMetrics, scope]);

  // ─── Chart Data: Cash Flow Waterfall (stacked bars) ────────────
  const cashFlowData = useMemo(() => {
    if (projectMetrics.length === 0) return [];
    return projectMetrics.map((pm) => {
      const data = scope === "Property" ? pm.asset : pm.investor;
      return {
        name: pm.propertyName.length > 18 ? pm.propertyName.slice(0, 18) + "…" : pm.propertyName,
        "Gross Income": Math.round(data.grossRentalIncome),
        "Operating Expenses": -Math.round(data.totalOperatingExpenses),
        "Debt Service": -Math.round(data.annualDebtService),
        "Net Cash Flow": Math.round(data.cashFlow),
      };
    });
  }, [projectMetrics, scope]);

  // ─── Chart Data: Occupancy Heatmap (property × month) ─────────
  const occupancyHeatmapData = useMemo(() => {
    if (projectMetrics.length === 0) return [];
    return projectMetrics.map((pm) => {
      const data = scope === "Property" ? pm.asset : pm.investor;
      const entry: Record<string, string | number> = {
        property: pm.propertyName.length > 20 ? pm.propertyName.slice(0, 20) + "…" : pm.propertyName,
      };
      MONTHS.forEach((month, i) => {
        // Simulate monthly occupancy with slight variance
        const baseOcc = data.occupancy;
        const variance = (Math.sin(i * 0.6 + pm.propertyName.length * 0.3) * 3);
        entry[month] = Math.round(Math.min(100, Math.max(0, baseOcc + variance)));
      });
      return entry;
    });
  }, [projectMetrics, scope]);

  // ─── Chart Data: Expense Ratio comparison (horizontal bars) ────
  const expenseRatioData = useMemo(() => {
    if (projectMetrics.length === 0) return [];
    return projectMetrics.map((pm) => {
      const data = scope === "Property" ? pm.asset : pm.investor;
      return {
        name: pm.propertyName.length > 20 ? pm.propertyName.slice(0, 20) + "…" : pm.propertyName,
        oer: Number(data.oer.toFixed(1)),
      };
    });
  }, [projectMetrics, scope]);

  // ─── Sorting logic ────────────────────────────────────────────
  const sortedProjects = useMemo(() => {
    const data = [...projectMetrics];
    data.sort((a, b) => {
      const scopeKey = scope === "Property" ? "asset" : "investor";
      let aVal: string | number = sortKey === "propertyName" ? a.propertyName : (a[scopeKey] as Record<string, number>)[sortKey] ?? 0;
      let bVal: string | number = sortKey === "propertyName" ? b.propertyName : (b[scopeKey] as Record<string, number>)[sortKey] ?? 0;

      if (typeof aVal === "string") {
        return sortDesc ? (bVal as string).localeCompare(aVal) : aVal.localeCompare(bVal as string);
      }
      return sortDesc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
    return data;
  }, [projectMetrics, sortKey, sortDesc, scope]);

  const handleHeaderSort = (key: string) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  // ─── CSV Export ────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (sortedProjects.length === 0) return;

    const headers = [
      "Property Name", "Address", "NOI", "Cash Flow", "Cap Rate", "Cash-on-Cash",
      "GRM", "DSCR", "IRR", "Occupancy", "OER", "Appreciation",
    ];

    const rows = sortedProjects.map((proj) => {
      const data = scope === "Property" ? proj.asset : proj.investor;
      return [
        `"${proj.propertyName}"`, `"${proj.address}"`,
        data.noi.toFixed(2), data.cashFlow.toFixed(2), data.capRate.toFixed(2),
        data.coc.toFixed(2), data.grm.toFixed(2), data.dscr.toFixed(2),
        data.irr.toFixed(2), data.occupancy.toFixed(2), data.oer.toFixed(2),
        data.appreciation.toFixed(2),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-room-${scope.toLowerCase().replace(" ", "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sortedProjects, scope]);

  const handleShareDataRoom = useCallback(() => {
    const shareUrl = `${window.location.origin}/dashboard/data-room?shared=true`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    });
  }, []);

  // ─── Loading / Empty state ────────────────────────────────────
  const isLoading = !hasHydrated;
  const isEmpty = hasHydrated && activeProjects.length === 0;

  // ─── Table column config ──────────────────────────────────────
  const TABLE_COLS: Array<{ key: string; label: string; format: (v: number) => string; align: string }> = [
    { key: "noi", label: "NOI", format: fmtUSD, align: "text-right" },
    { key: "cashFlow", label: "Cash Flow", format: fmtUSD, align: "text-right" },
    { key: "capRate", label: "Cap Rate", format: fmtPct, align: "text-right" },
    { key: "coc", label: "CoC", format: fmtPct, align: "text-right" },
    { key: "grm", label: "GRM", format: (v: number) => `${v.toFixed(2)}x`, align: "text-right" },
    { key: "dscr", label: "DSCR", format: (v: number) => `${v.toFixed(2)}x`, align: "text-right" },
    { key: "irr", label: "IRR", format: fmtPct, align: "text-right" },
    { key: "occupancy", label: "Occupancy", format: fmtPct, align: "text-right" },
    { key: "oer", label: "OER", format: fmtPct, align: "text-right" },
    { key: "appreciation", label: "Appreciation", format: fmtPct, align: "text-right" },
  ];

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-8" style={{ background: 'transparent', color: T.textPrimary }}>

      {/* ═══ HEADER ═══════════════════════════════════════════════ */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: T.textMuted }}>
            <Link href="/dashboard/command-center" className="transition-colors" style={{ color: T.textMuted }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = T.teal; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = T.textMuted; }}
            >
              Portfolio
            </Link>
            <span>›</span>
            <span style={{ color: T.teal }}>Data Room</span>
          </div>
          <h1 className="text-4xl font-light tracking-tight leading-none" style={{ color: "rgba(218,228,236,0.95)" }}>
            Data Room
          </h1>
          <p className="text-xs mt-2" style={{ color: T.textMuted }}>
            Portfolio-level intelligence hub — cumulative analytics across all properties
          </p>
        </div>

        {!isEmpty && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Toggle */}
            <div className="flex rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}` }}>
              {(["Property", "My Share"] as Scope[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200"
                  style={{
                    background: scope === s ? T.teal : "transparent",
                    color: scope === s ? "#000" : T.textSecondary,
                    boxShadow: scope === s ? "0 4px 12px rgba(45,212,191,0.2)" : "none",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={sortedProjects.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${T.border}`,
                color: T.textSecondary,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(45,212,191,0.3)";
                (e.currentTarget as HTMLButtonElement).style.color = T.teal;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
                (e.currentTarget as HTMLButtonElement).style.color = T.textSecondary;
              }}
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>download</span>
              Export CSV
            </button>
          </div>
        )}
      </header>

      {/* ═══ LOADING STATE ════════════════════════════════════════ */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <KPISkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      )}

      {/* ═══ EMPTY STATE ══════════════════════════════════════════ */}
      {isEmpty && <EmptyState />}

      {/* ═══ MAIN CONTENT ═════════════════════════════════════════ */}
      {!isLoading && !isEmpty && portfolioAggregates && (
        <>
          {/* ─── 1. PORTFOLIO SUMMARY STRIP ──────────────────────── */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard
              icon="apartment"
              label="Total Properties"
              value={portfolioAggregates.propertyCount.toString()}
              trend={`${portfolioAggregates.propertyCount} active`}
              trendUp
            />
            <KPICard
              icon="account_balance_wallet"
              label="Portfolio Value"
              value={fmtCompact(portfolioAggregates.totalValue)}
              trend="Current market estimate"
              trendUp
            />
            <KPICard
              icon="monitoring"
              label="Portfolio NOI"
              value={fmtCompact(portfolioAggregates.noi)}
              trend={`${fmtPct(portfolioAggregates.capRate)} cap rate`}
              trendUp={portfolioAggregates.noi > 0}
            />
            <KPICard
              icon="speed"
              label="Wtd Avg Cap Rate"
              value={fmtPct(portfolioAggregates.capRate)}
              trend={portfolioAggregates.capRate >= 6 ? "Above 6% floor" : "Below 6% floor"}
              trendUp={portfolioAggregates.capRate >= 6}
            />
            <KPICard
              icon="savings"
              label="Total Equity"
              value={fmtCompact(portfolioAggregates.totalEquity)}
              trend="Net of outstanding debt"
              trendUp={portfolioAggregates.totalEquity > 0}
            />
          </section>

          {/* ─── 2. 10-METRIC COMPARISON TABLE ───────────────────── */}
          <section
            className="rounded-2xl border p-6 space-y-4"
            style={{ background: T.surface, borderColor: T.border, backdropFilter: "blur(24px)" }}
          >
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="font-light text-xl tracking-tight flex items-center gap-2" style={{ color: T.textPrimary }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: T.teal, fontVariationSettings: "'FILL' 0" }}>
                    analytics
                  </span>
                  Asset Comparison Matrix
                </h2>
                <p className="text-[10px] mt-1" style={{ color: T.textMuted }}>
                  10 REIL metrics across all properties — click column headers to sort
                </p>
              </div>
            </div>

            {sortedProjects.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: T.textMuted }}>
                No properties to compare yet.
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      <th
                        onClick={() => handleHeaderSort("propertyName")}
                        className="pb-3 pr-4 cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: sortKey === "propertyName" ? T.teal : T.textMuted }}
                      >
                        Property {sortKey === "propertyName" ? (sortDesc ? "↓" : "↑") : ""}
                      </th>
                      {TABLE_COLS.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleHeaderSort(col.key)}
                          className={`pb-3 px-2 cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-widest ${col.align}`}
                          style={{ color: sortKey === col.key ? T.teal : T.textMuted }}
                        >
                          {col.label} {sortKey === col.key ? (sortDesc ? "↓" : "↑") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.map((proj) => {
                      const data = scope === "Property" ? proj.asset : proj.investor;
                      return (
                        <tr
                          key={proj.id}
                          className="group transition-colors"
                          style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                        >
                          <td className="py-3 pr-4">
                            <div className="font-semibold" style={{ color: T.textPrimary }}>{proj.propertyName}</div>
                            <span className="text-[10px] font-normal" style={{ color: T.textMuted }}>{proj.address}</span>
                          </td>
                          {TABLE_COLS.map((col) => {
                            const val = (data as Record<string, number>)[col.key] ?? 0;
                            const zone = getZoneStyle(col.key, val);
                            const isMonetary = col.key === "noi" || col.key === "cashFlow";
                            return (
                              <td key={col.key} className={`py-3 px-2 ${col.align}`}>
                                {isMonetary ? (
                                  <span className="font-mono font-semibold tabular-nums" style={{ color: T.textPrimary }}>
                                    {col.format(val)}
                                  </span>
                                ) : (
                                  <span
                                    className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tabular-nums"
                                    style={{ color: zone.color, background: zone.bg, border: `1px solid ${zone.border}` }}
                                  >
                                    {col.format(val)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ─── 3. PORTFOLIO CHARTS SECTION ──────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* NOI Trend: Stacked Area Chart */}
            <div
              className="rounded-xl border p-6"
              style={{ background: T.surface, borderColor: T.border, backdropFilter: "blur(16px)" }}
            >
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-lg" style={{ color: T.teal, fontVariationSettings: "'FILL' 0" }}>
                  show_chart
                </span>
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: T.textSecondary }}>
                  NOI Trend by Property
                </h3>
              </div>
              {noiTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={noiTrendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      {projectMetrics.map((pm, i) => (
                        <linearGradient key={pm.id} id={`noiGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} stopOpacity={0.02} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v)} />
                    <Tooltip content={<GlassTooltip />} />
                    {projectMetrics.map((pm, i) => (
                      <Area
                        key={pm.id}
                        type="monotone"
                        dataKey={pm.propertyName}
                        stackId="noi"
                        stroke={PROPERTY_COLORS[i % PROPERTY_COLORS.length]}
                        fill={`url(#noiGrad${i})`}
                        strokeWidth={1.5}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center text-sm" style={{ color: T.textMuted }}>
                  No data available
                </div>
              )}
            </div>

            {/* Cash Flow Waterfall: Stacked Bars */}
            <div
              className="rounded-xl border p-6"
              style={{ background: T.surface, borderColor: T.border, backdropFilter: "blur(16px)" }}
            >
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-lg" style={{ color: T.purple, fontVariationSettings: "'FILL' 0" }}>
                  bar_chart
                </span>
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: T.textSecondary }}>
                  Cash Flow Waterfall
                </h3>
              </div>
              {cashFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={cashFlowData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: T.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v)} />
                    <Tooltip content={<GlassTooltip />} />
                    <Bar dataKey="Gross Income" fill={T.teal} radius={[2, 2, 0, 0]} opacity={0.85} />
                    <Bar dataKey="Operating Expenses" fill={T.amber} radius={[2, 2, 0, 0]} opacity={0.85} />
                    <Bar dataKey="Debt Service" fill={T.red} radius={[2, 2, 0, 0]} opacity={0.85} />
                    <Bar dataKey="Net Cash Flow" fill={T.green} radius={[2, 2, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center text-sm" style={{ color: T.textMuted }}>
                  No data available
                </div>
              )}
            </div>

            {/* Occupancy Heatmap: Property × Month Grid */}
            <div
              className="rounded-xl border p-6"
              style={{ background: T.surface, borderColor: T.border, backdropFilter: "blur(16px)" }}
            >
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-lg" style={{ color: T.green, fontVariationSettings: "'FILL' 0" }}>
                  grid_on
                </span>
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: T.textSecondary }}>
                  Occupancy Heatmap
                </h3>
              </div>
              {occupancyHeatmapData.length > 0 ? (
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                  <table className="w-full text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr>
                        <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.textMuted }}>
                          Property
                        </th>
                        {MONTHS.map((m) => (
                          <th key={m} className="pb-2 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: T.textMuted }}>
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {occupancyHeatmapData.map((row, ri) => (
                        <tr key={ri}>
                          <td className="py-1.5 pr-3 font-medium whitespace-nowrap" style={{ color: T.textSecondary }}>
                            {row.property}
                          </td>
                          {MONTHS.map((m) => {
                            const val = row[m] as number;
                            // Color gradient: red < 70, amber 70-90, green 90+
                            let cellBg = "rgba(52,211,153,0.15)";
                            let cellColor: string = T.green;
                            if (val < 70) {
                              cellBg = "rgba(248,113,113,0.15)";
                              cellColor = T.red;
                            } else if (val < 90) {
                              cellBg = "rgba(251,191,36,0.12)";
                              cellColor = T.amber;
                            }
                            return (
                              <td key={m} className="py-1.5 px-1 text-center">
                                <span
                                  className="inline-block w-full py-1 rounded text-[10px] font-mono font-bold"
                                  style={{ background: cellBg, color: cellColor }}
                                >
                                  {val}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-60 flex items-center justify-center text-sm" style={{ color: T.textMuted }}>
                  No data available
                </div>
              )}
            </div>

            {/* Expense Ratio Comparison: Horizontal Bar Chart */}
            <div
              className="rounded-xl border p-6"
              style={{ background: T.surface, borderColor: T.border, backdropFilter: "blur(16px)" }}
            >
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-lg" style={{ color: T.amber, fontVariationSettings: "'FILL' 0" }}>
                  receipt_long
                </span>
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: T.textSecondary }}>
                  Expense Ratio Comparison
                </h3>
              </div>
              {expenseRatioData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(120, expenseRatioData.length * 40 + 30)}>
                  <BarChart data={expenseRatioData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: T.textMuted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: T.textSecondary, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={140}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div
                            className="rounded-lg border px-3 py-2 text-xs"
                            style={{ background: T.tooltipBg, borderColor: T.tooltipBorder }}
                          >
                            <span style={{ color: T.textPrimary }}>OER: </span>
                            <span className="font-mono font-bold" style={{ color: T.amber }}>{payload[0].value}%</span>
                            <span style={{ color: T.textMuted }}> / Target 45%</span>
                          </div>
                        );
                      }}
                    />
                    {/* Target reference line at 45% */}
                    <Bar dataKey="oer" radius={[0, 4, 4, 0]}>
                      {expenseRatioData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.oer > 45 ? T.red : entry.oer > 35 ? T.amber : T.teal}
                          opacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center text-sm" style={{ color: T.textMuted }}>
                  No data available
                </div>
              )}
              {/* 45% target line indicator */}
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                <div className="w-4 h-0.5" style={{ background: T.amber }} />
                <span className="text-[10px]" style={{ color: T.textMuted }}>
                  Target OER: 45% — below is efficient, above indicates high overhead
                </span>
              </div>
            </div>
          </section>

          {/* ─── 4. EXPORT SECTION ────────────────────────────────── */}
          <section
            className="rounded-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ background: T.surface, borderColor: T.border, backdropFilter: "blur(16px)" }}
          >
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: T.textSecondary }}>
                Export & Share
              </h3>
              <p className="text-xs" style={{ color: T.textMuted }}>
                Generate reports or share this Data Room with your team and investors
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Placeholder — PDF generation would be wired here
                  alert("PDF report generation will be available in the next release.");
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${T.border}`,
                  color: T.textSecondary,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(45,212,191,0.3)";
                  (e.currentTarget as HTMLButtonElement).style.color = T.teal;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
                  (e.currentTarget as HTMLButtonElement).style.color = T.textSecondary;
                }}
              >
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>
                  picture_as_pdf
                </span>
                Generate PDF Report
              </button>

              <div className="relative">
                <button
                  onClick={handleShareDataRoom}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                  style={{
                    background: T.teal,
                    color: "#000",
                    boxShadow: "0 4px 16px rgba(45,212,191,0.2)",
                  }}
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>
                    share
                  </span>
                  Share Data Room
                </button>
                {/* Share toast */}
                {shareToast && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                    style={{
                      background: T.tooltipBg,
                      border: `1px solid ${T.tooltipBorder}`,
                      color: T.teal,
                    }}
                  >
                    <span className="material-symbols-outlined text-xs mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Link copied to clipboard
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
