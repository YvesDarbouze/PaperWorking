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
} from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";
import type { DealListingTeaser } from "@/types/listing";

const InsightsTab = dynamic(() => import("@/components/portfolio/InsightsTab"), { ssr: false });
const DealMap = dynamic(() => import("@/components/marketplace/DealMap"), { ssr: false });

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
        p.dispositionType,
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

  const activeCount = projects.filter(p => p.status !== 'Sold').length;

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
    <Panel isDark={isDark} className="flex flex-col relative min-h-[520px]">
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
                {followers.length} {followers.length === 1 ? "Follower" : "Followers"} · {teamCount} {teamCount === 1 ? "Team Member" : "Investment Team"}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px" style={{ background: t.divider }} />

        {/* ── Followers list ── */}
        <div className="mt-4 text-left flex-1 min-h-0">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: t.subtext }}>
            Followers
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
              <p className="text-xs font-medium" style={{ color: t.muted }}>No followers yet</p>
              <p className="text-[10px] mt-0.5" style={{ color: t.muted }}>
                Followers appear when investors follow your deals
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full h-px mt-auto" style={{ background: t.divider }} />

        {/* ── Projects / Active footer ── */}
        <Link
          href="/dashboard/projects"
          className="grid grid-cols-2 gap-4 mt-4 group"
        >
          <div
            className="p-3 rounded-lg border text-center transition-all duration-150 group-hover:border-[#627C85]/40"
            style={{
              borderColor: t.panelBorder,
              background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
            }}
          >
            <span className="text-[18px] font-bold font-mono block" style={{ color: t.heading }}>{activeCount}</span>
            <span className="text-[9px] uppercase tracking-wider block" style={{ color: t.muted }}>Active</span>
          </div>
          <div
            className="p-3 rounded-lg border text-center transition-all duration-150 group-hover:border-[#627C85]/40"
            style={{
              borderColor: t.panelBorder,
              background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
            }}
          >
            <span className="text-[18px] font-bold font-mono block" style={{ color: t.heading }}>{projects.length}</span>
            <span className="text-[9px] uppercase tracking-wider block" style={{ color: t.muted }}>Projects</span>
          </div>
        </Link>
      </div>
    </Panel>
  );
}

// ─── Earnings & Losses Card ───────────────────────────────────────────────────

function EarningsLossesCard({ isDark, kpis, followersCount }: { isDark: boolean; kpis: PortfolioKPIs; followersCount: number }) {
  const projects = useProjectStore((s) => s.projects);
  const t = tokens(isDark);
  const [activeTab, setActiveTab] = useState<"financial" | "operational" | "marketing">("financial");
  const [period, setPeriod] = useState<string>("all");

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

  // Operational stats
  const underContract = projects.filter(p => p.status === 'Under Contract').length;
  const renovating = projects.filter(p => p.status === 'Renovating' || p.status === 'Active').length;
  const listed = projects.filter(p => p.status === 'Listed').length;
  const sold = projects.filter(p => p.status === 'Sold').length;

  return (
    <Panel isDark={isDark} className="p-6 flex flex-col justify-between h-full min-h-[300px]">
      <div className="w-full flex-1 flex flex-col justify-between">
        <div>
          {/* Header containing Title & Dropdown */}
          <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: t.divider }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#627C85" }}>
                analytics
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
                KPIs / Metrics
              </span>
            </div>

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-[11px] font-semibold bg-[#18191D] border border-white/10 rounded-md px-2 py-1 outline-none text-[#FDFFFC] cursor-pointer hover:border-[#627C85] transition-colors"
            >
              <option value="30">Last 30 Days</option>
              <option value="qtd">Quarter to Date</option>
              <option value="ytd">Year to Date</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Tabs Control */}
          <div className="flex gap-4 border-b pb-2 mb-4" style={{ borderColor: t.divider }}>
            <button
              onClick={() => setActiveTab("financial")}
              className={`text-xs font-bold pb-1 cursor-pointer transition-colors relative ${activeTab === "financial" ? "text-[#FDFFFC]" : "text-[#9E9DA0] hover:text-[#FDFFFC]"}`}
            >
              Financial Performance
              {activeTab === "financial" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#627C85]" />}
            </button>
            <button
              onClick={() => setActiveTab("operational")}
              className={`text-xs font-bold pb-1 cursor-pointer transition-colors relative ${activeTab === "operational" ? "text-[#FDFFFC]" : "text-[#9E9DA0] hover:text-[#FDFFFC]"}`}
            >
              Operational Efficiency
              {activeTab === "operational" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#627C85]" />}
            </button>
            <button
              onClick={() => setActiveTab("marketing")}
              className={`text-xs font-bold pb-1 cursor-pointer transition-colors relative ${activeTab === "marketing" ? "text-[#FDFFFC]" : "text-[#9E9DA0] hover:text-[#FDFFFC]"}`}
            >
              Marketing
              {activeTab === "marketing" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#627C85]" />}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col justify-center min-h-[120px]">
            {activeTab === "financial" && (
              <div className="space-y-4 text-left">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-left block" style={{ color: t.muted }}>Total Portfolio Value</span>
                  <span className="text-[2.2rem] font-bold block leading-tight font-mono text-left text-[#FDFFFC]">
                    {fmtCompact(totalValue)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-left block" style={{ color: t.muted }}>Capital Invested</span>
                    <span className="text-[16px] font-bold font-mono text-left block text-[#FDFFFC]">
                      {fmtCompact(totalCapital)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-left block" style={{ color: t.muted }}>Net Equity Profit</span>
                    <span className="text-[16px] font-bold font-mono text-left block" style={{ color: isLoss ? "var(--color-error)" : "var(--color-positive)" }}>
                      {isLoss ? "-" : "+"}{profitVal}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "operational" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                  <span className="block text-[20px] font-bold font-mono text-[#FDFFFC]">{underContract}</span>
                  <span className="text-[9px] uppercase tracking-wider block text-[#9E9DA0]">Under Contract</span>
                </div>
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                  <span className="block text-[20px] font-bold font-mono text-[#FDFFFC]">{renovating}</span>
                  <span className="text-[9px] uppercase tracking-wider block text-[#9E9DA0]">Renovating</span>
                </div>
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                  <span className="block text-[20px] font-bold font-mono text-[#FDFFFC]">{listed}</span>
                  <span className="text-[9px] uppercase tracking-wider block text-[#9E9DA0]">Listed / Active</span>
                </div>
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                  <span className="block text-[20px] font-bold font-mono text-[#FDFFFC]">{sold}</span>
                  <span className="text-[9px] uppercase tracking-wider block text-[#9E9DA0]">Sold / Completed</span>
                </div>
              </div>
            )}

            {activeTab === "marketing" && (
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01]">
                  <span className="block text-[22px] font-bold font-mono text-[#FDFFFC]">{listed}</span>
                  <span className="text-[10px] uppercase tracking-wider block text-[#9E9DA0]">Marketplace Listings</span>
                </div>
                <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01]">
                  <span className="block text-[22px] font-bold font-mono text-[#FDFFFC]">
                    {followersCount || 5}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider block text-[#9E9DA0]">Total Deal Followers</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer (only visible when in financial tab to align with wireframe content padding) */}
        {activeTab === "financial" && (
          <div className="mt-6 pt-4 border-t flex items-center justify-between" style={{ borderColor: t.divider }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: t.muted }}>Equity Growth ROI</span>
              {roiPct !== null && (
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full" style={{
                  background: isLoss ? "rgba(240, 101, 67, 0.12)" : "rgba(0, 221, 148, 0.12)",
                  color: isLoss ? "var(--color-error)" : "var(--color-positive)"
                }}>
                  {roiPct.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: t.muted }}>Blended IRR</span>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full" style={{
                background: "rgba(98, 124, 133, 0.12)",
                color: "#627C85"
              }}>
                {kpis.irr !== null ? `${kpis.irr.toFixed(1)}%` : "—"}
              </span>
            </div>
          </div>
        )}
      </div>
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
    <Panel isDark={isDark} className="p-6 flex flex-col justify-between h-full min-h-[300px]">
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
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
            background: "rgba(98, 124, 133, 0.12)",
            color: "#627C85"
          }}>
            {validDeals.length} DEALS SHOWN
          </span>
        </div>
        
        <div className="flex-1 w-full rounded-lg overflow-hidden min-h-[200px] relative border" style={{ borderColor: t.panelBorder }}>
          <DealMap deals={mapDeals} />
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
            <span className="material-symbols-outlined text-[18px]" style={{ color: "#627C85" }}>
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
                className="block p-3 rounded-lg border transition-all duration-150 hover:border-[#627C85]/50 relative group text-left"
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
            <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--pw-success)" }}>
              task_alt
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
              Assigned Tasks
            </span>
          </div>
          <span className="text-[10px] font-mono bg-[var(--pw-success)]/10 text-[var(--pw-success)] px-2 py-0.5 rounded-full uppercase tracking-wider">
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
        Create Project
      </Link>
    </Panel>
  );
}

// ─── Featured Metric Slot (UX-8 Placeholder) ───────────────────────────────────

function FeaturedMetricSlot({ isDark }: { isDark: boolean }) {
  const t = tokens(isDark);
  return (
    <Panel isDark={isDark} className="p-6 flex flex-col justify-between h-full">
      <div className="w-full">
        <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ color: t.muted }}>
              monitoring
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.subtext }}>
              Featured Metric
            </span>
          </div>
          <span className="text-[10px] font-mono bg-white/5 text-white/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
            UX-8 Region
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: `1px solid ${t.panelBorder}` }}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: t.muted }}>
              pending_actions
            </span>
          </div>
          <h4 className="text-[13px] font-semibold mb-1" style={{ color: t.heading }}>
            Yield Performance Index
          </h4>
          <p className="text-[11px] leading-relaxed max-w-[220px]" style={{ color: t.subtext }}>
            Reserved for live portfolio yield distribution & market pricing trends.
          </p>
        </div>
      </div>
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
              Create Project
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
            <FeaturedMetricSlot isDark={isDark} />
          </div>

          {/* Row 2: KPIs / Metrics, Deal Map */}
          <div className="lg:col-span-6">
            <EarningsLossesCard isDark={isDark} kpis={kpis} followersCount={followers.length} />
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
