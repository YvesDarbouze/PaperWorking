"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { collection, doc, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useProjectStore } from "@/store/projectStore";
import { useTheme } from "@/lib/utils/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useInboxFeed } from "@/hooks/useInboxFeed";
import { useAllDealsSync } from "@/hooks/useAllProjectsSync";
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

const InsightsTab = dynamic(() => import("@/components/portfolio/InsightsTab"), { ssr: false });

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
        (p.strategyType === "Rent" || p.strategyType === "Buy & Hold") &&
        ((p.currentPhase ?? 1) === 3 || (p.currentPhase ?? 1) === 4);

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

// ─── Design tokens ────────────────────────────────────────────────────────────

function tokens(isDark: boolean) {
  return {
    heading:    isDark ? "rgba(253,255,252,0.95)" : "#0d0a0b",
    subtext:    isDark ? "rgba(253,255,252,0.70)" : "rgba(55,59,69,0.80)",
    muted:      isDark ? "rgba(253,255,252,0.58)" : "rgba(55,59,69,0.72)",
    divider:    isDark ? "rgba(230, 234, 240, 0.12)" : "rgba(33, 34, 38, 0.12)",
    link:       "#3279F9",
    panelBg:    isDark
      ? "linear-gradient(145deg, rgba(30,27,34,0.72) 0%, rgba(18,16,20,0.90) 100%)"
      : "#FFFFFF",
    panelBorder:isDark ? "rgba(230, 234, 240, 0.12)"  : "rgba(33, 34, 38, 0.12)",
    panelShadow:isDark ? "0 4px 20px rgba(0,0,0,0.28)" : "0 2px 10px rgba(0,0,0,0.06)",
  };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  icon: string;
  value: string;
  suffix?: string;
  accentColor: string;
  trend?: "up" | "down" | "flat";
  chip?: string;
  meta?: string;
  isDark: boolean;
}

function KPICard({ label, icon, value, suffix, accentColor, trend, chip, meta, isDark }: KPICardProps) {
  const t        = tokens(isDark);
  const trendIcon = trend === "up" ? "arrow_upward" : trend === "down" ? "arrow_downward" : null;
  const trendClr  = trend === "up" ? "#5aaa3f" : trend === "down" ? "#F06543" : undefined;
  const [hovered, setHovered] = useState(false);

  return (
    <article
      aria-label={`${label}: ${value}${suffix ?? ""}`}
      className="relative flex flex-col gap-2.5 rounded-xl p-4 overflow-hidden group cursor-default"
      style={{
        background: t.panelBg,
        backdropFilter: isDark ? "blur(24px)" : undefined,
        WebkitBackdropFilter: isDark ? "blur(24px)" : undefined,
        border: `1px solid ${hovered ? "#3279F9" : t.panelBorder}`,
        boxShadow: hovered
          ? (isDark ? "0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px #3279F9" : "0 8px 30px rgba(50, 121, 249, 0.06), 0 0 0 1px #3279F9")
          : t.panelShadow,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
        style={{ background: accentColor, opacity: 0.7 }}
      />

      {/* Label + icon */}
      <div className="flex items-center justify-between pl-3">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: t.subtext, letterSpacing: "0.08em" }}
        >
          {label}
        </span>
        <span
          className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-105"
          style={{ color: accentColor, fontVariationSettings: "'FILL' 0", opacity: 0.75 }}
        >
          {icon}
        </span>
      </div>

      {/* Value */}
      <div className="pl-3">
        <div className="flex items-baseline gap-1 leading-none mb-1.5">
          <span
            className="text-[2.1rem] font-bold tracking-tight tabular-nums"
            style={{ color: t.heading, fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </span>
          {suffix && (
            <span className="text-[1rem] font-semibold" style={{ color: accentColor }}>
              {suffix}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {chip && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${accentColor}15`, color: accentColor }}
            >
              {trendIcon && (
                <span
                  className="material-symbols-outlined text-[11px]"
                  style={{ fontVariationSettings: "'FILL' 1", color: trendClr ?? accentColor }}
                >
                  {trendIcon}
                </span>
              )}
              {chip}
            </span>
          )}
          {meta && (
            <span className="text-[11px]" style={{ color: t.muted }}>
              {meta}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({
  title,
  href,
  linkLabel,
  badge,
  badgeColor,
  isDark,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  badge?: string | number;
  badgeColor?: string;
  isDark: boolean;
}) {
  const t = tokens(isDark);
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2
        className="text-[14px] font-semibold tracking-tight shrink-0"
        style={{ color: t.heading, letterSpacing: "-0.01em" }}
      >
        {title}
      </h2>
      {badge !== undefined && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: `${badgeColor ?? "#F06543"}18`,
            color: badgeColor ?? "#F06543",
          }}
        >
          {badge}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: t.divider }} />
      {href && linkLabel && (
        <Link
          href={href}
          className="text-[12px] font-semibold shrink-0 transition-opacity duration-150 hover:opacity-70"
          style={{ color: t.link }}
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

// ─── Glass panel wrapper ───────────────────────────────────────────────────────

function Panel({
  children,
  isDark,
  className = "",
}: {
  children: React.ReactNode;
  isDark: boolean;
  className?: string;
}) {
  const t = tokens(isDark);
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: t.panelBg,
        backdropFilter: isDark ? "blur(20px)" : undefined,
        WebkitBackdropFilter: isDark ? "blur(20px)" : undefined,
        border: `1px solid ${t.panelBorder}`,
        boxShadow: t.panelShadow,
      }}
    >
      {children}
    </div>
  );
}

// ─── Phase legend pills ────────────────────────────────────────────────────────

const PHASE_LEGEND = [
  { label: "Acquisition", color: "#454955" },
  { label: "Closing",     color: "#7A9EAA" },
  { label: "Rehab",       color: "#ffac5a" },
  { label: "Hold / Exit", color: "#5aaa3f" },
];

// ─── Recent Activity Feed ─────────────────────────────────────────────────────

interface RecentActivityEvent {
  id: string;
  type: string;
  actorName: string;
  description: string;
  projectName?: string;
  createdAt: Date;
}

function activityIcon(type: string): string {
  switch (type) {
    case "doc_uploaded":   return "upload_file";
    case "member_joined":  return "group_add";
    case "phase_change":   return "edit_note";
    case "deal_created":   return "add_home";
    case "deal_sold":      return "sell";
    case "ledger_item":    return "receipt_long";
    default:               return "history";
  }
}

function activityLabel(type: string): string {
  switch (type) {
    case "doc_uploaded":   return "Document uploaded";
    case "member_joined":  return "Team member joined";
    case "phase_change":   return "Status updated";
    case "deal_created":   return "Deal added";
    case "deal_sold":      return "Deal sold";
    case "ledger_item":    return "Ledger entry";
    default:               return "Activity";
  }
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60)  return "just now";
  if (diffMin < 60)  return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  return `${diffDay}d`;
}

function useRecentActivity(orgId: string | null | undefined) {
  const [events, setEvents] = useState<RecentActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || orgId === "org_placeholder") {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "organizations", orgId, "activity"),
      orderBy("createdAt", "desc"),
      limit(8)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(
          snap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              type: d.type ?? "activity",
              actorName: d.actorName ?? "System",
              description: d.description ?? d.summary ?? "",
              projectName: d.projectName ?? undefined,
              createdAt:
                d.createdAt instanceof Timestamp
                  ? d.createdAt.toDate()
                  : new Date(),
            };
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [orgId]);

  return { events, loading };
}

function RecentActivityFeed({ isDark }: { isDark: boolean }) {
  const t = tokens(isDark);
  const { activeTenantId } = useTenant();
  const { events, loading } = useRecentActivity(activeTenantId);

  return (
    <Panel isDark={isDark} className="h-full flex flex-col">
      {/* Header */}
      <div
        className="px-4 py-3.5 flex justify-between items-center shrink-0"
        style={{ borderBottom: `1px solid ${t.divider}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ color: "#3279F9", fontVariationSettings: "'FILL' 0" }}
          >
            history
          </span>
          <span
            className="text-[10px] font-bold uppercase"
            style={{ letterSpacing: "0.08em", color: t.subtext }}
          >
            Recent Activity
          </span>
        </div>
        <Link
          href="/dashboard/inbox"
          className="text-[11px] font-semibold hover:opacity-70 transition-opacity"
          style={{ color: "#3279F9" }}
        >
          All →
        </Link>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex-1 p-3 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg border animate-pulse"
              style={{ borderColor: t.divider }}
            >
              <div
                className="w-7 h-7 rounded-md flex-shrink-0"
                style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
              />
              <div className="flex-1 space-y-1.5 py-0.5">
                <div
                  className="h-2.5 rounded"
                  style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}
                />
                <div
                  className="h-2 rounded w-3/4"
                  style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span
            className="material-symbols-outlined text-[32px]"
            style={{ color: t.muted, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
          >
            history
          </span>
          <p className="text-[11px] font-medium" style={{ color: t.subtext }}>
            No activity yet
          </p>
          <p className="text-[10px]" style={{ color: t.muted }}>
            Actions appear here in real time
          </p>
        </div>
      )}

      {/* Live event list */}
      {!loading && events.length > 0 && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-default relative overflow-hidden group"
              style={{ borderColor: t.divider, background: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3279F9";
                e.currentTarget.style.boxShadow = isDark
                  ? "0 4px 20px rgba(0,0,0,0.35)"
                  : "0 2px 10px rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = t.divider;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Hover glass overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)"
                    : "linear-gradient(135deg, rgba(50,121,249,0.02) 0%, rgba(50,121,249,0.01) 100%)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              />

              {/* Icon badge */}
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border z-10"
                style={{
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                }}
              >
                <span
                  className="material-symbols-outlined text-[13px]"
                  style={{
                    color: isDark ? "rgba(253,255,252,0.8)" : "rgba(69,73,85,0.8)",
                    fontVariationSettings: "'FILL' 0, 'wght' 300",
                  }}
                >
                  {activityIcon(event.type)}
                </span>
              </div>

              <div className="flex-1 min-w-0 z-10 text-left">
                <p
                  className="text-[12px] font-semibold truncate leading-snug"
                  style={{ color: t.heading }}
                >
                  {activityLabel(event.type)}
                </p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: t.muted }}>
                  {event.description}
                </p>
              </div>
              <span
                className="text-[9px] shrink-0 mt-0.5 tabular-nums z-10"
                style={{ color: t.muted, fontWeight: 500 }}
              >
                {formatRelativeTime(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── User Avatar & Profile Card ───────────────────────────────────────────────

interface AvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: number;
  isDark: boolean;
}

function UserAvatar({ photoURL, displayName, email, size = 32, isDark }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = displayName
    ? displayName.charAt(0).toUpperCase()
    : email
    ? email.charAt(0).toUpperCase()
    : "U";

  if (photoURL && !imgError) {
    return (
      <img
        src={photoURL}
        alt={displayName ?? "User avatar"}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: isDark
          ? "linear-gradient(135deg, rgba(69,73,85,0.8) 0%, rgba(110,116,128,0.6) 100%)"
          : "linear-gradient(135deg, rgba(69,73,85,0.15) 0%, rgba(110,116,128,0.25) 100%)",
        color: isDark ? "rgba(253,255,252,0.92)" : "rgba(69,73,85,0.9)",
      }}
    >
      {initials}
    </span>
  );
}

function ProfileCard({ isDark }: { isDark: boolean }) {
  const { user, profile } = useAuth();
  const { activeTenantId } = useTenant();
  const projects = useProjectStore((s) => s.projects);
  const t = tokens(isDark);
  const [teamCount, setTeamCount] = useState<number>(1);

  const activeCount = projects.filter(p => p.status !== 'Sold').length;
  const pastCount   = projects.filter(p => p.status === 'Sold').length;

  // Live team member count from the org document
  useEffect(() => {
    if (!activeTenantId || activeTenantId === 'org_placeholder') return;
    const orgRef = doc(db, 'organizations', activeTenantId);
    const unsub = onSnapshot(orgRef, (snap) => {
      if (snap.exists()) {
        const members: { status?: string }[] = snap.data()?.teamMembers ?? [];
        const active = members.filter((m) => m.status === 'active' || !m.status).length;
        setTeamCount(Math.max(1, active));
      }
    });
    return () => unsub();
  }, [activeTenantId]);

  return (
    <Panel isDark={isDark} className="p-6 flex flex-col justify-between h-full">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <UserAvatar
            photoURL={user?.photoURL}
            displayName={profile?.displayName ?? user?.displayName}
            email={user?.email}
            size={64}
            isDark={isDark}
          />
          {/* Active status pulse */}
          <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full ring-2 ring-white bg-[#5aaa3f]" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-[18px] font-bold truncate tracking-tight text-left" style={{ color: t.heading, fontFamily: "'Montserrat', sans-serif" }}>
            {profile?.displayName || user?.displayName || "Real Estate Investor"}
          </h2>
          <p className="text-[12px] capitalize text-left" style={{ color: t.subtext }}>
            {profile?.role || "Portfolio Manager"}
          </p>
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <span className="block text-[14px] font-bold font-mono" style={{ color: t.heading }}>{teamCount}</span>
              <span className="text-[10px] uppercase tracking-wider block" style={{ color: t.muted }}>Team</span>
            </div>
            <div className="text-center">
              <span className="block text-[14px] font-bold font-mono" style={{ color: t.heading }}>{projects.length}</span>
              <span className="text-[10px] uppercase tracking-wider block" style={{ color: t.muted }}>Deals</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t" style={{ borderColor: t.divider }}>
        <div className="p-3 rounded-lg border text-center" style={{ borderColor: t.panelBorder, background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }}>
          <span className="text-[20px] font-bold font-mono block" style={{ color: t.heading }}>{activeCount}</span>
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: t.muted }}>Active Projects</span>
        </div>
        <div className="p-3 rounded-lg border text-center" style={{ borderColor: t.panelBorder, background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }}>
          <span className="text-[20px] font-bold font-mono block" style={{ color: t.heading }}>{pastCount}</span>
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: t.muted }}>Past Projects</span>
        </div>
      </div>
    </Panel>
  );
}

// ─── Earnings & Losses Card ───────────────────────────────────────────────────

function EarningsLossesCard({ isDark, kpis }: { isDark: boolean; kpis: PortfolioKPIs }) {
  const projects = useProjectStore((s) => s.projects);
  const t = tokens(isDark);

  const { totalCapital, totalValue, totalEquityProfit } = useMemo(() => {
    let cap = 0;
    let val = 0;
    projects.forEach(p => {
      const f = p.financials;
      if (!f) return;
      const purchasePrice = f.purchasePrice ?? f.targetPrice ?? 0;
      const currentVal = f.estimatedCurrentValue ?? f.estimatedARV ?? purchasePrice;
      const loanAmount = f.loanAmount ?? 0;
      cap += (purchasePrice - loanAmount);
      val += currentVal;
    });
    return {
      totalCapital: cap,
      totalValue: val,
      totalEquityProfit: val - cap > 0 ? val - cap : 0
    };
  }, [projects]);

  const profitVal = totalEquityProfit > 0 ? fmtCompact(totalEquityProfit) : "—";
  const roiPct = totalCapital > 0 ? ((totalValue - totalCapital) / totalCapital * 100) : null;
  const isLoss = totalValue < totalCapital;

  return (
    <Panel isDark={isDark} className="p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
            Portfolio Equity & Earnings
          </span>
          <span className="material-symbols-outlined text-[20px]" style={{ color: isLoss ? "#F06543" : "#5aaa3f" }}>
            {isLoss ? "trending_down" : "trending_up"}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-left block" style={{ color: t.muted }}>Total Portfolio Value</span>
            <span className="text-[2.2rem] font-bold block leading-tight font-mono text-left" style={{ color: t.heading }}>
              {fmtCompact(totalValue)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-left block" style={{ color: t.muted }}>Capital Invested</span>
              <span className="text-[16px] font-bold font-mono text-left block" style={{ color: t.heading }}>
                {fmtCompact(totalCapital)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-left block" style={{ color: t.muted }}>Net Equity Profit</span>
              <span className="text-[16px] font-bold font-mono text-left block" style={{ color: isLoss ? "#F06543" : "#5aaa3f" }}>
                {isLoss ? "-" : "+"}{profitVal}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t flex items-center justify-between" style={{ borderColor: t.divider }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: t.muted }}>Equity Growth ROI</span>
          {roiPct !== null && (
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full" style={{
              background: isLoss ? "rgba(240, 101, 67, 0.12)" : "rgba(90, 170, 63, 0.12)",
              color: isLoss ? "#F06543" : "#5aaa3f"
            }}>
              {roiPct.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: t.muted }}>Blended IRR</span>
          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full" style={{
            background: "rgba(50, 121, 249, 0.12)",
            color: "#3279F9"
          }}>
            {kpis.irr !== null ? `${kpis.irr.toFixed(1)}%` : "—"}
          </span>
        </div>
      </div>
    </Panel>
  );
}

// ─── Recent Messages Widget ───────────────────────────────────────────────────

function RecentMessagesWidget({ isDark }: { isDark: boolean }) {
  const { items, loading } = useInboxFeed();
  const t = tokens(isDark);
  
  const recentMessages = useMemo(() => {
    return items.slice(0, 3);
  }, [items]);

  return (
    <Panel isDark={isDark} className="p-6 flex flex-col justify-between h-full">
      <div className="w-full">
        <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ color: "#3279F9" }}>
              inbox
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
              Recent Messages
            </span>
          </div>
          <Link href="/dashboard/inbox" className="text-[11px] font-semibold transition-opacity duration-150 hover:opacity-75" style={{ color: t.link }}>
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs" style={{ color: t.muted }}>
            Loading messages...
          </div>
        ) : recentMessages.length === 0 ? (
          <div className="py-8 text-center text-xs" style={{ color: t.muted }}>
            No recent messages.
          </div>
        ) : (
          <div className="space-y-3">
            {recentMessages.map((msg) => (
              <Link 
                key={msg.id}
                href={msg.deepLinkUrl || "/dashboard/inbox"} 
                className="block p-3 rounded-lg border transition-all duration-150 hover:border-[#3279F9]/50 relative group text-left"
                style={{
                  borderColor: t.panelBorder,
                  background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
                }}
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="text-[11px] font-bold truncate max-w-[120px]" style={{ color: t.heading }}>
                    {msg.actor?.name || "System"}
                  </span>
                  <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: t.muted }}>
                    {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h4 className="text-[12px] font-semibold truncate" style={{ color: t.heading }}>
                  {msg.title}
                </h4>
                <p className="text-[11px] truncate mt-0.5" style={{ color: t.subtext }}>
                  {msg.body}
                </p>
                {!msg.read && (
                  <span className="absolute top-2.5 right-2 w-1.5 h-1.5 rounded-full bg-[#3279F9]" />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── Assigned Tasks Checklist ─────────────────────────────────────────────────

function AssignedTasksChecklist({ isDark }: { isDark: boolean }) {
  const projects = useProjectStore((s) => s.projects);
  const updateProjectActionItems = useProjectStore((s) => s.updateProjectActionItems);
  const { user, profile } = useAuth();
  const t = tokens(isDark);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const currentUserEmail = profile?.email || user?.email || '';

  const assignedTasks = useMemo(() => {
    if (!currentUserEmail) return [];
    const tasks: Array<{ projectId: string; propertyName: string; task: any }> = [];
    projects.forEach((proj) => {
      if (proj.actionItems && Array.isArray(proj.actionItems)) {
        proj.actionItems.forEach((todo) => {
          if (todo.assignee === currentUserEmail && !todo.completed) {
            tasks.push({
              projectId: proj.id,
              propertyName: proj.propertyName || proj.name || 'Unnamed Project',
              task: todo
            });
          }
        });
      }
    });
    return tasks;
  }, [projects, currentUserEmail]);

  const handleToggle = async (projectId: string, taskId: string) => {
    if (!user || togglingId) return;
    setTogglingId(taskId);

    const deal = projects.find(p => p.id === projectId);
    if (!deal) {
      setTogglingId(null);
      return;
    }

    const existingTodos = deal.actionItems || [];
    const updatedTodos = existingTodos.map((todo: any) =>
      todo.id === taskId ? { ...todo, completed: true } : todo
    );

    // Optimistically update store
    updateProjectActionItems(projectId, updatedTodos);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/projects/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          projectId,
          todos: updatedTodos
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update task status');
      }

      const { useUIStore } = await import('@/store/uiStore');
      useUIStore.getState().triggerSuccessfulAction('task_completed');
    } catch (err) {
      console.error('Failed to complete task:', err);
      // Revert optimistic update
      updateProjectActionItems(projectId, existingTodos);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Panel isDark={isDark} className="p-6 flex flex-col justify-between h-full">
      <div className="w-full">
        <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ color: "#5aaa3f" }}>
              task_alt
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
              Assigned Tasks
            </span>
          </div>
          <span className="text-[10px] font-mono bg-[#5aaa3f]/10 text-[#5aaa3f] px-2 py-0.5 rounded-full uppercase tracking-wider">
            {assignedTasks.length} Pending
          </span>
        </div>

        {assignedTasks.length === 0 ? (
          <div className="py-12 text-center text-xs space-y-2" style={{ color: t.muted }}>
            <span className="material-symbols-outlined text-[28px] opacity-40 block">
              check_circle
            </span>
            <p>You're all caught up! No pending tasks assigned to you.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
            {assignedTasks.map(({ projectId, propertyName, task }) => (
              <div 
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-neutral-50/5 relative text-left"
                style={{
                  borderColor: t.panelBorder,
                  background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
                }}
              >
                <button
                  onClick={() => handleToggle(projectId, task.id)}
                  disabled={togglingId === task.id}
                  className="mt-0.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                  aria-label={`Mark task ${task.label} as complete`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ color: t.muted }}>
                    {togglingId === task.id ? "hourglass_top" : "radio_button_unchecked"}
                  </span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-[13px] font-semibold text-left truncate" style={{ color: t.heading }}>
                      {task.label}
                    </h4>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#7A9EAA]/10 text-[#7A9EAA] truncate max-w-[100px]" title={propertyName}>
                      {propertyName}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-[11px] text-left mt-1 line-clamp-2" style={{ color: t.subtext }}>
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── Empty state (no projects) ────────────────────────────────────────────────

function EmptyPortfolio({ isDark }: { isDark: boolean }) {
  const t = tokens(isDark);
  return (
    <Panel isDark={isDark} className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <span
        className="material-symbols-outlined text-5xl mb-4"
        style={{ color: "#454955", fontVariationSettings: "'FILL' 0" }}
      >
        folder_open
      </span>
      <h3
        className="text-[18px] font-semibold mb-2"
        style={{ color: t.heading, letterSpacing: "-0.01em" }}
      >
        No projects yet
      </h3>
      <p className="text-[13px] max-w-xs leading-relaxed mb-6" style={{ color: t.subtext }}>
        Add your first real estate project to start tracking performance, deploying capital, and closing deals.
      </p>
      <Link
        href="/dashboard/projects/new"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 active:scale-95"
        style={{ background: "#454955", color: "#FDFFFC" }}
      >
        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
          add
        </span>
        Create first project
      </Link>
    </Panel>
  );
}

// ─── CommandCenter ────────────────────────────────────────────────────────────

export function CommandCenter() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const ledgerItems = useProjectStore((s) => s.ledgerItems);
  const kpis     = usePortfolioKPIs(projects);
  const { theme } = useTheme();
  const isDark    = theme === "dark";
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const t         = tokens(isDark);
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'transactions' | 'insights'>('overview');

  // Derive caution projects for Project Health badge
  const cautionProjects = useMemo(() => {
    return projects.filter(p => {
      const f = p.financials;
      if (!f) return false;
      const purchasePrice = f.purchasePrice ?? f.targetPrice ?? f.targetPurchasePrice ?? 0;
      const propValue = f.estimatedCurrentValue ?? f.estimatedARV ?? purchasePrice;
      const ltvVal = propValue > 0 ? ((f.loanAmount ?? 0) / propValue) * 100 : 0;
      const derived = deriveAllMetrics(f, undefined, p.strategyType, p.currentPhase);
      const dscrVal = derived.dscr;
      return ltvVal > 80 || (dscrVal !== null && dscrVal < 1.15);
    });
  }, [projects]);

  if (!mounted) {
    return <div className="p-8 animate-pulse h-screen" style={{ background: isDark ? "#0d0a0b" : "#FDFFFC" }} />;
  }

  const irrVal = fmtPct(kpis.irr);
  const emVal  = kpis.equityMultiple !== null ? kpis.equityMultiple.toFixed(2) : "—";
  const capVal = fmtCompact(kpis.capitalDeployed);
  const noiVal = kpis.totalNOI !== null ? fmtCompact(kpis.totalNOI) : "—";
  const cfVal  = kpis.portfolioCashFlow !== null ? fmtCompact(kpis.portfolioCashFlow) : "—";
  const cfNeg  = kpis.portfolioCashFlow !== null && kpis.portfolioCashFlow < 0;

  return (
    <div className="w-full min-h-full">
      <div className="px-5 py-6 lg:px-8 lg:py-7 space-y-7 max-w-[1400px] mx-auto">

        {/* ══════════════════════════════════════════════════════════════════
            ZONE 1 — Page Header
            TopAppBar handles: global search (⌘K) + notification bell.
            This zone: page title, deal count, live status, quick CTA.
        ══════════════════════════════════════════════════════════════════ */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1
                className="text-[28px] font-bold leading-none"
                style={{ color: t.heading, letterSpacing: "-0.03em" }}
              >
                Portfolio
              </h1>
              {/* Live pulse */}
              <span className="flex items-center gap-1 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ backgroundColor: "#5aaa3f" }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: "#5aaa3f" }}
                  />
                </span>
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: t.muted, letterSpacing: "0.08em" }}
                >
                  Live
                </span>
              </span>

              {/* Project Health pulse badge */}
              {cautionProjects.length > 0 && (
                <Link
                  href="/dashboard/insights"
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-150 active:scale-95 ml-2 cursor-pointer"
                  style={{
                    background: "rgba(240,101,67,0.15)",
                    border: "1px solid rgba(240,101,67,0.3)",
                    color: "#F06543",
                  }}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F06543] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#F06543]" />
                  </span>
                  {cautionProjects.length} Caution
                </Link>
              )}
            </div>
            <p className="text-[13px]" style={{ color: t.subtext }}>
              {kpis.activeCount > 0
                ? `${kpis.activeCount} active deal${kpis.activeCount !== 1 ? "s" : ""} across your portfolio`
                : "No deals yet — create your first project to get started."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/reports"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(69,73,85,0.07)",
                border: `1px solid ${t.panelBorder}`,
                color: t.subtext,
              }}
            >
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                bar_chart_4_bars
              </span>
              Reports
            </Link>
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 active:scale-95 cursor-pointer"
              style={{
                background: isDark ? "rgba(69,73,85,0.35)" : "#454955",
                border: isDark ? `1px solid rgba(255,255,255,0.12)` : "none",
                color: "#FDFFFC",
              }}
            >
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                add
              </span>
              New Project
            </Link>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════
            ZONE 2 — Hero Metrics Strip
            5 KPI cards: IRR · Equity Multiple · Capital Deployed · NOI · Cash Flow
            Scroll-snaps on mobile. Full row on desktop.
        ══════════════════════════════════════════════════════════════════ */}
        <section aria-label="Portfolio health metrics">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPICard
              isDark={isDark}
              label="Portfolio IRR"
              icon="trending_up"
              value={irrVal}
              suffix={kpis.irr !== null ? "%" : ""}
              accentColor="#454955"
              trend={kpis.irr !== null && kpis.irr > 0 ? "up" : undefined}
              chip={kpis.irr !== null && kpis.irr > 0 ? "On track" : undefined}
              meta={kpis.irr !== null ? "annualized" : "Add a project"}
            />
            <KPICard
              isDark={isDark}
              label="Equity Multiple"
              icon="layers"
              value={emVal}
              suffix={kpis.equityMultiple !== null ? "×" : ""}
              accentColor="#7A9EAA"
              trend={kpis.equityMultiple !== null && kpis.equityMultiple >= 1 ? "up" : undefined}
              chip={kpis.equityMultiple !== null && kpis.equityMultiple >= 1 ? "On track" : undefined}
              meta={kpis.equityMultiple !== null ? "vs. 2.5× target" : "Add a project"}
            />
            <KPICard
              isDark={isDark}
              label="Capital Deployed"
              icon="account_balance_wallet"
              value={capVal}
              accentColor="#ffac5a"
              chip={kpis.capitalDeployed !== null && kpis.capitalDeployed > 0 ? "Deployed" : undefined}
              meta={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            />
            <KPICard
              isDark={isDark}
              label="Total NOI"
              icon="home_work"
              value={noiVal}
              suffix={kpis.totalNOI !== null ? "/yr" : ""}
              accentColor="#5aaa3f"
              trend={kpis.totalNOI !== null && kpis.totalNOI > 0 ? "up" : undefined}
              chip={kpis.totalNOI !== null ? "Rental" : undefined}
              meta={kpis.totalNOI !== null ? "hold-phase" : "Rentals only"}
            />
            <KPICard
              isDark={isDark}
              label="Monthly Cash Flow"
              icon="waterfall_chart"
              value={cfVal}
              suffix={kpis.portfolioCashFlow !== null ? "/mo" : ""}
              accentColor={cfNeg ? "#F06543" : "#454955"}
              trend={kpis.portfolioCashFlow !== null ? (cfNeg ? "down" : "up") : undefined}
              chip={kpis.portfolioCashFlow !== null ? (cfNeg ? "Negative" : "Positive") : undefined}
              meta={kpis.portfolioCashFlow !== null ? "rental income" : "Rentals only"}
            />
          </div>
        </section>

        {/* Tabs Navigation */}
        <div className="flex border-b" style={{ borderColor: t.divider }}>
          {([
            { id: 'overview', name: 'Overview', icon: 'space_dashboard' },
            { id: 'assets', name: 'Assets', icon: 'folder' },
            { id: 'transactions', name: 'Transactions', icon: 'payments' },
            { id: 'insights', name: 'Insights', icon: 'monitoring' }
          ] as const).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-[13px] capitalize transition-all duration-150 focus:outline-none -mb-px"
                style={{
                  borderColor: isActive ? '#3279F9' : 'transparent',
                  color: isActive ? t.heading : t.subtext,
                }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {tab.icon}
                </span>
                {tab.name}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* ══════════════════════════════════════════════════════════════════
                Investor Profile & Earnings/Losses Summary Row
            ══════════════════════════════════════════════════════════════════ */}
            <section aria-label="Investor profile and portfolio performance" className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ProfileCard isDark={isDark} />
              <EarningsLossesCard isDark={isDark} kpis={kpis} />
            </section>

            {/* ══════════════════════════════════════════════════════════════════
                Assigned Tasks & Recent Inbox Messages Row
            ══════════════════════════════════════════════════════════════════ */}
            <section aria-label="Tasks and messages" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <AssignedTasksChecklist isDark={isDark} />
              </div>
              <div className="lg:col-span-1">
                <RecentMessagesWidget isDark={isDark} />
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════════
                ZONE 3 — Action Center
                Priority items needing immediate investor attention:
                contingency deadlines, pending signatures, vendor approvals,
                phase-gate blockers. Surfaces critical items BEFORE the pipeline.
            ══════════════════════════════════════════════════════════════════ */}
            <section aria-label="Action center">
              <SectionHeading
                title="Action Center"
                href="/dashboard/projects"
                linkLabel="All projects"
                isDark={isDark}
              />
              {kpis.activeCount === 0 ? (
                <EmptyPortfolio isDark={isDark} />
              ) : (
                <NeedsAttentionFeed />
              )}
            </section>

            {/* ══════════════════════════════════════════════════════════════════
                ZONE 4 — Active Pipeline + Top Performers
                Pipeline: 8/12 cols — full kanban-style deal list with phase state.
                Top Performers: 4/12 cols — highest-return assets for quick context.
            ══════════════════════════════════════════════════════════════════ */}
            {kpis.activeCount > 0 && (
              <section
                aria-label="Active deal pipeline"
                className="grid grid-cols-1 lg:grid-cols-12 gap-5"
              >
                <div className="lg:col-span-8">
                  <SectionHeading
                    title="Active Pipeline"
                    href="/dashboard/projects"
                    linkLabel="Manage"
                    isDark={isDark}
                  />
                  {/* Phase legend */}
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    {PHASE_LEGEND.map(({ label, color }) => (
                      <span
                        key={label}
                        className="flex items-center gap-1.5 text-[11px]"
                        style={{ color: t.muted }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        {label}
                      </span>
                    ))}
                  </div>
                  <ActivePipeline />
                </div>

                <div className="lg:col-span-4">
                  <SectionHeading title="Top Performers" isDark={isDark} />
                  <TopPerformersWidget />
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                ZONE 5 — Marketplace Heatmap + Recent Activity
                Heatmap: 2/3 — posted deal opportunities + market sourcing.
                Activity: 1/3 — files, messages, team events, project updates.
            ══════════════════════════════════════════════════════════════════ */}
            <section
              aria-label="Marketplace and activity"
              className="grid grid-cols-1 lg:grid-cols-3 gap-5"
            >
              <div className="lg:col-span-2 flex flex-col">
                <SectionHeading
                  title="Marketplace Heatmap"
                  href="/dashboard/insights"
                  linkLabel="Browse opportunities"
                  isDark={isDark}
                />
                <div className="flex-1 min-h-[280px]">
                  <MarketHeatmap />
                </div>
              </div>

              <div className="lg:col-span-1 flex flex-col">
                <SectionHeading
                  title="Recent Activity"
                  href="/dashboard/inbox"
                  linkLabel="Inbox"
                  isDark={isDark}
                />
                <div className="flex-1">
                  <RecentActivityFeed isDark={isDark} />
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'assets' && (
          <section
            aria-label="Active deal pipeline"
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            <div className="lg:col-span-8">
              <SectionHeading
                title="Active Pipeline"
                href="/dashboard/projects"
                linkLabel="Manage"
                isDark={isDark}
              />
              {/* Phase legend */}
              <div className="flex flex-wrap items-center gap-4 mb-3">
                {PHASE_LEGEND.map(({ label, color }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: t.muted }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>
              <ActivePipeline />
            </div>

            <div className="lg:col-span-4">
              <SectionHeading title="Top Performers" isDark={isDark} />
              <TopPerformersWidget />
            </div>
          </section>
        )}

        {activeTab === 'transactions' && (
          <section
            aria-label="Portfolio Transactions"
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            <div className="lg:col-span-2 flex flex-col">
              <SectionHeading title="Transactions Ledger" isDark={isDark} />
              <Panel isDark={isDark} className="p-5 flex-1 overflow-x-auto">
                {(() => {
                  const allTx = projects.flatMap((deal) => {
                    const items = ledgerItems[deal.id] || [];
                    return items.map((item) => ({
                      dealId: deal.id,
                      propertyName: deal.propertyName,
                      ...item,
                    }));
                  });

                  if (allTx.length === 0) {
                    return (
                      <div className="text-center py-12 text-sm" style={{ color: t.subtext }}>
                        No transactions found in portfolio.
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="border-b" style={{ borderColor: t.divider }}>
                          <th className="py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>Property</th>
                          <th className="py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>Category</th>
                          <th className="py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>Description</th>
                          <th className="py-2.5 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: t.subtext }}>Amount</th>
                          <th className="py-2.5 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: t.subtext }}>Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: t.divider }}>
                        {allTx.map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/5 transition-colors duration-150">
                            <td className="py-3 text-[13px] font-semibold" style={{ color: t.heading }}>{tx.propertyName}</td>
                            <td className="py-3 text-[13px]" style={{ color: t.subtext }}>{tx.category || "General"}</td>
                            <td className="py-3 text-[13px]" style={{ color: t.subtext }}>{tx.description}</td>
                            <td className="py-3 text-[13px] text-right font-medium tabular-nums" style={{ color: t.heading }}>{fmtCompact(tx.amount)}</td>
                            <td className="py-3 text-right">
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: tx.status === "Approved" ? "rgba(90, 170, 63, 0.15)" : "rgba(240, 101, 67, 0.15)",
                                  color: tx.status === "Approved" ? "#5aaa3f" : "#F06543",
                                }}
                              >
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </Panel>
            </div>
            <div className="lg:col-span-1 flex flex-col">
              <SectionHeading title="Recent Activity" isDark={isDark} />
              <div className="flex-1">
                <RecentActivityFeed isDark={isDark} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'insights' && (
          <section aria-label="Portfolio Yield Insights" className="space-y-4">
            <SectionHeading title="Yield Analytics & Performance" isDark={isDark} />
            <InsightsTab />
          </section>
        )}

      </div>
    </div>
  );
}
