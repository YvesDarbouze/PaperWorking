'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Button, { type ButtonVariant } from '@/components/ui/Button';
import { bffFetch } from '@/lib/api/bff-fetch';
import {
  ACTIVE_PROJECT_PROGRESS,
  ASSIGNED_TASKS,
  ATTENTION_ITEMS,
  OPERATIONAL_ALERTS,
  PHASE_LEGEND,
  PIPELINE_SNAPSHOT,
  PORTFOLIO_SUMMARY,
  PROFILE_CARD,
  RECENT_ACTIVITY,
  RECENT_MESSAGES,
  TOP_PERFORMERS,
} from '@/lib/dashboard/content';
import { listSeedProjectSummaries } from '@/lib/projects/seed-data';

const panel =
  'rounded-2xl border border-white/10 bg-[#121014]/90 shadow-[0_8px_32px_rgba(0,0,0,0.12)]';

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1000)}K`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-white/55">{title}</h3>
      {href && linkLabel ? (
        <Link href={href} className="text-[11px] font-semibold text-[#7A9EAA] no-underline hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

interface PortfolioMetricsPayload {
  success?: boolean;
  portfolio?: {
    totalActiveProjects?: number;
    totalPortfolioValue?: number;
    totalCashInvested?: number;
    portfolioNoi?: number;
    portfolioCashFlow?: number;
    portfolioCapRate?: number;
  };
}

interface MarketplaceProfilePayload {
  profile?: {
    displayName?: string;
    publicBio?: string;
    location?: string;
    followerCount?: number;
  };
}

export interface CommandCenterSummary {
  activeDeals?: number;
  capitalDeployed?: string;
  portfolioIrr?: string;
  portfolioCapRate?: string;
  equityMultiple?: string;
  totalNoi?: string;
  monthlyCashFlow?: string;
  needsAttention?: number;
  portfolioValue?: string;
  sparklineGrowth?: string;
}

export interface CommandCenterPanelProps {
  initialSummary?: Partial<CommandCenterSummary>;
  initialTasks?: ReadonlyArray<(typeof ASSIGNED_TASKS)[number]>;
  initialMessages?: ReadonlyArray<(typeof RECENT_MESSAGES)[number]>;
  initialProjects?: ReturnType<typeof listSeedProjectSummaries>;
  initialAlerts?: ReadonlyArray<(typeof OPERATIONAL_ALERTS)[number]>;
  initialFollowers?: ReadonlyArray<(typeof PROFILE_CARD['followerPreview'])[number]>;
}

export default function CommandCenterPanel({
  initialSummary,
  initialTasks,
  initialMessages,
  initialProjects,
  initialAlerts,
  initialFollowers,
}: CommandCenterPanelProps = {}) {
  const { profile, authenticated, loading } = useAuth();
  const [metrics, setMetrics] = useState<PortfolioMetricsPayload['portfolio'] | null>(null);
  const [mpProfile, setMpProfile] = useState<MarketplaceProfilePayload['profile'] | null>(null);

  useEffect(() => {
    if (loading || !authenticated) return;
    let cancelled = false;

    async function loadLive() {
      try {
        const [metricsRes, profileRes] = await Promise.all([
          bffFetch('/api/portfolio/metrics?period=monthly', { cache: 'no-store' }),
          bffFetch('/api/marketplace/profile', { cache: 'no-store' }),
        ]);

        if (metricsRes.ok) {
          const body = (await metricsRes.json()) as PortfolioMetricsPayload;
          if (!cancelled) setMetrics(body.portfolio ?? null);
        }
        if (profileRes.ok) {
          const body = (await profileRes.json()) as MarketplaceProfilePayload;
          if (!cancelled) setMpProfile(body.profile ?? null);
        }
      } catch {
        // Keep seed fallbacks when live adapters are unavailable.
      }
    }

    loadLive();
    return () => {
      cancelled = true;
    };
  }, [loading, authenticated]);

  const tasks = initialTasks ?? ASSIGNED_TASKS;
  const messages = initialMessages ?? RECENT_MESSAGES;
  const projects = initialProjects ?? listSeedProjectSummaries();
  const alerts = initialAlerts ?? OPERATIONAL_ALERTS;
  const followers = initialFollowers ?? PROFILE_CARD.followerPreview;

  const summary = useMemo(() => {
    const base = { ...PORTFOLIO_SUMMARY, ...initialSummary };
    if (initialSummary?.portfolioIrr !== undefined) {
      return base;
    }
    const activeDeals = metrics?.totalActiveProjects ?? base.activeDeals;
    const portfolioValue = metrics?.totalPortfolioValue
      ? formatUsd(metrics.totalPortfolioValue)
      : base.portfolioValue;
    const totalNoi = metrics?.portfolioNoi
      ? formatUsd(metrics.portfolioNoi)
      : base.totalNoi;
    const monthlyCashFlow = metrics?.portfolioCashFlow
      ? formatUsd(metrics.portfolioCashFlow)
      : base.monthlyCashFlow;
    const capitalDeployed = metrics?.totalCashInvested
      ? formatUsd(metrics.totalCashInvested)
      : base.capitalDeployed;
    const portfolioCapRate =
      metrics?.portfolioCapRate != null
        ? `${metrics.portfolioCapRate.toFixed(1)}%`
        : undefined;
    const portfolioIrr = base.portfolioIrr;

    return {
      ...base,
      activeDeals,
      portfolioValue,
      totalNoi,
      monthlyCashFlow,
      capitalDeployed,
      portfolioIrr,
      portfolioCapRate,
    };
  }, [metrics, initialSummary]);

  const hasPortfolioIrr = Boolean(
    summary.portfolioIrr &&
      /\d/.test(summary.portfolioIrr) &&
      !/^[\s\u2014\u2013\-—–]+$/.test(summary.portfolioIrr) &&
      summary.portfolioIrr !== 'N/A' &&
      summary.portfolioIrr.trim() !== ''
  );

  const displayName = mpProfile?.displayName || PROFILE_CARD.displayName;
  const roleLabel =
    profile?.accountType === 'vendor' ? 'Vendor Partner' : PROFILE_CARD.role;
  const pendingTasks = tasks.filter((task) => !task.done).length as number;
  const followerCount = mpProfile?.followerCount ?? PROFILE_CARD.followers;

  // Contextual primary resolution:
  // While auth/profile is loading or role is unresolved, both buttons render as secondary (width-stable, no CLS).
  // Once role resolves:
  // - operator/admin/team -> "Create New Project" is primary
  // - investor (or default when role is known) -> "Explore Deals" is primary
  const isReady = !loading;
  const normalizedRole = (profile?.accountType || '').toLowerCase();
  const isOperatorRole =
    normalizedRole === 'operator' || normalizedRole === 'admin' || normalizedRole === 'team';

  const exploreDealsVariant: ButtonVariant = !isReady
    ? 'secondary'
    : isOperatorRole
      ? 'secondary'
      : 'primary';

  const createProjectVariant: ButtonVariant = !isReady
    ? 'secondary'
    : isOperatorRole
      ? 'primary'
      : 'secondary';

  return (
    <div className="w-full min-h-full">
      <div className="mx-auto max-w-[1400px] space-y-7 px-5 py-6 lg:px-8 lg:py-7">
        {/* Zone 1 — Page header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <h1 className="text-[28px] font-bold leading-none tracking-[-0.03em] text-[#fdfffc]">
                Portfolio
              </h1>
              <span className="mt-0.5 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-live)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-live)]" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/45">
                  Live
                </span>
              </span>
              <Link
                href="/dashboard/insights"
                className="ml-2 flex items-center gap-1.5 rounded-full border border-[#F06543]/30 bg-[#F06543]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F06543] no-underline"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F06543] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F06543]" />
                </span>
                {summary.needsAttention} Caution
              </Link>
            </div>
            <p className="text-[13px] text-white/55">
              {summary.activeDeals} active deals across your portfolio
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              href="/dashboard/deals"
              variant="secondary"
              size="sm"
              icon={<span className="material-symbols-outlined text-[15px]">query_stats</span>}
            >
              Deal Calculator
            </Button>
            <Button
              href="/projects"
              variant="secondary"
              size="sm"
              icon={<span className="material-symbols-outlined text-[15px]">add</span>}
            >
              New Project
            </Button>
          </div>
        </header>

        {/* Quick Launch Actions: Deals Marketplace & Create new Project */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Deals Marketplace card */}
          <div
            className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[14px] border border-white/12 p-5 backdrop-blur-xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(69,73,85,0.25) 0%, rgba(18,16,20,0.85) 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#454955]/30 text-[#fdfffc]">
                <span className="material-symbols-outlined text-[24px]">search</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#fdfffc]">Deals Marketplace</h3>
                  <span className="rounded border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[var(--accent)]">
                    Exclusive
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9E9DA0]">
                  Search any street address to discover crowdfunding investments, list new syndication opportunities, or connect with investors.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button
                href="/dashboard/deals"
                variant={exploreDealsVariant}
                size="md"
                data-testid="quick-launch-explore-deals"
                icon={<span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
                iconPosition="right"
              >
                Explore Deals
              </Button>
            </div>
          </div>

          {/* Create new Project CTA card */}
          <div
            className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[14px] border border-white/12 p-5 backdrop-blur-xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(0,221,148,0.10) 0%, rgba(18,16,20,0.85) 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)] text-[var(--accent)]">
                <span className="material-symbols-outlined text-[24px]">create_new_folder</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#fdfffc]">Create new Project</h3>
                  <span className="rounded border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[var(--accent)]">
                    3-Step Flow
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9E9DA0]">
                  Launch a new project workspace, assign team members, and link property acquisition deals with automated collision check.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button
                href="/projects/new?source=dashboard"
                variant={createProjectVariant}
                size="md"
                data-testid="quick-launch-create-project"
                icon={<span className="material-symbols-outlined text-[16px]">add</span>}
                iconPosition="left"
              >
                Create new Project
              </Button>
            </div>
          </div>
        </div>

        {/* Unified 12-col grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Profile */}
          <article className={`${panel} flex flex-col justify-between p-6 lg:col-span-3 lg:row-span-2 lg:min-h-[420px]`}>
            <div>
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                  Profile
                </span>
                <Link
                  href="/dashboard/settings/profile"
                  className="text-[11px] font-semibold text-[#7A9EAA] no-underline hover:opacity-80"
                >
                  edit
                </Link>
              </div>
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#454955] text-sm font-bold text-white">
                    {displayName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-[var(--status-live)] ring-2 ring-[#121014]" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-bold leading-snug text-[#fdfffc]">
                    {displayName}
                  </h2>
                  <p className="mt-0.5 truncate text-[11px] text-white/45">{PROFILE_CARD.company}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#627C85]">
                    {roleLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/45">
                    {followerCount} Followers · {PROFILE_CARD.teamCount} Team
                  </p>
                </div>
              </div>
              <div className="my-4 h-px bg-white/8" />
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/55">
                Followers
              </h3>
              {followers.length > 0 ? (
                <div className="space-y-1">
                  {followers.map((follower) => (
                    <div
                      key={follower.id}
                      className="flex items-center gap-3 border-b border-white/6 py-2 last:border-0"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#627C85]/15 text-[10px] font-bold text-[#627C85]">
                        {follower.name
                          .split(/\s+/)
                          .map((p) => p[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-white/85">{follower.name}</p>
                        <p className="truncate text-[10px] text-white/40">{follower.dealName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-xs text-white/40">No followers yet.</p>
              )}
            </div>
          </article>

          {/* Assigned tasks */}
          <article className={`${panel} p-5 lg:col-span-3`}>
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#7A9EAA]">checklist</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                  Assigned Tasks
                </span>
              </div>
              <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[10px] font-bold text-white/70">
                {pendingTasks} PENDING
              </span>
            </div>
            {pendingTasks === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                </div>
                <p className="mt-2 text-xs font-medium text-white/70">
                  You&apos;re all caught up!
                </p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  No pending tasks assigned to you.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5 text-xs">
                    <span
                      className={`mt-0.5 material-symbols-outlined text-[16px] ${
                        task.done ? 'text-[var(--accent)]' : 'text-white/35'
                      }`}
                    >
                      {task.done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <div>
                      <p className={task.done ? 'text-white/40 line-through' : 'text-white/85'}>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-white/40">{task.project}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Recent messages */}
          <article className={`${panel} p-5 lg:col-span-3`}>
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#7A9EAA]">mail</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                  Recent Messages
                </span>
              </div>
              <Link href="/dashboard/inbox" className="text-[11px] font-semibold text-[#7A9EAA] no-underline hover:text-white">
                Inbox
              </Link>
            </div>
            {messages.length > 0 ? (
              <ul className="space-y-3">
                {messages.map((message) => (
                  <li key={message.id} className="border-b border-white/6 pb-2.5 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-semibold text-white/85">{message.from}</p>
                      <span className="shrink-0 text-[10px] text-white/40">{message.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-white/50">{message.preview}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-white/35">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </div>
                <p className="mt-2 text-xs text-white/50 max-w-[220px]">
                  Messages from your deals and team will appear here.
                </p>
                <div className="mt-3">
                  <Button href="/dashboard/inbox" variant="tertiary" size="sm">
                    Open inbox →
                  </Button>
                </div>
              </div>
            )}
          </article>

          {/* Featured metric */}
          <article className={`${panel} flex flex-col justify-between p-5 lg:col-span-3`}>
            <div className="mb-3 flex items-center gap-2 border-b border-white/8 pb-3">
              <span className="material-symbols-outlined text-[18px] text-[#7A9EAA]">insights</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                Featured Metric
              </span>
            </div>
            {hasPortfolioIrr || summary.portfolioCapRate ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {summary.portfolioCapRate ? 'Market Cap Rate (Weighted)' : 'Portfolio IRR'}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-[#fdfffc]">
                  {summary.portfolioCapRate || summary.portfolioIrr}
                </p>
                <p className="mt-2 text-[11px] text-white/45">
                  {summary.portfolioCapRate
                    ? 'Weighted average across active portfolio asset values.'
                    : 'Seed highlight — live KPI engine wires in a later wave.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-white/35">
                  <span className="material-symbols-outlined text-[18px]">insights</span>
                </div>
                <p className="mt-2 text-xs text-white/50 max-w-[200px]">
                  Your portfolio metrics appear here once you add your first deal.
                </p>
              </div>
            )}
            <div className="mt-4">
              <Button
                href="/dashboard/insights"
                variant="tertiary"
                size="sm"
                className="px-0 text-[11px] font-semibold text-[#7A9EAA] hover:text-white"
              >
                Open insights →
              </Button>
            </div>
          </article>

          {/* Operational alerts */}
          <article className={`${panel} p-5 lg:col-span-6`}>
            <div className="mb-3 flex items-center gap-2 border-b border-white/8 pb-3">
              <span
                className={`material-symbols-outlined text-[18px] ${
                  alerts.length > 0 ? 'text-rose-400' : 'text-white/40'
                }`}
              >
                {alerts.length > 0 ? 'warning' : 'notifications_none'}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                Operational Alerts
              </span>
            </div>
            {alerts.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-300">{alert.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                          alert.tone === 'amber'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {alert.count}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={alert.actionHref}
                        className="inline-flex min-h-[36px] items-center rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white no-underline transition hover:bg-white/15 touch-press"
                      >
                        {alert.actionLabel}
                      </Link>
                      {'secondaryLabel' in alert && alert.secondaryLabel && 'secondaryHref' in alert && alert.secondaryHref ? (
                        <Link
                          href={alert.secondaryHref}
                          className="inline-flex min-h-[36px] items-center rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/70 no-underline transition hover:border-white/30 hover:text-white touch-press"
                        >
                          {alert.secondaryLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 py-4 text-xs text-white/40">
                <span className="material-symbols-outlined text-[18px] text-white/30">task_alt</span>
                <span>No operational alerts. Systems running normally.</span>
              </div>
            )}
          </article>

          {/* Active projects progress */}
          <article className={`${panel} p-5 lg:col-span-6`}>
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#7A9EAA]">folder_open</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                  Active Projects
                </span>
              </div>
              <Link
                href="/projects/new?source=dashboard"
                className="text-[11px] font-semibold text-[var(--accent)] no-underline hover:underline"
              >
                + New Project
              </Link>
            </div>
            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <Link
                        href={`/project/${project.id}`}
                        className="font-medium text-white/90 hover:text-white transition"
                      >
                        {project.propertyName}
                      </Link>
                      <span className="text-white/45 capitalize">{project.currentPhase}</span>
                    </div>

                    <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${project.phaseCompletionPct ?? 45}%` }}
                      />
                    </div>

                    {/* Backlink or Link a deal CTA */}
                    <div className="flex items-center justify-between text-[11px]">
                      {project.dealId || project.dealSlug ? (
                        <Link
                          href={`/deals/${project.dealSlug || '1247elmst'}/detail`}
                          className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                        >
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          <span className="truncate max-w-[200px]">{project.dealAddress || project.address}</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/projects/new?step=2&projectId=${project.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2 py-0.5 font-semibold text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition"
                        >
                          <span className="material-symbols-outlined text-[12px]">add_link</span>
                          Link a deal
                        </Link>
                      )}
                      <Link
                        href={`/project/${project.id}`}
                        className="text-white/40 hover:text-white/70 transition"
                      >
                        Workspace →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-white/35">
                  <span className="material-symbols-outlined text-[20px]">folder_open</span>
                </div>
                <p className="mt-2.5 text-xs text-white/55 max-w-[260px]">
                  Launch your first project workspace to start tracking a deal.
                </p>
                <div className="mt-3.5">
                  <Button
                    href="/projects/new?source=dashboard"
                    variant="secondary"
                    size="sm"
                    icon={<span className="material-symbols-outlined text-[14px]">add</span>}
                    iconPosition="left"
                  >
                    + New Project
                  </Button>
                </div>
              </div>
            )}
          </article>

          {/* Sparkline */}
          <article className={`${panel} p-5 lg:col-span-12`}>
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#7A9EAA]">show_chart</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                  90-Day Portfolio Value Trend
                </span>
              </div>
              <span className="rounded-full bg-slate-800/40 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-300">
                {summary.sparklineGrowth} Growth
              </span>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Total Portfolio Assets Value
                </p>
                <p className="font-mono text-2xl font-bold text-white">
                  {summary.portfolioValue}{' '}
                  <span className="text-xs font-medium text-slate-400">USD</span>
                </p>
              </div>
              <div className="relative h-[50px] w-full sm:w-[350px]">
                <svg viewBox="0 0 350 50" className="h-full w-full">
                  <path
                    d="M0,45 Q50,40 100,35 T200,20 T300,10 L350,5"
                    fill="none"
                    stroke="#7A9EAA"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0,45 Q50,40 100,35 T200,20 T300,10 L350,5 L350,50 L0,50 Z"
                    fill="url(#pw-sparkline)"
                    className="opacity-20"
                  />
                  <defs>
                    <linearGradient id="pw-sparkline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7A9EAA" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#7A9EAA" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </article>

          {/* Symmetrical KPI cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-12">
            {[
              {
                label: 'Portfolio Net Operating Income (NOI)',
                value: summary.totalNoi,
                meta: '/yr · hold-phase',
                icon: 'home_work',
              },
              {
                label: 'Blended Portfolio IRR',
                value: hasPortfolioIrr ? summary.portfolioIrr : 'Pending first deal',
                meta: hasPortfolioIrr ? 'annualized · on track' : 'Add a deal to model returns',
                icon: 'trending_up',
              },
            ].map((kpi) => (
              <Link
                key={kpi.label}
                href="/dashboard/insights"
                className={`${panel} block p-5 no-underline transition-colors hover:border-white/20`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#7A9EAA]">{kpi.icon}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                    {kpi.label}
                  </span>
                </div>
                <p className="text-3xl font-bold tracking-tight text-[#fdfffc]">{kpi.value}</p>
                <p className="mt-2 text-[11px] text-white/45">{kpi.meta}</p>
              </Link>
            ))}
          </div>

          {/* Action Center */}
          <div className="lg:col-span-12">
            <SectionHeading title="Action Center" href="/projects" linkLabel="All projects" />
            <div className={`${panel} space-y-3 p-5`}>
              {ATTENTION_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3"
                >
                  <p className="text-sm font-medium text-[#fdfffc]">{item.title}</p>
                  <p className="text-xs text-white/55">{item.project}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline + Top performers */}
          <div className="lg:col-span-8">
            <SectionHeading title="Active Pipeline" href="/projects" linkLabel="Manage" />
            <div className="mb-3 flex flex-wrap items-center gap-4">
              {PHASE_LEGEND.map((phase) => (
                <span key={phase.label} className="flex items-center gap-1.5 text-[11px] text-white/45">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: phase.color }}
                  />
                  {phase.label}
                </span>
              ))}
            </div>
            <div className={`${panel} space-y-2 p-4`}>
              {PIPELINE_SNAPSHOT.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/project/${deal.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/6 px-4 py-3 no-underline transition-colors hover:border-white/14"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: deal.phaseColor }}
                    />
                    <div>
                      <p className="font-medium text-[#fdfffc]">{deal.name}</p>
                      <p className="text-sm text-white/55">{deal.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#fdfffc]">{deal.phase}</p>
                    <p className="text-xs text-white/45">{deal.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <SectionHeading title="Top Performers" />
            <div className={`${panel} space-y-3 p-4`}>
              {TOP_PERFORMERS.map((row) => (
                <Link
                  key={row.id}
                  href={`/project/${row.id}`}
                  className="block rounded-xl border border-white/6 px-3 py-3 no-underline hover:border-white/14"
                >
                  <p className="text-sm font-semibold text-[#fdfffc]">{row.name}</p>
                  <p className="mt-1 text-xs font-medium text-[var(--accent)]">{row.metric}</p>
                  <p className="text-[11px] text-white/45">{row.note}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Heatmap visual search section */}
          <div className="lg:col-span-12">
            <SectionHeading
              title="Marketplace Heatmap & Visual Search"
              href="/dashboard/marketplace"
              linkLabel="Marketplace"
            />
            <div
              className={`${panel} flex min-h-[180px] flex-col items-center justify-center gap-2 p-8 text-center`}
            >
              <span className="material-symbols-outlined text-4xl text-white/25">map</span>
              <p className="text-sm font-medium text-white/70">Deal map preview</p>
              <p className="max-w-md text-xs text-white/45">
                Live map tiles connect when Bridge/MLS adapters are wired. Explore vendor marketplace
                for the current seed surface.
              </p>
              <Link
                href="/dashboard/marketplace"
                className="mt-2 text-xs font-semibold text-[var(--accent)] no-underline hover:underline"
              >
                Open marketplace →
              </Link>
            </div>
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-12">
            <SectionHeading title="Recent Activity" href="/dashboard/inbox" linkLabel="Inbox" />
            <div className={`${panel} divide-y divide-white/6`}>
              {RECENT_ACTIVITY.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-white/85">{item.title}</p>
                    <p className="text-xs text-white/45">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/40">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom performance strip */}
        <div className="mt-2 border-t border-white/8 pt-6">
          <span className="mb-4 block text-[11px] font-bold uppercase tracking-wider text-white/55">
            Portfolio Performance Summary
          </span>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Portfolio IRR',
                icon: 'trending_up',
                value: hasPortfolioIrr ? summary.portfolioIrr : 'Pending first deal',
                meta: hasPortfolioIrr ? 'annualized' : 'Add a deal',
                chip: hasPortfolioIrr ? 'On track' : 'Pending',
              },
              {
                label: 'Equity Multiple',
                icon: 'layers',
                value: `${summary.equityMultiple}×`,
                meta: 'vs. 2.5× target',
                chip: 'On track',
              },
              {
                label: 'Total NOI',
                icon: 'home_work',
                value: summary.totalNoi,
                meta: 'hold-phase',
                chip: 'Rental',
              },
              {
                label: 'Monthly Cash Flow',
                icon: 'waterfall_chart',
                value: summary.monthlyCashFlow,
                meta: 'rental income',
                chip: 'Positive',
              },
            ].map((card) => (
              <Link
                key={card.label}
                href="/dashboard/insights"
                className={`${panel} block p-5 no-underline hover:border-white/20`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="material-symbols-outlined text-[18px] text-[#7A9EAA]">{card.icon}</span>
                  <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[9px] font-bold uppercase text-[var(--accent)]">
                    {card.chip}
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#fdfffc]">{card.value}</p>
                <p className="mt-1 text-[11px] text-white/40">{card.meta}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
