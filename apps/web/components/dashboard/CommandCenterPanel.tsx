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
import DashboardTrendDetailModal from './DashboardTrendDetailModal';
import FollowersModal from './FollowersModal';
import MarketScoreboardPanel from './scoreboard/MarketScoreboardPanel';
import {
  Calculator,
  ChartLineUp,
  Plus,
  MagnifyingGlass,
  ArrowRight,
  Folder,
  ArrowSquareOut,
  ListChecks,
  CheckCircle,
  EnvelopeSimple,
  ArrowsClockwise,
  MapPin,
  WarningCircle,
  Bell,
  Clock,
  Sparkle,
  Buildings,
  House,
  Storefront,
} from '@/components/icons/PhosphorIcons';

function renderCommandCenterIcon(iconName: string, className = 'h-4 w-4') {
  switch (iconName) {
    case 'analytics':
    case 'calculate':
      return <Calculator className={className} />;
    case 'query_stats':
    case 'show_chart':
    case 'insights':
    case 'trending_up':
    case 'waterfall_chart':
      return <ChartLineUp className={className} />;
    case 'add':
      return <Plus className={className} />;
    case 'search':
      return <MagnifyingGlass className={className} />;
    case 'arrow_forward':
      return <ArrowRight className={className} />;
    case 'create_new_folder':
    case 'folder_open':
    case 'folder':
    case 'layers':
      return <Folder className={className} />;
    case 'open_in_new':
    case 'fullscreen':
      return <ArrowSquareOut className={className} />;
    case 'checklist':
      return <ListChecks className={className} />;
    case 'check_circle':
    case 'task_alt':
      return <CheckCircle className={className} />;
    case 'mail':
    case 'email':
      return <EnvelopeSimple className={className} />;
    case 'sync':
    case 'refresh':
      return <ArrowsClockwise className={className} />;
    case 'map':
    case 'location_on':
      return <MapPin className={className} />;
    case 'home_work':
    case 'apartment':
    case 'domain':
      return <Buildings className={className} />;
    case 'house':
      return <House className={className} />;
    case 'storefront':
      return <Storefront className={className} />;
    case 'schedule':
      return <Clock className={className} />;
    case 'warning':
    case 'error':
      return <WarningCircle className={className} />;
    case 'notifications':
    case 'notifications_none':
    case 'bell':
      return <Bell className={className} />;
    default:
      return <ChartLineUp className={className} />;
  }
}

const panel =
  'rounded-none border border-border bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10';

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return 'N/A';
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
      <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>
      {href && linkLabel ? (
        <Link href={href} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition no-underline">
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
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);

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
      !/^[\s\u2014\u2013\u002d]+$/.test(summary.portfolioIrr) &&
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
        {/* Zone 1: Page header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <h1 className="text-[28px] font-bold leading-none tracking-[-0.03em] text-foreground">
                Portfolio Control Panel
              </h1>
              <span className="mt-0.5 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-none bg-[var(--status-live)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-none bg-[var(--status-live)]" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Live
                </span>
              </span>
              <Link
                href="/dashboard/insights"
                className="ml-2 flex items-center gap-1.5 rounded-none border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground no-underline hover:text-foreground transition"
                title="View 33 Underwriting Datapoints"
              >
                <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                33 Datapoints
              </Link>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Projects are the central operating mechanism of your portfolio: tracking {projects.length} Active Projects &amp; Deals across 33 Underwriting Datapoints
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              href="/dashboard/deals"
              variant="secondary"
              size="sm"
              icon={<ChartLineUp className="h-4 w-4" />}
            >
              Deal Calculator
            </Button>
            <Button
              href="/projects/new?source=dashboard"
              variant="secondary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
            >
              New Project
            </Button>
          </div>
        </header>

        {/* Real-time Macroeconomic Benchmarks & Local Real Estate Scoreboard */}
        <MarketScoreboardPanel />

        {/* Quick Launch Actions: Deals Marketplace & Create new Project */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Deals Marketplace card */}
          <div
            className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                <MagnifyingGlass className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Deals Marketplace</h3>
                  <span className="rounded-none border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-extrabold uppercase text-foreground">
                    Discovery
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
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
                icon={<ArrowRight className="h-4 w-4" />}
                iconPosition="right"
              >
                Explore Deals
              </Button>
            </div>
          </div>

          {/* Create new Project CTA card */}
          <div
            className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                <Folder className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Create new Project</h3>
                  <span className="rounded-none border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-mono uppercase text-foreground">
                    Address-First
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Launch a new project workspace. The first step is the property address, followed immediately by deal calculation, creating the Deal inside the Project and powering all 33 Underwriting Datapoints.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button
                href="/projects/new?source=dashboard"
                variant={createProjectVariant}
                size="md"
                data-testid="quick-launch-create-project"
                icon={<Plus className="h-4 w-4" />}
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Profile
                </span>
                <Link
                  href="/dashboard/settings/profile"
                  className="text-[11px] font-semibold text-muted-foreground no-underline hover:text-foreground hover:underline"
                >
                  edit
                </Link>
              </div>
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="flex h-[54px] w-[54px] items-center justify-center rounded-none border border-border bg-muted text-sm font-bold text-foreground">
                    {displayName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-none bg-[var(--status-live)] ring-2 ring-card" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-bold leading-snug text-foreground">
                    {displayName}
                  </h2>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{PROFILE_CARD.company}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {roleLabel}
                  </p>
                  <button
                    type="button"
                    data-testid="followers-count-trigger"
                    onClick={() => setShowFollowersModal(true)}
                    className="mt-0.5 text-left text-[10px] text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <span className="underline decoration-border underline-offset-2 hover:decoration-foreground">
                      {followerCount} Followers
                    </span>{' '}
                    · {PROFILE_CARD.teamCount} Team
                  </button>
                </div>
              </div>
              <div className="my-4 h-px bg-border" />
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  data-testid="followers-heading-trigger"
                  onClick={() => setShowFollowersModal(true)}
                  className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <span>Followers</span>
                  <ArrowSquareOut className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFollowersModal(true)}
                  className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  View all
                </button>
              </div>
              {followers.length > 0 ? (
                <div className="space-y-1">
                  {followers.map((follower) => (
                    <div
                      key={follower.id}
                      data-testid={`follower-row-${follower.id}`}
                      onClick={() => setShowFollowersModal(true)}
                      className="flex items-center gap-3 border-b border-border/50 py-2 last:border-0 cursor-pointer hover:bg-muted/20 rounded-none px-1 transition"
                      title="Click to view follower details"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none border border-border bg-muted/40 text-[10px] font-bold text-muted-foreground">
                        {follower.name
                          .split(/\s+/)
                          .map((p) => p[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-foreground">{follower.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{follower.dealName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-xs text-muted-foreground">No followers yet.</p>
              )}
            </div>
          </article>

          {/* Assigned tasks */}
          <article className={`${panel} p-5 lg:col-span-3`}>
            <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Assigned Tasks
                </span>
              </div>
              <span className="rounded-none border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                {pendingTasks} PENDING
              </span>
            </div>
            {pendingTasks === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                  <CheckCircle className="h-4.5 w-4.5" />
                  <span className="sr-only">check_circle</span>
                </div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  You&apos;re all caught up!
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                  No pending tasks assigned to you.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5 text-xs">
                    {task.done ? (
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-none border border-border" />
                    )}
                    <div>
                      <p className={task.done ? 'text-muted-foreground line-through' : 'text-foreground'}>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{task.project}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Recent messages */}
          <article className={`${panel} p-5 lg:col-span-3`}>
            <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <EnvelopeSimple className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Messages
                </span>
              </div>
              <Link href="/dashboard/inbox" className="text-[11px] font-semibold text-muted-foreground no-underline hover:text-foreground">
                Inbox
              </Link>
            </div>
            {messages.length > 0 ? (
              <ul className="space-y-3">
                {messages.map((message) => (
                  <li key={message.id} className="border-b border-border/50 pb-2.5 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-semibold text-foreground">{message.from}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{message.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{message.preview}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-none border border-border bg-muted text-muted-foreground">
                  <EnvelopeSimple className="h-4.5 w-4.5" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground max-w-[220px]">
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
            <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
              <ChartLineUp className="h-4.5 w-4.5 text-muted-foreground" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Featured Metric
              </span>
            </div>
            {hasPortfolioIrr || summary.portfolioCapRate ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {summary.portfolioCapRate ? 'Market Cap Rate (Weighted)' : 'Portfolio IRR'}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  {summary.portfolioCapRate || summary.portfolioIrr}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {summary.portfolioCapRate
                    ? 'Weighted average across active portfolio asset values.'
                    : 'Seed highlight: live KPI engine wires in a later wave.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-none border border-border bg-muted text-muted-foreground">
                  <ChartLineUp className="h-4.5 w-4.5" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground max-w-[200px]">
                  Your portfolio metrics appear here once you add your first deal.
                </p>
              </div>
            )}
            <div className="mt-4">
              <Button
                href="/dashboard/insights"
                variant="tertiary"
                size="sm"
                className="px-0 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Open insights →
              </Button>
            </div>
          </article>

          {/* Operational alerts */}
          <article className={`${panel} p-5 lg:col-span-6`}>
            <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
              <span
                className={`flex items-center justify-center ${
                  alerts.length > 0 ? 'text-rose-500' : 'text-muted-foreground'
                }`}
              >
                {alerts.length > 0 ? (
                  <WarningCircle className="h-4.5 w-4.5" />
                ) : (
                  <Bell className="h-4.5 w-4.5" />
                )}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Operational Alerts
              </span>
            </div>
            {alerts.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="space-y-2 rounded-none border border-border bg-muted/20 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground">{alert.label}</span>
                      <span
                        className={`rounded-none px-2 py-0.5 font-mono text-[10px] font-bold ${
                          alert.tone === 'amber'
                            ? 'border border-amber-500/30 bg-amber-500/10 text-amber-500'
                            : 'border border-rose-500/30 bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {alert.count}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={alert.actionHref}
                        className="inline-flex min-h-[44px] items-center rounded-none bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground no-underline transition hover:bg-primary/90 touch-press"
                      >
                        {alert.actionLabel}
                      </Link>
                      {'secondaryLabel' in alert && alert.secondaryLabel && 'secondaryHref' in alert && alert.secondaryHref ? (
                        <Link
                          href={alert.secondaryHref}
                          className="inline-flex min-h-[44px] items-center rounded-none border border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground no-underline transition hover:border-foreground/30 hover:text-foreground touch-press"
                        >
                          {alert.secondaryLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 py-4 text-xs text-muted-foreground">
                <Bell className="h-4.5 w-4.5 text-muted-foreground/60" />
                <span className="sr-only">notifications_none</span>
                <span>No operational alerts. Systems running normally.</span>
              </div>
            )}
          </article>

          {/* Active projects progress */}
          <article className={`${panel} p-5 lg:col-span-6`} data-testid="portfolio-active-projects-panel">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Folder className="h-4.5 w-4.5 text-foreground" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Active Projects ({projects.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">
                    Central mechanism for Deals &amp; 33 Datapoints
                  </span>
                </div>
              </div>
              <Link
                href="/projects/new?source=dashboard"
                className="inline-flex min-h-[44px] items-center text-[11px] font-semibold text-muted-foreground hover:text-foreground no-underline transition"
              >
                + New Project
              </Link>
            </div>
            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => {
                  const fullAddress = project.dealAddress || project.address || 'Address on file';
                  const streetAddress = fullAddress.split(',')[0]?.trim() || project.propertyName;
                  const estIrrPct = project.estimatedIrr
                    ? Number(project.estimatedIrr > 1 ? project.estimatedIrr : project.estimatedIrr * 100).toFixed(1)
                    : null;
                  const price = project.purchasePrice || (project as any).purchase_price || 0;

                  return (
                    <div
                      key={project.id}
                      className="rounded-none border border-border bg-card/40 p-3.5 transition hover:border-foreground/30 space-y-2.5"
                      data-testid={`active-project-card-${project.id}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <Link
                          href={`/project/${project.id}`}
                          className="font-medium text-foreground hover:text-primary transition truncate max-w-[200px]"
                        >
                          {project.propertyName}
                        </Link>
                        <span className="text-muted-foreground text-[10px] uppercase font-mono px-2 py-0.5 rounded-none border border-border bg-muted/40">
                          REIL Phase: {project.currentPhase}
                        </span>
                      </div>

                      {/* Phase completion progress bar */}
                      <div className="h-1.5 overflow-hidden rounded-none border border-border/40 bg-muted/40">
                        <div
                          className="h-full rounded-none bg-primary"
                          style={{ width: `${project.phaseCompletionPct ?? 45}%` }}
                        />
                      </div>

                      {/* Deal inside Project with hover serial address */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-muted-foreground/60 text-[10px] uppercase font-mono">Deal:</span>
                          <span
                            title={fullAddress}
                            className="truncate text-foreground font-medium hover:text-muted-foreground cursor-help"
                          >
                            {streetAddress}
                          </span>
                        </div>
                        {price > 0 && (
                          <span className="text-foreground font-mono text-[11px] shrink-0">
                            {formatUsd(price)}
                          </span>
                        )}
                      </div>

                      {/* 33 Datapoints link and navigation */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border">
                        <Link
                          href={`/dashboard/insights?project=${project.id}`}
                          data-testid={`project-33-datapoints-link-${project.id}`}
                          className="inline-flex min-h-[44px] items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition"
                        >
                          <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>33 Datapoints</span>
                          {estIrrPct && <span className="text-emerald-500 font-semibold">({estIrrPct}% IRR)</span>}
                        </Link>

                        <div className="flex items-center gap-3">
                          {project.dealSlug && (
                            <Link
                              href={`/deals/${project.dealSlug}/detail`}
                              className="inline-flex min-h-[44px] items-center text-muted-foreground hover:text-foreground transition"
                              title="View Deal details"
                            >
                              Deal Details →
                            </Link>
                          )}
                          <Link
                            href={`/project/${project.id}`}
                            className="inline-flex min-h-[44px] items-center text-foreground hover:text-primary transition font-medium"
                          >
                            Workspace →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-none border border-border bg-muted/40 text-muted-foreground">
                  <Folder className="h-5 w-5" />
                </div>
                <p className="mt-2.5 text-xs text-muted-foreground max-w-[260px]">
                  Launch your first project workspace to start tracking a deal.
                </p>
                <div className="mt-3.5">
                  <Button
                    href="/projects/new?source=dashboard"
                    variant="secondary"
                    size="sm"
                    icon={<Plus className="h-3.5 w-3.5" />}
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
            <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
              <button
                type="button"
                data-testid="trend-card-heading-trigger"
                onClick={() => setShowTrendModal(true)}
                className="flex items-center gap-2 text-left cursor-pointer hover:text-foreground transition min-h-[44px]"
              >
                <ChartLineUp className="h-4.5 w-4.5 text-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  90-Day Portfolio Value Trend
                </span>
              </button>
              <div className="flex items-center gap-2">
                <span className="rounded-none border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
                  {summary.sparklineGrowth} Growth
                </span>
                <button
                  type="button"
                  data-testid="expand-trend-modal-trigger"
                  onClick={() => setShowTrendModal(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-none border border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition cursor-pointer"
                  title="Expand trend details & controls"
                >
                  <ArrowSquareOut className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              data-testid="trend-card-content-trigger"
              onClick={() => setShowTrendModal(true)}
              className="flex flex-col items-center justify-between gap-4 sm:flex-row cursor-pointer group"
              title="Click to expand detailed trend ledger"
            >
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Total Portfolio Assets Value
                </p>
                <p className="font-mono text-2xl font-bold text-foreground">
                  {summary.portfolioValue}{' '}
                  <span className="text-xs font-medium text-muted-foreground">USD</span>
                </p>
              </div>
              <div className="relative h-[50px] w-full sm:w-[350px]">
                <svg viewBox="0 0 350 50" className="h-full w-full">
                  <path
                    d="M0,45 Q50,40 100,35 T200,20 T300,10 L350,5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="text-foreground"
                  />
                  <path
                    d="M0,45 Q50,40 100,35 T200,20 T300,10 L350,5 L350,50 L0,50 Z"
                    fill="url(#pw-sparkline)"
                    className="text-foreground/20"
                  />
                  <defs>
                    <linearGradient id="pw-sparkline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
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
                className={`${panel} block p-5 no-underline transition-colors hover:border-foreground/30`}
              >
                <div className="mb-3 flex items-center gap-2">
                  {renderCommandCenterIcon(kpi.icon, 'h-4.5 w-4.5 text-foreground')}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </span>
                </div>
                <p className="text-3xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{kpi.meta}</p>
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
                  className="rounded-none border border-amber-500/30 bg-amber-500/5 px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.project}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline + Top performers */}
          <div className="lg:col-span-8">
            <SectionHeading title="Active Pipeline" href="/projects" linkLabel="Manage" />
            <div className="mb-3 flex flex-wrap items-center gap-4">
              {PHASE_LEGEND.map((phase) => (
                <span key={phase.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-none"
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
                  className="flex items-center justify-between rounded-none border border-border bg-card/40 px-4 py-3 min-h-[44px] no-underline transition-colors hover:border-foreground/30"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 rounded-none shrink-0"
                      style={{ backgroundColor: deal.phaseColor }}
                    />
                    <div>
                      <p className="font-medium text-foreground">{deal.name}</p>
                      <p className="text-sm text-muted-foreground">{deal.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{deal.phase}</p>
                    <p className="text-xs text-muted-foreground">{deal.status}</p>
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
                  className="block rounded-none border border-border bg-card/40 px-3.5 py-3 min-h-[44px] no-underline hover:border-foreground/30 transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground">{row.name}</p>
                  <p className="mt-1 text-xs font-semibold text-primary">{row.metric}</p>
                  <p className="text-[11px] text-muted-foreground">{row.note}</p>
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
              <MapPin className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">Deal map preview</p>
              <p className="max-w-md text-xs text-muted-foreground">
                Live map tiles connect when Bridge/MLS adapters are wired. Explore vendor marketplace
                for the current seed surface.
              </p>
              <Link
                href="/dashboard/marketplace"
                className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-primary no-underline hover:underline"
              >
                Open marketplace →
              </Link>
            </div>
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-12">
            <SectionHeading title="Recent Activity" href="/dashboard/inbox" linkLabel="Inbox" />
            <div className={`${panel} divide-y divide-border`}>
              {RECENT_ACTIVITY.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom performance strip */}
        <div className="mt-2 border-t border-border pt-6">
          <span className="mb-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                className={`${panel} block p-5 no-underline hover:border-foreground/30 transition-colors`}
              >
                <div className="mb-2 flex items-center justify-between">
                  {renderCommandCenterIcon(card.icon, 'h-4.5 w-4.5 text-foreground')}
                  <span className="rounded-none border border-border bg-muted px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-foreground">
                    {card.chip}
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{card.meta}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Trend Detail & Accounting Ledger Modal */}
      <DashboardTrendDetailModal
        isOpen={showTrendModal}
        onClose={() => setShowTrendModal(false)}
        portfolioValue={summary.portfolioValue}
        growthPct={summary.sparklineGrowth}
        totalNoi={summary.totalNoi}
      />

      {/* Interactive Followers & Network Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        followers={followers as any}
        totalCount={followerCount}
      />
    </div>
  );
}
