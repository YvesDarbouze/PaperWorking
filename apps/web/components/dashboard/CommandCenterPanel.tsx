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
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <h1 className="text-[28px] font-bold leading-none tracking-[-0.03em] text-foreground">
                Portfolio Control Panel
              </h1>
              <span className="mt-0.5 flex shrink-0 items-center gap-1 whitespace-nowrap">
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
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-none border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground no-underline transition hover:text-foreground sm:ml-2"
                title="View 33 Underwriting Datapoints"
              >
                <Calculator className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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

        {/* Main 12-Column Split Layout: Left Symmetric Portfolio Workspace (8 cols) + Right Vertical Market Vitals Stack (4 cols) */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN: Symmetric Portfolio Workspace */}
          <div className="space-y-6 lg:col-span-8">
            {/* Row 1: Symmetric Quick Launch Actions (Deals Marketplace & Create new Project) */}
            <div
              data-testid="portfolio-symmetric-quick-actions"
              className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2"
            >
              {/* Deals Marketplace card (Discovery brow removed) */}
              <div
                className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                    <MagnifyingGlass className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">Deals Marketplace</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Search any street address to discover crowdfunding investments, list new syndication opportunities, or connect with investors.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end border-t border-border/60 pt-3">
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

              {/* Create new Project CTA card (Address-First brow removed) */}
              <div
                className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                    <Folder className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">Create new Project</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Launch a new project workspace. The first step is the property address, followed immediately by deal calculation, creating the Deal inside the Project and powering all 33 Underwriting Datapoints.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end border-t border-border/60 pt-3">
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

            {/* Row 2: Symmetric 4-Card Portfolio Performance Summary */}
            <div data-testid="portfolio-symmetric-kpi-strip">
              <span className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Portfolio Performance Summary
              </span>
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    className={`${panel} flex h-full min-h-[140px] flex-col justify-between p-5 no-underline transition-colors hover:border-foreground/30`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      {renderCommandCenterIcon(card.icon, 'h-4.5 w-4.5 text-foreground')}
                      <span className="rounded-none border border-border bg-muted px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-foreground">
                        {card.chip}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {card.label}
                      </p>
                      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                        {card.value}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{card.meta}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Row 3: 90-Day Portfolio Value Trend + Symmetric 2-Card Core Return Pair */}
            <div className="space-y-5">
              {/* 90-Day Portfolio Value Trend */}
              <article className={`${panel} p-5`}>
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-3">
                  <button
                    type="button"
                    data-testid="trend-card-heading-trigger"
                    onClick={() => setShowTrendModal(true)}
                    className="flex min-w-0 min-h-[44px] cursor-pointer items-center gap-2 text-left transition hover:text-foreground"
                  >
                    <ChartLineUp className="h-4.5 w-4.5 shrink-0 text-foreground" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      90-Day Portfolio Value Trend
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="shrink-0 whitespace-nowrap rounded-none border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
                      {summary.sparklineGrowth} Growth
                    </span>
                    <button
                      type="button"
                      data-testid="expand-trend-modal-trigger"
                      onClick={() => setShowTrendModal(true)}
                      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-none border border-border bg-muted/30 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                      title="Expand trend details & controls"
                    >
                      <ArrowSquareOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div
                  data-testid="trend-card-content-trigger"
                  onClick={() => setShowTrendModal(true)}
                  className="group flex cursor-pointer flex-col items-center justify-between gap-4 sm:flex-row"
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
                  <div className="relative h-[50px] w-full sm:max-w-[350px]">
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

              {/* Symmetrical 2-Card Return Pair */}
              <div
                data-testid="portfolio-symmetric-return-pair"
                className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2"
              >
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
                    className={`${panel} flex h-full min-h-[144px] flex-col justify-between p-5 no-underline transition-colors hover:border-foreground/30`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      {renderCommandCenterIcon(kpi.icon, 'h-4.5 w-4.5 text-foreground')}
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {kpi.label}
                      </span>
                    </div>
                    <div>
                      <p className="font-mono text-3xl font-bold tracking-tight tabular-nums text-foreground">
                        {kpi.value}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">{kpi.meta}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Row 4: Active Projects (Symmetric 2-Column Project Cards) */}
            <article className={`${panel} p-5`} data-testid="portfolio-active-projects-panel">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Folder className="h-4.5 w-4.5 shrink-0 text-foreground" />
                  <div className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Active Projects ({projects.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground/80">
                      Central mechanism for Deals &amp; 33 Datapoints
                    </span>
                  </div>
                </div>
                <Link
                  href="/projects/new?source=dashboard"
                  data-testid="active-projects-new-project-link"
                  className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap text-[11px] font-semibold text-muted-foreground no-underline transition hover:text-foreground"
                >
                  + New Project
                </Link>
              </div>
              {projects.length > 0 ? (
                <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
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
                        className="flex h-full flex-col justify-between space-y-2.5 rounded-none border border-border bg-card/40 p-3.5 transition hover:border-foreground/30"
                        data-testid={`active-project-card-${project.id}`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <Link
                              href={`/project/${project.id}`}
                              className="min-w-0 flex-1 truncate font-medium text-foreground transition hover:text-primary"
                            >
                              {project.propertyName}
                            </Link>
                            <span className="shrink-0 whitespace-nowrap rounded-none border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
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
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="font-mono text-[10px] uppercase text-muted-foreground/60">
                                Deal:
                              </span>
                              <span
                                title={fullAddress}
                                className="cursor-help truncate font-medium text-foreground hover:text-muted-foreground"
                              >
                                {streetAddress}
                              </span>
                            </div>
                            {price > 0 && (
                              <span className="shrink-0 font-mono text-[11px] text-foreground">
                                {formatUsd(price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 33 Datapoints link and navigation */}
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-1 text-[11px]">
                          <Link
                            href={`/dashboard/insights?project=${project.id}`}
                            data-testid={`project-33-datapoints-link-${project.id}`}
                            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground transition hover:text-foreground"
                          >
                            <Calculator className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span>33 Datapoints</span>
                            {estIrrPct && (
                              <span className="font-semibold text-emerald-500">({estIrrPct}% IRR)</span>
                            )}
                          </Link>

                          <div className="flex shrink-0 items-center gap-3">
                            {project.dealSlug && (
                              <Link
                                href={`/deals/${project.dealSlug}/detail`}
                                className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap text-muted-foreground transition hover:text-foreground"
                                title="View Deal details"
                              >
                                Deal Details →
                              </Link>
                            )}
                            <Link
                              href={`/project/${project.id}`}
                              className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap font-medium text-foreground transition hover:text-primary"
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
                  <p className="mt-2.5 max-w-[260px] text-xs text-muted-foreground">
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

            {/* Row 5: Symmetric 3-Card Operations Triad (Assigned Tasks + Recent Messages + Featured Metric) */}
            <div
              data-testid="portfolio-symmetric-operations-triad"
              className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3"
            >
              {/* Assigned tasks */}
              <article className={`${panel} flex h-full flex-col justify-between p-5`}>
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <ListChecks className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Assigned Tasks
                      </span>
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-none border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
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
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <Link
                    href="/dashboard/calendar"
                    className="inline-flex min-h-[44px] items-center text-[11px] font-semibold text-muted-foreground no-underline hover:text-foreground"
                  >
                    Open schedule →
                  </Link>
                </div>
              </article>

              {/* Recent messages */}
              <article className={`${panel} flex h-full flex-col justify-between p-5`}>
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <EnvelopeSimple className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Recent Messages
                      </span>
                    </div>
                    <Link
                      href="/dashboard/inbox"
                      className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-muted-foreground no-underline hover:text-foreground"
                    >
                      Inbox
                    </Link>
                  </div>
                  {messages.length > 0 ? (
                    <ul className="space-y-3">
                      {messages.map((message) => (
                        <li key={message.id} className="border-b border-border/50 pb-2.5 last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[12px] font-semibold text-foreground">
                              {message.from}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {message.time}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {message.preview}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-none border border-border bg-muted text-muted-foreground">
                        <EnvelopeSimple className="h-4.5 w-4.5" />
                      </div>
                      <p className="mt-2 max-w-[220px] text-xs text-muted-foreground">
                        Messages from your deals and team will appear here.
                      </p>
                      <div className="mt-3">
                        <Button href="/dashboard/inbox" variant="tertiary" size="sm">
                          Open inbox →
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <Link
                    href="/dashboard/inbox"
                    className="inline-flex min-h-[44px] items-center text-[11px] font-semibold text-muted-foreground no-underline hover:text-foreground"
                  >
                    View all messages →
                  </Link>
                </div>
              </article>

              {/* Featured metric */}
              <article className={`${panel} flex h-full flex-col justify-between p-5`}>
                <div>
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
                      <p className="mt-2 font-mono text-3xl font-bold tracking-tight tabular-nums text-foreground">
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
                      <p className="mt-2 max-w-[200px] text-xs text-muted-foreground">
                        Your portfolio metrics appear here once you add your first deal.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 border-t border-border pt-3">
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
            </div>

            {/* Row 6: Symmetric 2-Card Pipeline + Top Performers Pair */}
            <div
              data-testid="portfolio-symmetric-pipeline-pair"
              className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2"
            >
              <div className="flex h-full flex-col">
                <SectionHeading title="Active Pipeline" href="/projects" linkLabel="Manage" />
                <div className={`${panel} flex flex-1 flex-col justify-between p-4`}>
                  <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-border pb-2.5">
                    {PHASE_LEGEND.map((phase) => (
                      <span
                        key={phase.label}
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-none"
                          style={{ backgroundColor: phase.color }}
                        />
                        {phase.label}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {PIPELINE_SNAPSHOT.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/project/${deal.id}`}
                        className="flex min-h-[44px] items-center justify-between rounded-none border border-border bg-card/40 px-4 py-3 no-underline transition-colors hover:border-foreground/30"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2 w-2 shrink-0 rounded-none"
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
              </div>

              <div className="flex h-full flex-col">
                <SectionHeading title="Top Performers" href="/dashboard/insights" linkLabel="Benchmarks" />
                <div className={`${panel} flex flex-1 flex-col justify-between space-y-3 p-4`}>
                  {TOP_PERFORMERS.map((row) => (
                    <Link
                      key={row.id}
                      href={`/project/${row.id}`}
                      className="block min-h-[44px] rounded-none border border-border bg-card/40 px-3.5 py-3 no-underline transition-colors hover:border-foreground/30"
                    >
                      <p className="text-sm font-semibold text-foreground">{row.name}</p>
                      <p className="mt-1 text-xs font-semibold text-primary">{row.metric}</p>
                      <p className="text-[11px] text-muted-foreground">{row.note}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 7: Symmetric 2-Card Heatmap Visual Search & Recent Activity Pair */}
            <div
              data-testid="portfolio-symmetric-activity-pair"
              className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2"
            >
              <div className="flex h-full flex-col">
                <SectionHeading
                  title="Marketplace Heatmap & Visual Search"
                  href="/dashboard/marketplace"
                  linkLabel="Marketplace"
                />
                <div
                  className={`${panel} flex flex-1 min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center`}
                >
                  <MapPin className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground">Deal map preview</p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    Live map tiles connect when Bridge/MLS adapters are wired. Explore vendor directory
                    for the current seed surface.
                  </p>
                  <Link
                    href="/dashboard/marketplace"
                    className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-primary no-underline hover:underline"
                  >
                    Open directory →
                  </Link>
                </div>
              </div>

              <div className="flex h-full flex-col">
                <SectionHeading title="Recent Activity" href="/dashboard/inbox" linkLabel="Inbox" />
                <div className={`${panel} flex flex-1 flex-col justify-between divide-y divide-border`}>
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
          </div>

          {/* RIGHT COLUMN: Vertically Stacked "Real Estate Investor Market Vitals" */}
          <aside
            aria-label="Real Estate Investor Market Vitals Right Rail"
            data-testid="market-vitals-right-rail"
            className="w-full lg:col-span-4 lg:sticky lg:top-6"
          >
            <MarketScoreboardPanel layout="vertical" />
          </aside>
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
    </div>
  );
}
