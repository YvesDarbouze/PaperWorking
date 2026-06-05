"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useProjectStore } from "@/store/projectStore";
import { ActivePipeline } from "./ActivePipeline";
import { TerminalAuditFeed } from "./TerminalAuditFeed";
import { MarketHeatmap } from "./MarketHeatmap";
import { NeedsAttentionFeed } from "./NeedsAttentionFeed";
import { TopPerformersWidget } from "./TopPerformersWidget";
import {
  deriveAllMetrics,
  computeIRR,
  buildIRRCashFlows,
  computeNOIComponents,
} from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";

// ─── Portfolio KPI hook ───────────────────────────────────────────────────────

interface PortfolioKPIs {
  irr: number | null;
  equityMultiple: number | null;
  capitalDeployed: number | null;
  totalNOI: number | null;
  portfolioCashFlow: number | null;
  activeCount: number;
}

function usePortfolioKPIs(projects: Project[]): PortfolioKPIs {
  return useMemo(() => {
    const activeCount = projects.length;
    if (!activeCount) {
      return {
        irr: null,
        equityMultiple: null,
        capitalDeployed: null,
        totalNOI: null,
        portfolioCashFlow: null,
        activeCount: 0,
      };
    }

    let totalCashInvested = 0;
    let totalPropertyValue = 0;
    let totalCapitalDeployed = 0;
    let totalNOI = 0;
    let totalCashFlow = 0;
    let noiProjectCount = 0;
    let cfProjectCount = 0;
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
      totalPropertyValue +=
        f.estimatedCurrentValue || f.estimatedARV || purchasePrice || 0;
      totalCapitalDeployed += purchasePrice - loanAmount;

      // NOI — rental / hold-phase projects only
      const isRental =
        p.strategyType === "Rent" ||
        p.strategyType === "Buy & Hold" ||
        (p.currentPhase ?? 1) === 4;

      if (isRental) {
        try {
          const noiComp = computeNOIComponents(
            f,
            p.strategyType ?? "Rent",
            p.currentPhase ?? 4,
          );
          if (Number.isFinite(noiComp.noi) && noiComp.noi !== 0) {
            totalNOI += noiComp.noi;
            noiProjectCount++;
          }
        } catch {
          // ignore — project may lack sufficient data
        }

        if (Number.isFinite(metrics.annualCashFlow) && metrics.annualCashFlow !== 0) {
          totalCashFlow += metrics.monthlyCashFlow;
          cfProjectCount++;
        }
      }

      // IRR flows
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

    // Portfolio IRR (blended)
    let portfolioIRR: number | null = null;
    if (allIRRFlows.length > 0) {
      const maxLen = Math.max(...allIRRFlows.map((f) => f.length));
      const merged: number[] = Array(maxLen).fill(0);
      for (const flows of allIRRFlows) {
        for (let i = 0; i < flows.length; i++) merged[i] += flows[i];
      }
      const raw = computeIRR(merged);
      if (raw != null) portfolioIRR = raw * 100;
    }

    const equityMultiple =
      totalCashInvested > 0 ? totalPropertyValue / totalCashInvested : null;

    return {
      irr: portfolioIRR,
      equityMultiple,
      capitalDeployed: totalCapitalDeployed > 0 ? totalCapitalDeployed : null,
      totalNOI: noiProjectCount > 0 ? totalNOI : null,
      portfolioCashFlow: cfProjectCount > 0 ? totalCashFlow : null,
      activeCount,
    };
  }, [projects]);
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCompact(n: number | null, prefix = "$"): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${prefix}${abs.toFixed(0)}`;
}

function fmtPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  icon: string;
  value: string;
  suffix?: string;
  accentColor: string;
  badge?: string;
  badgeColor?: string;
  subLabel?: string;
}

function KPICard({
  label,
  icon,
  value,
  suffix,
  accentColor,
  badge,
  badgeColor,
  subLabel,
}: KPICardProps) {
  return (
    <article
      aria-label={`${label}: ${value}${suffix ?? ""}`}
      className="relative rounded-2xl p-5 flex flex-col justify-between overflow-hidden group"
      style={{
        background:
          "linear-gradient(135deg, rgba(22,19,24,0.6) 0%, rgba(13,10,11,0.85) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-60"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />
      {/* Inner light leak */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)",
        }}
      />

      {/* Label + icon */}
      <div className="relative flex justify-between items-start mb-4">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(253,255,252,0.45)", letterSpacing: "0.08em" }}
        >
          {label}
        </span>
        <span
          className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:scale-110"
          style={{ color: accentColor, fontVariationSettings: "'FILL' 0" }}
        >
          {icon}
        </span>
      </div>

      {/* Value */}
      <div className="relative">
        <div className="flex items-baseline gap-1 mb-1.5">
          <span
            className="text-[2.25rem] font-bold leading-none tracking-tight tabular-nums"
            style={{ color: "rgba(253,255,252,0.95)" }}
          >
            {value}
          </span>
          {suffix && (
            <span className="text-xl font-semibold ml-0.5" style={{ color: accentColor }}>
              {suffix}
            </span>
          )}
        </div>

        {(badge || subLabel) && (
          <div className="flex items-center gap-2">
            {badge && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${badgeColor ?? accentColor}18`,
                  color: badgeColor ?? accentColor,
                }}
              >
                {badge}
              </span>
            )}
            {subLabel && (
              <span className="text-[11px]" style={{ color: "rgba(253,255,252,0.35)" }}>
                {subLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Phase Legend ─────────────────────────────────────────────────────────────

const PHASE_LEGEND = [
  { label: "Acquisition", color: "#454955" },
  { label: "Transaction", color: "#7A9EAA" },
  { label: "Rehab",       color: "#ffac5a" },
  { label: "Hold / Exit", color: "#5aaa3f" },
];

// ─── Inbox preview strip ──────────────────────────────────────────────────────

function InboxStrip() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(22,19,24,0.6) 0%, rgba(13,10,11,0.85) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      <div
        className="px-5 py-4 flex justify-between items-center"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: "#7A9EAA", fontVariationSettings: "'FILL' 0" }}
          >
            inbox
          </span>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "rgba(253,255,252,0.5)", letterSpacing: "0.08em" }}
          >
            Inbox
          </span>
        </div>
        <Link
          href="/dashboard/inbox"
          className="text-[11px] font-semibold transition-opacity duration-150 hover:opacity-70"
          style={{ color: "#7A9EAA" }}
        >
          Open →
        </Link>
      </div>

      {/* Placeholder rows — real threads wired via SmartInboxWidget in /inbox */}
      <div className="px-5 py-4 flex flex-col items-center justify-center gap-1 text-center min-h-[80px]">
        <span
          className="material-symbols-outlined text-2xl"
          style={{ color: "rgba(253,255,252,0.12)" }}
        >
          mark_email_unread
        </span>
        <p className="text-[11px]" style={{ color: "rgba(253,255,252,0.25)" }}>
          Messages and deal invites appear here.
        </p>
        <Link
          href="/dashboard/inbox"
          className="text-[11px] font-semibold mt-1 hover:opacity-70"
          style={{ color: "#7A9EAA" }}
        >
          Go to Inbox
        </Link>
      </div>
    </div>
  );
}

// ─── CommandCenter ────────────────────────────────────────────────────────────

export function CommandCenter() {
  const projects = useProjectStore((s) => s.projects);
  const kpis = usePortfolioKPIs(projects);

  // ── KPI display values ──
  const irrVal  = fmtPct(kpis.irr);
  const emVal   = kpis.equityMultiple !== null ? `${kpis.equityMultiple.toFixed(2)}` : "—";
  const capVal  = fmtCompact(kpis.capitalDeployed);
  const noiVal  = kpis.totalNOI !== null ? fmtCompact(kpis.totalNOI) : "—";
  const cfVal   = kpis.portfolioCashFlow !== null ? fmtCompact(kpis.portfolioCashFlow) : "—";

  return (
    <div
      className="flex-1 overflow-y-auto pb-24"
      style={{ scrollbarWidth: "none" } as React.CSSProperties}
    >
      <div className="p-8 space-y-8 max-w-[1280px] mx-auto">

        {/* ══ ZONE A — Page Header ══════════════════════════════════════════ */}
        <div className="flex justify-between items-center">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "-0.02em" }}
            >
              Portfolio
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(253,255,252,0.4)" }}>
              {kpis.activeCount > 0
                ? `${kpis.activeCount} active deal${kpis.activeCount !== 1 ? "s" : ""} · updated just now`
                : "Start by adding your first deal."}
            </p>
          </div>
          {/* Live pulse */}
          <span
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
            style={{ color: "rgba(253,255,252,0.35)", letterSpacing: "0.08em" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: "#454955" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: "#454955" }}
              />
            </span>
            Live
          </span>
        </div>

        {/* ══ ZONE B — KPI Strip (5 cards) ═════════════════════════════════ */}
        <section aria-label="Portfolio KPIs">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPICard
              label="Portfolio IRR"
              icon="trending_up"
              value={irrVal}
              suffix={kpis.irr !== null ? "%" : ""}
              accentColor="#454955"
              badge={kpis.irr !== null && kpis.irr > 0 ? "↑ On Track" : undefined}
              badgeColor="#454955"
              subLabel={kpis.irr !== null ? "annualized" : "No projects yet"}
            />
            <KPICard
              label="Equity Multiple"
              icon="layers"
              value={emVal}
              suffix={kpis.equityMultiple !== null ? "x" : ""}
              accentColor="#7A9EAA"
              badge={
                kpis.equityMultiple !== null && kpis.equityMultiple >= 1
                  ? "On Track"
                  : undefined
              }
              badgeColor="#7A9EAA"
              subLabel={kpis.equityMultiple !== null ? "vs. 2.5× target" : "No projects yet"}
            />
            <KPICard
              label="Capital Deployed"
              icon="account_balance_wallet"
              value={capVal}
              accentColor="#ffd1aa"
              badge={kpis.capitalDeployed !== null && kpis.capitalDeployed > 0 ? "Active" : undefined}
              badgeColor="#ffd1aa"
              subLabel={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            />
            <KPICard
              label="Total NOI"
              icon="home_work"
              value={noiVal}
              suffix={kpis.totalNOI !== null ? "/yr" : ""}
              accentColor="#5aaa3f"
              badge={kpis.totalNOI !== null && kpis.totalNOI > 0 ? "Rentals" : undefined}
              badgeColor="#5aaa3f"
              subLabel={kpis.totalNOI !== null ? "hold-phase only" : "Rentals only"}
            />
            <KPICard
              label="Portfolio Cash Flow"
              icon="waterfall_chart"
              value={cfVal}
              suffix={kpis.portfolioCashFlow !== null ? "/mo" : ""}
              accentColor="#454955"
              badge={
                kpis.portfolioCashFlow !== null && kpis.portfolioCashFlow > 0
                  ? "Positive"
                  : kpis.portfolioCashFlow !== null && kpis.portfolioCashFlow < 0
                  ? "Negative"
                  : undefined
              }
              badgeColor={
                kpis.portfolioCashFlow !== null && kpis.portfolioCashFlow < 0
                  ? "#F06543"
                  : "#454955"
              }
              subLabel={kpis.portfolioCashFlow !== null ? "rental income" : "Rentals only"}
            />
          </div>
        </section>

        {/* ══ ZONE C — Needs Attention ══════════════════════════════════════ */}
        <NeedsAttentionFeed />

        {/* ══ ZONE D — Active Pipeline + Right Sidebar ═════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* D-LEFT: Pipeline */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex justify-between items-end">
              <h2
                className="text-lg font-bold tracking-tight"
                style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "-0.01em" }}
              >
                Active Pipeline
              </h2>
              <div className="hidden md:flex items-center gap-4">
                {PHASE_LEGEND.map(({ label, color }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "rgba(253,255,252,0.4)" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <ActivePipeline />
          </div>

          {/* D-RIGHT: Inbox + Top Performers */}
          <div className="lg:col-span-4 space-y-5">
            <InboxStrip />
            <TopPerformersWidget />
          </div>

        </section>

        {/* ══ ZONE E — Activity + Market Heatmap ═══════════════════════════ */}
        <section
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          style={{ minHeight: "300px" }}
        >
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
