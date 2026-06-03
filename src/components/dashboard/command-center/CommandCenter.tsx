"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/store/projectStore";
import { ActivePipeline } from "./ActivePipeline";
import { TerminalAuditFeed } from "./TerminalAuditFeed";
import { MarketHeatmap } from "./MarketHeatmap";
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";

// ─── KPI Computation ─────────────────────────────────────────────────────────

function usePortfolioKPIs(projects: Project[]) {
  return useMemo(() => {
    if (!projects.length) return { irr: null, equityMultiple: null, capitalDeployed: null };

    let totalCashInvested = 0;
    let totalPropertyValue = 0;
    let totalCapitalDeployed = 0;
    const allIRRFlows: number[][] = [];

    for (const p of projects) {
      const f = p.financials;
      if (!f) continue;
      const metrics = deriveAllMetrics(
        f,
        f.estimatedCurrentValue || f.estimatedARV,
        p.strategyType,
        p.currentPhase,
        p.createdAt,
      );
      const purchasePrice = f.purchasePrice ?? f.targetPrice ?? 0;
      const loanAmount = f.loanAmount ?? 0;

      totalCashInvested += metrics.totalCashInvested;
      totalPropertyValue += (f.estimatedCurrentValue || f.estimatedARV || purchasePrice || 0);
      totalCapitalDeployed += (purchasePrice - loanAmount);

      const flows = buildIRRCashFlows(
        metrics.totalCashInvested,
        metrics.annualCashFlow,
        Math.min(f.loanTermYears ?? 5, 10),
        purchasePrice,
        metrics.annualizedAppreciation || 3,
        loanAmount,
        f.loanInterestRate ?? 0,
        f.loanTermYears ?? 30,
      );
      if (flows.length >= 2) allIRRFlows.push(flows);
    }

    let portfolioIRR: number | null = null;
    if (allIRRFlows.length > 0) {
      const maxLen = Math.max(...allIRRFlows.map(f => f.length));
      const merged: number[] = Array(maxLen).fill(0);
      for (const flows of allIRRFlows) {
        for (let i = 0; i < flows.length; i++) merged[i] += flows[i];
      }
      const raw = computeIRR(merged);
      if (raw != null) portfolioIRR = raw * 100;
    }

    const equityMultiple = totalCashInvested > 0 ? totalPropertyValue / totalCashInvested : null;
    const deployed = totalCapitalDeployed > 0 ? totalCapitalDeployed : null;

    return { irr: portfolioIRR, equityMultiple, capitalDeployed: deployed };
  }, [projects]);
}

function formatCompact(n: number | null): string {
  if (n === null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  icon: string;
  value: string;
  suffix?: string;
  accentColor: string;
  gradientFrom: string;
  badge?: string;
  badgeColor?: string;
  subLabel?: string;
}

function KPICard({ label, icon, value, suffix, accentColor, gradientFrom, badge, badgeColor, subLabel }: KPICardProps) {
  return (
    <div
      className="relative rounded-2xl p-6 flex flex-col justify-between overflow-hidden group"
      style={{
        background: "linear-gradient(135deg, rgba(20,29,35,0.6) 0%, rgba(11,20,26,0.85) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
      }}
    >
      {/* Top gradient bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-60"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />
      {/* Inner light leak */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)",
        }}
      />

      <div className="relative flex justify-between items-start mb-5">
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "rgba(218,228,236,0.5)", letterSpacing: "0.08em" }}
        >
          {label}
        </span>
        <span
          className="material-symbols-outlined text-[22px] transition-transform duration-300 group-hover:scale-110"
          style={{ color: accentColor, fontVariationSettings: "'FILL' 0" }}
        >
          {icon}
        </span>
      </div>

      <div className="relative">
        <div className="flex items-baseline gap-1 mb-2">
          <span
            className="text-[2.75rem] font-bold leading-none tracking-tight"
            style={{ color: "rgba(218,228,236,0.95)", fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </span>
          {suffix && (
            <span className="text-2xl font-semibold ml-0.5" style={{ color: accentColor }}>
              {suffix}
            </span>
          )}
        </div>

        {(badge || subLabel) && (
          <div className="flex items-center gap-2">
            {badge && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  background: `${badgeColor || accentColor}18`,
                  color: badgeColor || accentColor,
                }}
              >
                {badge}
              </span>
            )}
            {subLabel && (
              <span className="text-xs" style={{ color: "rgba(218,228,236,0.4)" }}>
                {subLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Phase Legend ─────────────────────────────────────────────────────────────

const PHASE_LEGEND = [
  { label: "Acquisition", color: "#57f1db" },
  { label: "Transaction",  color: "#adc6ff" },
  { label: "Rehab",        color: "#ffd1aa" },
  { label: "Hold / Exit",  color: "#62fae3" },
];

// ─── CommandCenter ────────────────────────────────────────────────────────────

export function CommandCenter() {
  const projects = useProjectStore(state => state.projects);
  const kpis = usePortfolioKPIs(projects);

  const irrDisplay   = kpis.irr !== null ? kpis.irr.toFixed(1) : "—";
  const emDisplay    = kpis.equityMultiple !== null ? `${kpis.equityMultiple.toFixed(2)}x` : "—";
  const capDisplay   = formatCompact(kpis.capitalDeployed);

  return (
    <div
      className="flex-1 overflow-y-auto pb-24"
      style={{ scrollbarWidth: "none" } as React.CSSProperties}
    >
      <div className="p-8 space-y-10 max-w-[1280px] mx-auto">

        {/* ── SECTION 1: Portfolio Performance KPIs ────────────────────── */}
        <section>
          <div className="flex justify-between items-end mb-5">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "rgba(218,228,236,0.95)", letterSpacing: "-0.01em" }}
            >
              Portfolio Performance
            </h2>
            <span
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              style={{ color: "rgba(218,228,236,0.4)", letterSpacing: "0.08em" }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: "#57f1db" }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "#57f1db" }} />
              </span>
              Live Data Feed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <KPICard
              label="Target IRR"
              icon="trending_up"
              value={irrDisplay}
              suffix={kpis.irr !== null ? "%" : ""}
              accentColor="#57f1db"
              gradientFrom="#57f1db"
              badge={kpis.irr !== null && kpis.irr > 0 ? "↑ On Track" : undefined}
              badgeColor="#57f1db"
              subLabel={kpis.irr !== null ? "annualized" : "No projects yet"}
            />
            <KPICard
              label="Equity Multiple"
              icon="layers"
              value={emDisplay}
              accentColor="#adc6ff"
              gradientFrom="#adc6ff"
              badge={kpis.equityMultiple !== null && kpis.equityMultiple >= 1 ? "On Track" : undefined}
              badgeColor="#adc6ff"
              subLabel={kpis.equityMultiple !== null ? `vs. 2.5x target` : "No projects yet"}
            />
            <KPICard
              label="Capital Deployed"
              icon="account_balance_wallet"
              value={capDisplay}
              accentColor="#ffd1aa"
              gradientFrom="#ffd1aa"
              badge={kpis.capitalDeployed !== null && kpis.capitalDeployed > 0 ? "Active" : undefined}
              badgeColor="#ffd1aa"
              subLabel={`across ${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            />
          </div>
        </section>

        {/* ── SECTION 2: Active Pipeline ───────────────────────────────── */}
        <section>
          <div className="flex justify-between items-end mb-5">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "rgba(218,228,236,0.95)", letterSpacing: "-0.01em" }}
            >
              Active Pipeline
            </h2>
            <div className="hidden md:flex items-center gap-4">
              {PHASE_LEGEND.map(({ label, color }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "rgba(218,228,236,0.45)" }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <ActivePipeline />
        </section>

        {/* ── SECTION 3: System Activity + Market Heatmap ─────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: "320px" }}>
          <div className="lg:col-span-1 h-full">
            <TerminalAuditFeed />
          </div>
          <div className="lg:col-span-2 h-full">
            <MarketHeatmap />
          </div>
        </section>

      </div>
    </div>
  );
}
