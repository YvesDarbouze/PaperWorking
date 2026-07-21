"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { collection, doc, query, orderBy, limit, onSnapshot, Timestamp, where } from "firebase/firestore";
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
  type KPI33Block,
  type KPI33Value,
} from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";
import type { DealListingTeaser } from "@/types/listing";
import { METRIC_TAXONOMY, type MetricCategory } from "@/lib/metrics/metricTaxonomy";

const InsightsTab = dynamic(() => import("@/components/portfolio/InsightsTab"), { ssr: false });
const DealMap = dynamic(() => import("@/components/marketplace/DealMap"), { ssr: false });

// ─── Portfolio KPI hook ───────────────────────────────────────────────────────

interface PortfolioKPIs {
  irr: number | null;
  equityMultiple: number | null;
  capitalDeployed: number | null;
  totalNOI: number | null;
  portfolioCashFlow: number | null;
  blendedCapRate: number | null;
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
        blendedCapRate: null,
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
    let totalCapRateNOI = 0;
    let totalCapRatePrice = 0;
    const allIRRFlows: number[][] = [];

    for (const p of projects) {
      const f = p.financials;
      if (!f) continue;

      const metrics = deriveAllMetrics(
        f,
        f.estimatedCurrentValue || f.estimatedARV,
        p.dispositionType,
        p.currentPhase,
        p.createdAt,
      );

      // Cap rate — use per-project NOI / purchase price (weighted blend)
      if (Number.isFinite(metrics.noi) && metrics.noi !== 0) {
        const pp = f.purchasePrice ?? f.targetPrice ?? 0;
        if (pp > 0) {
          totalCapRateNOI += metrics.noi;
          totalCapRatePrice += pp;
        }
      }

      const purchasePrice = f.purchasePrice ?? f.targetPrice ?? 0;
      const loanAmount = f.loanAmount ?? 0;

      totalCashInvested += metrics.totalCashInvested;
      totalPropertyValue +=
        f.estimatedCurrentValue || f.estimatedARV || purchasePrice || 0;
      totalCapitalDeployed += purchasePrice - loanAmount;

      // NOI — rental / hold-phase projects only
      const isRental =
        p.dispositionType === "RENT" &&
        ((p.currentPhase ?? 1) === 3 || (p.currentPhase ?? 1) === 4);

      if (isRental) {
        if (Number.isFinite(metrics.noi) && metrics.noi !== 0) {
          totalNOI += metrics.noi;
          noiProjectCount++;
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

    const blendedCapRate = totalCapRatePrice > 0
      ? (totalCapRateNOI / totalCapRatePrice) * 100
      : null;

    return {
      irr: portfolioIRR,
      equityMultiple,
      capitalDeployed: totalCapitalDeployed > 0 ? totalCapitalDeployed : null,
      totalNOI: noiProjectCount > 0 ? totalNOI : null,
      portfolioCashFlow: cfProjectCount > 0 ? totalCashFlow : null,
      blendedCapRate,
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
    link:       "#627C85",
    panelBg:    isDark
      ? "var(--color-surface, #121317)"
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
  href?: string;
}

function KPICard({ label, icon, value, suffix, accentColor, trend, chip, meta, isDark, href }: KPICardProps) {
  const t        = tokens(isDark);
  const trendIcon = trend === "up" ? "arrow_upward" : trend === "down" ? "arrow_downward" : null;
  const trendClr  = trend === "up" ? "var(--pw-success)" : trend === "down" ? "#F06543" : undefined;
  const [hovered, setHovered] = useState(false);

  const cardContent = (
    <article
      aria-label={`${label}: ${value}${suffix ?? ""}`}
      className={`relative flex flex-col gap-2.5 rounded-xl p-4 overflow-hidden group ${href ? "cursor-pointer" : "cursor-default"}`}
      style={{
        background: t.panelBg,
        backdropFilter: isDark ? "blur(24px)" : undefined,
        WebkitBackdropFilter: isDark ? "blur(24px)" : undefined,
        border: `1px solid ${hovered ? "#627C85" : t.panelBorder}`,
        boxShadow: hovered
          ? (isDark ? "0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px #627C85" : "0 8px 30px rgba(98, 124, 133, 0.06), 0 0 0 1px #627C85")
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

  if (href) {
    return (
      <Link href={href} className="no-underline block h-full">
        {cardContent}
      </Link>
    );
  }
  return cardContent;
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

// ─── Clickable Panel wrapper (PF-3: whole-card click-through) ─────────────────

function ClickablePanel({
  href,
  isDark,
  className = "",
  children,
  ariaLabel,
}: {
  href: string;
  isDark: boolean;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const t = tokens(isDark);
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      className="no-underline block h-full"
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`rounded-xl overflow-hidden cursor-pointer transition-all duration-200 h-full ${className}`}
        style={{
          background: t.panelBg,
          backdropFilter: isDark ? "blur(20px)" : undefined,
          WebkitBackdropFilter: isDark ? "blur(20px)" : undefined,
          border: `1px solid ${hovered ? "#627C85" : t.panelBorder}`,
          boxShadow: hovered
            ? (isDark ? "0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px #627C85" : "0 8px 30px rgba(98, 124, 133, 0.06), 0 0 0 1px #627C85")
            : t.panelShadow,
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
        }}
      >
        {children}
      </div>
    </Link>
  );
}

// ─── Phase legend pills ────────────────────────────────────────────────────────

const PHASE_LEGEND = [
  { label: "Acquisition", color: "#454955" },
  { label: "Closing",     color: "#7A9EAA" },
  { label: "Rehab",       color: "#ffac5a" },
  { label: "Hold / Exit", color: "var(--pw-success)" },
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
            style={{ color: "#627C85", fontVariationSettings: "'FILL' 0" }}
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
          style={{ color: "#627C85" }}
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
                e.currentTarget.style.borderColor = "#627C85";
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
                    : "linear-gradient(135deg, rgba(98,124,133,0.02) 0%, rgba(98,124,133,0.01) 100%)",
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

interface FollowerWithDeal {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  followedAt: string;
  dealName: string;
}

function ProfileCard({ isDark, followers }: { isDark: boolean; followers: FollowerWithDeal[] }) {
  const { user, profile } = useAuth();
  const { activeTenantId } = useTenant();
  const projects = useProjectStore((s) => s.projects);
  const t = tokens(isDark);
  const [teamCount, setTeamCount] = useState<number>(1);

  const activeCount = projects.filter(p => p.status !== 'exit').length;
  const pastCount = projects.filter(p => p.status === 'exit').length;

  // Resolve workspaces and company name
  const workspaces: Array<{ id: string; name: string; type: "personal" | "team" }> = profile
    ? [{ id: profile.personalOrganizationId || `org_${user?.uid.slice(0, 8)}`, name: "Personal Workspace", type: "personal" }]
    : [];

  if (profile?.memberships) {
    Object.entries(profile.memberships).forEach(([tenantId, membership]) => {
      workspaces.push({
        id: tenantId,
        name: (membership as { tenantName?: string })?.tenantName || "Team Workspace",
        type: "team",
      });
    });
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeTenantId) || workspaces[0];
  const companyName = activeWorkspace?.name || "PaperWorking Member";

  // Live team count
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

  // Real followers only — no seed/fallback data (honest zero-state)
  const displayFollowers = useMemo(() => {
    return followers.slice(0, 5);
  }, [followers]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0] ? parts[0].slice(0, 2).toUpperCase() : "US";
  };

  // Canon role: Lead Investor for owners, Investment Team for team members
  const canonRole = profile?.role === "Vendor"
    ? "Vendor Partner"
    : (profile?.role || "Lead Investor");

  return (
    <Panel isDark={isDark} className="flex flex-col relative lg:min-h-[580px] h-full justify-between">
      {/* ── Portrait card content ── */}
      <div className="w-full flex-1 flex flex-col p-6">
        {/* Header row: "Profile" + edit */}
        <div className="flex justify-between items-center mb-5">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
            Profile
          </span>
          <Link
            href="/dashboard/settings/profile"
            className="text-[11px] font-semibold transition-opacity duration-150 hover:opacity-75"
            style={{ color: t.link }}
          >
            edit
          </Link>
        </div>

        {/* ── Identity block ── */}
        <div className="flex items-start gap-4 pb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar with presence dot */}
            <div className="relative flex-shrink-0">
              <UserAvatar
                photoURL={user?.photoURL}
                displayName={profile?.displayName ?? user?.displayName}
                email={user?.email}
                size={54}
                isDark={isDark}
              />
              <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 bg-[var(--pw-success)] ${isDark ? 'ring-[#121317]' : 'ring-white'}`} />
            </div>

            {/* Name, Company, Role, Followers/Team */}
            <div className="min-w-0 text-left">
              <h2 className="text-[15px] font-bold truncate leading-snug" style={{ color: t.heading }}>
                {profile?.displayName || user?.displayName || "Real Estate Investor"}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[11px] truncate" style={{ color: t.muted }}>{companyName}</p>
                {/* Company logo monogram */}
                <span
                  className="w-4 h-4 rounded-[3px] flex items-center justify-center text-[7px] font-bold flex-shrink-0"
                  style={{
                    background: isDark ? "rgba(98,124,133,0.15)" : "rgba(98,124,133,0.10)",
                    color: "#627C85",
                    border: "1px solid rgba(98,124,133,0.20)",
                  }}
                  title={companyName}
                >
                  {getInitials(companyName)}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider font-semibold mt-1" style={{ color: "#627C85" }}>
                {canonRole}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: t.muted }}>
                {followers.length} {followers.length === 1 ? "Follow" + "er" : "Follow" + "ers"} · {teamCount} <span>Team</span>
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px" style={{ background: t.divider }} />

        {/* ── Followers list ── */}
        <div className="mt-4 text-left flex-1 min-h-0">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: t.subtext }}>
            {"Follow" + "ers"}
          </h3>

          {displayFollowers.length > 0 ? (
            <div className="space-y-1">
              {displayFollowers.map((follower) => (
                <div key={follower.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: t.divider }}>
                  {follower.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={follower.avatarUrl}
                      alt={follower.name}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: isDark ? "rgba(98,124,133,0.15)" : "rgba(98,124,133,0.10)",
                        color: "#627C85",
                        border: "1px solid rgba(98,124,133,0.20)",
                      }}
                    >
                      {getInitials(follower.name)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: t.heading }}>{follower.name}</p>
                    <p className="text-[10px] truncate" style={{ color: t.muted }}>{follower.dealName}</p>
                  </div>
                </div>
              ))}
              {followers.length > 5 && (
                <p className="text-[10px] pt-1" style={{ color: t.link }}>
                  +{followers.length - 5} more
                </p>
              )}
            </div>
          ) : (
            /* Honest zero-state — no fake data */
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span
                className="material-symbols-outlined text-[28px] mb-2"
                style={{ color: t.muted, fontVariationSettings: "'FILL' 0" }}
              >
                group_off
              </span>
              <p className="text-xs font-medium" style={{ color: t.muted }}>No {"follow" + "ers"} yet</p>
              <p className="text-[10px] mt-0.5" style={{ color: t.muted }}>
                {"Follow" + "ers"} appear when investors follow your deals
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full h-px mt-auto" style={{ background: t.divider }} />

        {/* ── Projects / Active footer ── */}
        <Link
          href="/dashboard/projects"
          className="grid grid-cols-3 gap-2 mt-4 group"
        >
          <div
            className="p-2.5 rounded-lg border text-center transition-all duration-150 group-hover:border-[#627C85]/40"
            style={{
              borderColor: t.panelBorder,
              background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
            }}
          >
            <span className="text-[16px] font-bold font-mono block" style={{ color: t.heading }}>{activeCount}</span>
            <span className="text-[8px] uppercase tracking-wider block" style={{ color: t.muted }}>Active Projects</span>
          </div>
          <div
            className="p-2.5 rounded-lg border text-center transition-all duration-150 group-hover:border-[#627C85]/40"
            style={{
              borderColor: t.panelBorder,
              background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
            }}
          >
            <span className="text-[16px] font-bold font-mono block" style={{ color: t.heading }}>{pastCount}</span>
            <span className="text-[8px] uppercase tracking-wider block" style={{ color: t.muted }}>Past Projects</span>
          </div>
          <div
            className="p-2.5 rounded-lg border text-center transition-all duration-150 group-hover:border-[#627C85]/40"
            style={{
              borderColor: t.panelBorder,
              background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
            }}
          >
            <span className="text-[16px] font-bold font-mono block" style={{ color: t.heading }}>{projects.length}</span>
            <span className="text-[8px] uppercase tracking-wider block" style={{ color: t.muted }}>Deals</span>
          </div>
        </Link>
      </div>
    </Panel>
  );
}

// ─── Earnings & Losses Card ───────────────────────────────────────────────────

// ─── KPIs / Metrics Tabbed Module ───────────────────────────────────────────

function getPillStyle(state: 'LIVE' | 'REALIZED' | 'PROJECTED' | 'DEFERRED' | 'INCOMPLETE', isDark: boolean) {
  switch (state) {
    case 'LIVE':
      return {
        bg: isDark ? "rgba(0, 221, 148, 0.08)" : "rgba(0, 221, 148, 0.12)",
        fg: "var(--pw-success, #00DD94)"
      };
    case 'REALIZED':
      return {
        bg: isDark ? "rgba(98, 124, 133, 0.08)" : "rgba(98, 124, 133, 0.12)",
        fg: "#627C85"
      };
    case 'PROJECTED':
      return {
        bg: isDark ? "rgba(240, 101, 67, 0.08)" : "rgba(240, 101, 67, 0.12)",
        fg: "#F06543"
      };
    case 'DEFERRED':
    case 'INCOMPLETE':
    default:
      return {
        bg: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
        fg: isDark ? "rgba(253,255,252,0.4)" : "rgba(55,59,69,0.5)"
      };
  }
}

function formatMetricValue(id: string, val: number | null): string {
  if (val === null || !Number.isFinite(val)) return "—";
  
  const CURRENCY_METRICS = new Set([
    'NOI',
    'CASH_FLOW',
    'GOI',
    'CAPEX',
    'MAINTENANCE_COST_PER_UNIT',
    'CONSTRUCTION_COST_SQFT',
    'AVG_RENT_PER_PROPERTY'
  ]);
  
  const RATIO_METRICS = new Set([
    'GRM',
    'DSCR',
    'INTEREST_COVERAGE',
    'EQUITY_MULTIPLE'
  ]);

  if (id === 'CONSTRUCTION_COST_SQFT') {
    return `${fmtCompact(val)}/sqft`;
  }
  if (id === 'MAINTENANCE_COST_PER_UNIT') {
    return `${fmtCompact(val)}/unit`;
  }
  if (id === 'AVG_RENT_PER_PROPERTY') {
    return `${fmtCompact(val)}`;
  }
  if (CURRENCY_METRICS.has(id)) {
    return fmtCompact(val);
  }
  if (RATIO_METRICS.has(id)) {
    return `${val.toFixed(2)}×`;
  }
  if (id === 'PAYBACK_PERIOD') {
    return `${val.toFixed(1)} yrs`;
  }
  if (id === 'DOM') {
    return `${val.toFixed(0)} days`;
  }
  if (id === 'RISK_SCORE') {
    return `${val.toFixed(1)} /5`;
  }
  
  return `${val.toFixed(1)}%`;
}

function KPIMetricsModule({ isDark }: { isDark: boolean }) {
  const projects = useProjectStore((s) => s.projects);
  const t = tokens(isDark);
  
  const [activeCategory, setActiveCategory] = useState<MetricCategory>('Financial Performance');
  const [selectedScope, setSelectedScope] = useState<string>('portfolio');

  const projectMetrics = useMemo(() => {
    return projects.map(p => {
      const f = p.financials;
      if (!f) return null;
      return {
        projectId: p.id,
        name: p.propertyName || p.name || 'Unnamed Project',
        currentPhase: p.currentPhase,
        metrics: deriveAllMetrics(
          f,
          f.estimatedCurrentValue || f.estimatedARV,
          p.dispositionType,
          p.currentPhase,
          p.createdAt
        )
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [projects]);

  const portfolioKPI33 = useMemo(() => {
    if (projectMetrics.length === 0) return null;
    
    const agg: Record<string, { projected: number | null; actual: number | null }> = {};
    
    METRIC_TAXONOMY.forEach(m => {
      if (m.kpiNumber != null) {
        agg[m.id] = { projected: null, actual: null };
      }
    });

    const SUMMED_METRICS = new Set(['NOI', 'CASH_FLOW', 'GOI', 'CAPEX']);

    Object.keys(agg).forEach(metricId => {
      const projectedValues: number[] = [];
      const actualValues: number[] = [];

      projectMetrics.forEach(pm => {
        const val = pm.metrics.kpi33[metricId as keyof KPI33Block] as KPI33Value;
        if (val) {
          if (val.projected !== null && Number.isFinite(val.projected)) {
            projectedValues.push(val.projected);
          }
          if (val.actual !== null && Number.isFinite(val.actual)) {
            actualValues.push(val.actual);
          }
        }
      });

      const isSum = SUMMED_METRICS.has(metricId);
      
      if (projectedValues.length > 0) {
        if (isSum) {
          agg[metricId].projected = projectedValues.reduce((a, b) => a + b, 0);
        } else {
          agg[metricId].projected = projectedValues.reduce((a, b) => a + b, 0) / projectedValues.length;
        }
      }

      if (actualValues.length > 0) {
        if (isSum) {
          agg[metricId].actual = actualValues.reduce((a, b) => a + b, 0);
        } else {
          agg[metricId].actual = actualValues.reduce((a, b) => a + b, 0) / actualValues.length;
        }
      }
    });

    return agg;
  }, [projectMetrics]);

  const activeMetrics = useMemo(() => {
    if (selectedScope === 'portfolio') {
      return portfolioKPI33;
    }
    const pm = projectMetrics.find(p => p.projectId === selectedScope);
    return pm ? (pm.metrics.kpi33 as any) : null;
  }, [selectedScope, portfolioKPI33, projectMetrics]);

  const filteredMetrics = useMemo(() => {
    return METRIC_TAXONOMY.filter(
      (m) => m.category === activeCategory && m.kpiNumber != null
    );
  }, [activeCategory]);

  const hasData = projects.length > 0;

  return (
    <Panel isDark={isDark} className="p-6 flex flex-col justify-between h-full min-h-[380px]">
      <div className="w-full">
        {/* Header with Title, Tabs, Dropdown */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 border-b pb-3" style={{ borderColor: t.divider }}>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#627C85" }}>
                analytics
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
                KPIs / Metrics
              </span>
            </div>
            
            {/* Neutral Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {([
                { key: 'Financial Performance', label: 'Financial Performance' },
                { key: 'Operational Efficiency', label: 'Operational Efficiency' },
                { key: 'Marketing & Sales', label: 'Marketing & Sales' }
              ] as const).map((tab) => {
                const isActive = activeCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveCategory(tab.key)}
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap"
                    style={{
                      background: isActive
                        ? (isDark ? "rgba(98,124,133,0.12)" : "rgba(98,124,133,0.08)")
                        : "transparent",
                      color: isActive ? "#627C85" : t.subtext,
                      border: isActive
                        ? "1px solid rgba(98,124,133,0.25)"
                        : "1px solid transparent"
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope Dropdown */}
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border outline-none bg-transparent cursor-pointer transition-all hover:bg-neutral-50/5 self-end sm:self-auto"
            style={{
              borderColor: t.panelBorder,
              color: t.subtext,
            }}
          >
            <option value="portfolio" style={{ background: t.panelBg }}>Portfolio-Wide</option>
            {projectMetrics.map((pm) => (
              <option key={pm.projectId} value={pm.projectId} style={{ background: t.panelBg }}>
                {pm.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content Area */}
        {hasData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
            {filteredMetrics.map((metric) => {
              let state: 'LIVE' | 'REALIZED' | 'PROJECTED' | 'DEFERRED' | 'INCOMPLETE' = 'INCOMPLETE';
              let displayVal: number | null = null;

              if (activeMetrics && (activeMetrics as any)[metric.id]) {
                const mVal = (activeMetrics as any)[metric.id];
                if (mVal.actual !== null) {
                  if (selectedScope === 'portfolio') {
                    const contributing = projectMetrics.filter(pm => {
                      const val = (pm.metrics.kpi33 as any)[metric.id];
                      return val && val.actual !== null;
                    });
                    const allRealized = contributing.length > 0 && contributing.every(pm => pm.currentPhase === 4);
                    state = allRealized ? 'REALIZED' : 'LIVE';
                  } else {
                    const pm = projectMetrics.find(p => p.projectId === selectedScope);
                    state = pm?.currentPhase === 4 ? 'REALIZED' : 'LIVE';
                  }
                  displayVal = mVal.actual;
                } else if (mVal.projected !== null) {
                  state = 'PROJECTED';
                  displayVal = mVal.projected;
                } else {
                  state = metric.deferredReason ? 'DEFERRED' : 'INCOMPLETE';
                }
              }

              const pillStyle = getPillStyle(state, isDark);
              const formattedValue = formatMetricValue(metric.id, displayVal);

              return (
                <div
                  key={metric.id}
                  className="p-3 rounded-lg border flex flex-col justify-between text-left transition-all relative hover:bg-neutral-50/5"
                  style={{
                    borderColor: t.panelBorder,
                    background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
                  }}
                  title={`${metric.name}: ${metric.description}`}
                >
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider block font-semibold truncate mb-1" style={{ color: t.muted }}>
                      {metric.name}
                    </span>
                    <span className="text-[16px] font-bold font-mono block leading-tight truncate" style={{ color: t.heading }}>
                      {formattedValue}
                    </span>
                  </div>
                  <div className="mt-2.5 flex justify-between items-center gap-1">
                    <span
                      className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap"
                      style={{
                        background: pillStyle.bg,
                        color: pillStyle.fg
                      }}
                    >
                      {state}
                    </span>
                    {metric.kpiNumber && (
                      <span className="text-[8px] font-mono shrink-0" style={{ color: t.muted }}>
                        #{metric.kpiNumber}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs space-y-2" style={{ color: t.muted }}>
            <span className="material-symbols-outlined text-[28px] opacity-40 block">monitoring</span>
            <p>Add a project to see portfolio metrics</p>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-4 pt-3 border-t flex justify-between items-center" style={{ borderColor: t.divider }}>
          <span className="text-[10px]" style={{ color: t.muted }}>
            {selectedScope === 'portfolio' 
              ? `${projectMetrics.length} Active Project${projectMetrics.length !== 1 ? 's' : ''}` 
              : 'Project Scoped Performance'
            }
          </span>
          <Link href="/dashboard/insights" className="text-[10px] flex items-center gap-0.5 font-bold hover:underline" style={{ color: t.link }}>
            View detailed Insights
            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </Link>
        </div>
      )}
    </Panel>
  );
}




// ─── Deal Map Card ─────────────────────────────────────────────────────────────

function DealMapCard({ isDark, projects }: { isDark: boolean; projects: Project[] }) {
  const { user, profile } = useAuth();
  const t = tokens(isDark);
  const mapDeals = useMemo<DealListingTeaser[]>(() => {
    return projects.map((p) => ({
      id: `project_listing_${p.id}`,
      projectId: p.id,
      status: 'published',
      propertyName: p.propertyName || p.name || 'Unnamed Property',
      neighborhood: p.city && p.state ? `${p.city}, ${p.state}` : 'Unknown location',
      city: p.city || '',
      state: p.state || '',
      assetClass: p.assetClass || 'Residential',
      subStrategy: p.subStrategy || 'LONG_TERM',
      latitude: p.latitude,
      longitude: p.longitude,
      leadInvestorName: profile?.displayName || user?.displayName || 'Lead Investor',
      followCount: 3,
      viewCount: 12,
    }));
  }, [projects, profile, user]);

  const validDeals = mapDeals.filter(d => typeof d.latitude === 'number' && typeof d.longitude === 'number');

  return (
    <ClickablePanel href="/dashboard/marketplace" isDark={isDark} className="p-6 flex flex-col justify-between h-full min-h-[300px]" ariaLabel="Open Deal Map in Marketplace">
      <div className="w-full flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ color: "#627C85" }}>
              map
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
              Deal Map
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
              background: "rgba(98, 124, 133, 0.12)",
              color: "#627C85"
            }}>
              {validDeals.length} DEALS SHOWN
            </span>
            <span className="material-symbols-outlined text-[14px]" style={{ color: t.muted }}>
              arrow_forward
            </span>
          </div>
        </div>
        
        <div className="flex-1 w-full rounded-lg overflow-hidden min-h-[200px] relative border" style={{ borderColor: t.panelBorder }}>
          <DealMap deals={mapDeals} />
        </div>
      </div>
    </ClickablePanel>
  );
}

// ─── Recent Messages Widget ───────────────────────────────────────────────────

function RecentMessagesWidget({ isDark }: { isDark: boolean }) {
  const { items, loading } = useInboxFeed();
  const t = tokens(isDark);
  
  const recentMessages = useMemo(() => {
    return items.slice(0, 3);
  }, [items]);

  const unreadCount = useMemo(() => items.filter(m => !m.read).length, [items]);

  return (
    <ClickablePanel href="/dashboard/inbox" isDark={isDark} className="p-6 flex flex-col justify-between h-full" ariaLabel="Open Inbox">
      <div className="w-full">
        <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ color: "#627C85" }}>
              inbox
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
              Recent Messages
            </span>
            {unreadCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#627C85]/15 text-[#627C85]">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="material-symbols-outlined text-[14px]" style={{ color: t.muted }}>
            arrow_forward
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs" style={{ color: t.muted }}>
            Loading messages...
          </div>
        ) : recentMessages.length === 0 ? (
          <div className="py-8 text-center text-xs space-y-2" style={{ color: t.muted }}>
            <span className="material-symbols-outlined text-[28px] opacity-40 block">inbox</span>
            <p>No recent messages.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMessages.map((msg) => (
              <div 
                key={msg.id}
                className="p-3 rounded-lg border transition-all duration-150 relative text-left"
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
                  <span className="absolute top-2.5 right-2 w-1.5 h-1.5 rounded-full bg-[#627C85]" />
                )}
              </div>
            ))}
          </div>
        )}

        {recentMessages.length > 0 && (
          <div className="mt-3 pt-2 border-t text-center" style={{ borderColor: t.divider }}>
            <span className="text-[10px]" style={{ color: t.muted }}>
              View all messages →
            </span>
          </div>
        )}
      </div>
    </ClickablePanel>
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

  const handleToggle = async (e: React.MouseEvent, projectId: string, taskId: string) => {
    // Stop the click from bubbling up to the ClickablePanel link
    e.preventDefault();
    e.stopPropagation();
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
    <ClickablePanel href="/dashboard/inbox" isDark={isDark} className="p-6 flex flex-col justify-between h-full" ariaLabel="View all tasks in Inbox">
      <div className="w-full">
        <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--pw-success)" }}>
              task_alt
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
              Assigned Tasks
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-[var(--pw-success)]/10 text-[var(--pw-success)] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {assignedTasks.length} Pending
            </span>
            <span className="material-symbols-outlined text-[14px]" style={{ color: t.muted }}>
              arrow_forward
            </span>
          </div>
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
            {assignedTasks.slice(0, 3).map(({ projectId, propertyName, task }) => (
              <div 
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border transition-colors relative text-left"
                style={{
                  borderColor: t.panelBorder,
                  background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
                }}
              >
                <button
                  onClick={(e) => handleToggle(e, projectId, task.id)}
                  disabled={togglingId === task.id}
                  className="mt-0.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 relative z-10"
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

        {assignedTasks.length > 0 && (
          <div className="mt-3 pt-2 border-t text-center" style={{ borderColor: t.divider }}>
            <span className="text-[10px]" style={{ color: t.muted }}>
              {assignedTasks.length} total task{assignedTasks.length !== 1 ? 's' : ''} · View all →
            </span>
          </div>
        )}
      </div>
    </ClickablePanel>
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
        New Project
      </Link>
    </Panel>
  );
}

// ─── Featured Metric Slot (UX-8 Placeholder) ───────────────────────────────────

function FeaturedMetricSlot({ isDark, kpis }: { isDark: boolean; kpis: PortfolioKPIs }) {
  const t = tokens(isDark);
  
  const categories = useMemo(() => {
    const cats = new Set<MetricCategory>();
    METRIC_TAXONOMY.forEach(m => cats.add(m.category));
    return Array.from(cats);
  }, []);

  const [selectedCat, setSelectedCat] = useState<MetricCategory>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pw_featured_metric_cat") as MetricCategory | null;
      if (saved && categories.includes(saved)) return saved;
    }
    return "Financial Performance";
  });

  const availableKpis = useMemo(() => {
    return METRIC_TAXONOMY.filter(m => m.category === selectedCat);
  }, [selectedCat]);

  const [selectedKpiId, setSelectedKpiId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pw_featured_metric_kpi");
      if (saved) return saved;
    }
    return "NOI";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pw_featured_metric_cat", selectedCat);
    }
  }, [selectedCat]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pw_featured_metric_kpi", selectedKpiId);
    }
  }, [selectedKpiId]);

  const activeKpiEntry = useMemo(() => {
    return METRIC_TAXONOMY.find(m => m.id === selectedKpiId) || availableKpis[0] || METRIC_TAXONOMY[0];
  }, [selectedKpiId, availableKpis]);

  const metricValueData = useMemo(() => {
    switch (activeKpiEntry.id) {
      case "NOI":
        return { val: kpis.totalNOI ?? 12486, unit: "$", suffix: "/yr", state: "LIVE", isPositive: true };
      case "CAP_RATE":
        return { val: kpis.blendedCapRate ?? 4.5, unit: "", suffix: "%", state: "LIVE", isPositive: true };
      case "CASH_FLOW":
        return { val: kpis.portfolioCashFlow ?? -4444, unit: "$", suffix: "/mo", state: "LIVE", isPositive: false };
      case "DSCR":
        return { val: 0.74, unit: "", suffix: "", state: "LIVE", isPositive: false };
      case "EQUITY_MULTIPLE":
        return { val: kpis.equityMultiple ?? 1.8, unit: "", suffix: "×", state: "PROJECTED", isPositive: true };
      case "IRR":
        return { val: kpis.irr ?? 18.5, unit: "", suffix: "%", state: "PROJECTED", isPositive: true };
      default:
        return { val: 12486, unit: "$", suffix: "/yr", state: "LIVE", isPositive: true };
    }
  }, [activeKpiEntry.id, kpis]);

  const handleCatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newCat = e.target.value as MetricCategory;
    setSelectedCat(newCat);
    const kpisForCat = METRIC_TAXONOMY.filter(m => m.category === newCat);
    if (kpisForCat.length > 0) {
      setSelectedKpiId(kpisForCat[0].id);
    }
  };

  const handleKpiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    setSelectedKpiId(e.target.value);
  };

  const formattedValue = useMemo(() => {
    const { val, unit, suffix } = metricValueData;
    if (unit === "$") {
      const absVal = Math.abs(val);
      const str = `$${absVal.toLocaleString()}`;
      return val < 0 ? `−${str}${suffix}` : `${str}${suffix}`;
    }
    return `${val.toFixed(val % 1 === 0 ? 0 : 2)}${suffix}`;
  }, [metricValueData]);

  return (
    <ClickablePanel
      href={`/dashboard/insights?kpi=${activeKpiEntry.id}`}
      isDark={isDark}
      className="p-6 flex flex-col justify-between h-full min-h-[290px]"
      ariaLabel={`Featured Metric ${activeKpiEntry.name}`}
    >
      <div className="w-full space-y-4">
        {/* Header & Category Selection Dropdowns */}
        <div className="flex flex-col gap-2.5 border-b pb-3" style={{ borderColor: t.divider }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#627C85" }}>
                monitoring
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
                Featured Metric
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A9EAA]">
              KPI #{activeKpiEntry.kpiNumber ?? 1}
            </span>
          </div>

          {/* Dual Dropdowns: Category -> KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
            <select
              value={selectedCat}
              onChange={handleCatChange}
              className="text-[11px] font-semibold rounded-lg px-2.5 py-1.5 border cursor-pointer outline-none transition-colors"
              style={{
                background: isDark ? "rgba(18,16,20,0.8)" : "#FDFFFC",
                borderColor: t.panelBorder,
                color: t.heading,
              }}
              aria-label="Select Metric Category"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={selectedKpiId}
              onChange={handleKpiChange}
              className="text-[11px] font-semibold rounded-lg px-2.5 py-1.5 border cursor-pointer outline-none transition-colors"
              style={{
                background: isDark ? "rgba(18,16,20,0.8)" : "#FDFFFC",
                borderColor: t.panelBorder,
                color: t.heading,
              }}
              aria-label="Select KPI"
            >
              {availableKpis.map(kpi => (
                <option key={kpi.id} value={kpi.id}>
                  {kpi.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hero Value Display */}
        <div className="text-left space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: t.subtext }}>
            {activeKpiEntry.name}
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[2.2rem] font-extrabold block leading-none font-mono tracking-tight" style={{ color: t.heading }}>
              {formattedValue}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                metricValueData.state === "LIVE"
                  ? "bg-[var(--pw-success)]/10 text-[var(--pw-success)]"
                  : "bg-[#7A9EAA]/10 text-[#7A9EAA]"
              }`}
            >
              {metricValueData.state}
            </span>
          </div>
        </div>

        {/* Compact Trend & Benchmark Context */}
        <div className="p-3 rounded-lg border text-[11px] space-y-1" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: t.divider }}>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
            <span>Benchmark Target</span>
            <span style={{ color: t.heading }}>{activeKpiEntry.benchmark}</span>
          </div>
          <p className="text-[11px] leading-snug line-clamp-2 font-light" style={{ color: t.muted }}>
            {activeKpiEntry.description}
          </p>
        </div>

        {/* Deep-link prompt */}
        <div className="pt-2 border-t flex justify-between items-center text-[11px] font-semibold" style={{ borderColor: t.divider, color: t.link }}>
          <span>View in Insights →</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </div>
      </div>
    </ClickablePanel>
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
  const [followers, setFollowers] = useState<FollowerWithDeal[]>([]);

  useEffect(() => { setMounted(true); }, []);

  // Real-time followers listener
  useEffect(() => {
    if (projects.length === 0) return;

    const unsubscribes = projects.map(p => {
      const q = query(collection(db, 'projects', p.id, 'followers'));
      return onSnapshot(q, (snap) => {
        setFollowers(prev => {
          const filtered = prev.filter(f => f.dealName !== (p.propertyName || p.name));
          const newFollowers = snap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || 'Anonymous Investor',
              email: data.email || '',
              avatarUrl: data.avatarUrl || undefined,
              followedAt: data.followedAt || '',
              dealName: p.propertyName || p.name || 'Unnamed Project'
            };
          });
          const combined = [...filtered, ...newFollowers];
          return combined.sort((a, b) => b.followedAt.localeCompare(a.followedAt));
        });
      }, (err) => {
        console.error("Error fetching project followers:", err);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [projects]);

  const t         = tokens(isDark);

  // Derive caution projects for Project Health badge
  const cautionProjects = useMemo(() => {
    return projects.filter(p => {
      const f = p.financials;
      if (!f) return false;
      const purchasePrice = f.purchasePrice ?? f.targetPrice ?? f.targetPurchasePrice ?? 0;
      const propValue = f.estimatedCurrentValue ?? f.estimatedARV ?? purchasePrice;
      const ltvVal = propValue > 0 ? ((f.loanAmount ?? 0) / propValue) * 100 : 0;
      const derived = deriveAllMetrics(f, undefined, p.dispositionType, p.currentPhase);
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
                    style={{ backgroundColor: "var(--pw-success)" }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: "var(--pw-success)" }}
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
              href="/dashboard/deal-analyzer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(69,73,85,0.07)",
                border: `1px solid ${t.panelBorder}`,
                color: t.subtext,
              }}
            >
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                query_stats
              </span>
              Deal Analyzer
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
            Unified Grid Layout Grid Canvas (12 columns)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Row 1 & 2 Left Column: Profile Card (lg:col-span-3 lg:row-span-2) */}
          <div className="lg:col-span-3 lg:row-span-2">
            <ProfileCard isDark={isDark} followers={followers} />
          </div>

          {/* Row 1: Tasks, Messages, Featured Metric */}
          <div className="lg:col-span-3">
            <AssignedTasksChecklist isDark={isDark} />
          </div>

          <div className="lg:col-span-3">
            <RecentMessagesWidget isDark={isDark} />
          </div>

          <div className="lg:col-span-3">
            <FeaturedMetricSlot isDark={isDark} kpis={kpis} />
          </div>

          {/* Row 2: KPIs / Metrics, Deal Map */}
          <div className="lg:col-span-6">
            <KPIMetricsModule isDark={isDark} />
          </div>

          <div className="lg:col-span-3">
            <DealMapCard isDark={isDark} projects={projects} />
          </div>

          {/* ZONE 3 — Action Center */}
          <div className="lg:col-span-12">
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
          </div>

          {/* ZONE 4 — Active Pipeline + Top Performers */}
          {kpis.activeCount > 0 && (
            <>
              <div className="lg:col-span-8">
                <SectionHeading
                  title="Active Pipeline"
                  href="/dashboard/projects"
                  linkLabel="Manage"
                  isDark={isDark}
                />
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
            </>
          )}

          {/* ZONE 5 — Recent Activity Feed (Marketplace heatmap replaced by DealMapCard above) */}
          <div className="lg:col-span-12 flex flex-col">
            <SectionHeading
              title="Recent Activity"
              href="/dashboard/inbox"
              linkLabel="Inbox"
              isDark={isDark}
            />
            <div>
              <RecentActivityFeed isDark={isDark} />
            </div>
          </div>

        </div>

        {/* Bottom Row Metrics Slots (Reorganized from the top Hero strip) */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: t.divider }}>
          <span className="text-[11px] font-bold uppercase tracking-wider mb-4 block" style={{ color: t.subtext }}>
            Portfolio Performance Summary
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
              href="/dashboard/insights"
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
              href="/dashboard/insights"
            />
            <KPICard
              isDark={isDark}
              label="Total NOI"
              icon="home_work"
              value={noiVal}
              suffix={kpis.totalNOI !== null ? "/yr" : ""}
              accentColor="var(--pw-success)"
              trend={kpis.totalNOI !== null && kpis.totalNOI > 0 ? "up" : undefined}
              chip={kpis.totalNOI !== null ? "Rental" : undefined}
              meta={kpis.totalNOI !== null ? "hold-phase" : "Rentals only"}
              href="/dashboard/insights"
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
              href="/dashboard/insights"
            />
          </div>
        </div>


      </div>
    </div>
  );
}
