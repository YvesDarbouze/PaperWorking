'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { loadDashboardOverview } from '@/lib/data';

const panel =
  'rounded-2xl border border-white/10 bg-[#121014]/90 shadow-[0_8px_32px_rgba(0,0,0,0.12)]';

type PortfolioSummary = {
  activeDeals: number;
  portfolioValue: string;
  totalNoi: string;
  monthlyCashFlow: string;
  capitalDeployed: string;
  portfolioIrr: string;
  equityMultiple?: string;
  needsAttention?: number;
  sparklineGrowth?: string;
};

type ProfileCard = {
  displayName: string;
  role: string;
  followers: number;
  company?: string;
  teamCount?: number;
  followerPreview?: Array<{ id: string; name: string; dealName: string }>;
};

type AssignedTask = { id: string; title: string; project: string; done: boolean };
type RecentMessage = { id: string; from: string; preview: string; time: string };
type OperationalAlert = {
  id: string;
  label: string;
  count: number;
  actionLabel: string;
  actionHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  tone: string;
};
type AttentionItem = { id: string; title: string; project: string };
type PipelineDeal = {
  id: string;
  name: string;
  city: string;
  phase: string;
  status: string;
  phaseColor: string;
};
type TopPerformer = { id: string; name: string; metric: string; note: string };
type PhaseLegendItem = { label: string; color: string };
type ActivityItem = { id: string; title: string; detail: string; time: string };
type ProjectSummaryRow = {
  id: string;
  name?: string;
  propertyName?: string;
  status?: string | null;
  currentPhase?: string;
  phaseCompletionPct?: number;
  dealId?: string | null;
  dealSlug?: string | null;
  dealAddress?: string | null;
  address?: string;
};

type DashboardOverview = {
  portfolioSummary: PortfolioSummary;
  projectSummaries: ProjectSummaryRow[];
  profileCard: ProfileCard;
  pipelineSnapshot: PipelineDeal[];
  attentionItems: AttentionItem[];
  assignedTasks: AssignedTask[];
  operationalAlerts: OperationalAlert[];
  recentActivity: ActivityItem[];
  recentMessages: RecentMessage[];
  topPerformers: TopPerformer[];
  activeProjectProgress: unknown[];
  phaseLegend: PhaseLegendItem[];
};

const EMPTY_SUMMARY: PortfolioSummary = {
  activeDeals: 0,
  portfolioValue: '—',
  totalNoi: '—',
  monthlyCashFlow: '—',
  capitalDeployed: '—',
  portfolioIrr: '—',
  equityMultiple: '—',
  needsAttention: 0,
  sparklineGrowth: '—',
};

const EMPTY_PROFILE: ProfileCard = {
  displayName: 'Account',
  role: 'Investor',
  followers: 0,
  company: '',
  teamCount: 0,
  followerPreview: [],
};

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

function EmptyBlock({ message }: { message: string }) {
  return <p className="py-6 text-center text-xs text-white/45">{message}</p>;
}

export default function CommandCenterPanel() {
  const { profile } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = (await loadDashboardOverview()) as DashboardOverview;
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) {
          setOverview(null);
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5 py-16 text-sm text-white/50">
        Loading portfolio…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-16 lg:px-8">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
          Unable to load dashboard: {error}
        </div>
      </div>
    );
  }

  const summary: PortfolioSummary = {
    ...EMPTY_SUMMARY,
    ...(overview?.portfolioSummary ?? {}),
  };
  const profileCard: ProfileCard = {
    ...EMPTY_PROFILE,
    ...(overview?.profileCard ?? {}),
  };
  const assignedTasks = overview?.assignedTasks ?? [];
  const recentMessages = overview?.recentMessages ?? [];
  const operationalAlerts = overview?.operationalAlerts ?? [];
  const attentionItems = overview?.attentionItems ?? [];
  const pipelineSnapshot = overview?.pipelineSnapshot ?? [];
  const topPerformers = overview?.topPerformers ?? [];
  const phaseLegend = overview?.phaseLegend ?? [];
  const recentActivity = overview?.recentActivity ?? [];
  const projectSummaries = overview?.projectSummaries ?? [];

  const displayName = profileCard.displayName || 'Account';
  const roleLabel =
    profile?.accountType === 'vendor' ? 'Vendor Partner' : profileCard.role || 'Investor';
  const pendingTasks = assignedTasks.filter((task) => !task.done).length;
  const followerCount = profileCard.followers ?? 0;
  const followerPreview = profileCard.followerPreview ?? [];

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
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
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
                {summary.needsAttention ?? 0} Caution
              </Link>
            </div>
            <p className="text-[13px] text-white/55">
              {summary.activeDeals} active deals across your portfolio
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/dashboard/deals"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[12px] font-semibold text-white/70 no-underline transition-colors hover:text-white"
            >
              <span className="material-symbols-outlined text-[15px]">storefront</span>
              Browse Deals
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#454955]/90 px-3.5 py-2 text-[12px] font-semibold text-[#fdfffc] no-underline"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              New Project
            </Link>
          </div>
        </header>

        {/* Quick Launch Actions */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                  <span className="rounded border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-400">
                    Exclusive
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9E9DA0]">
                  Search any street address to discover crowdfunding investments, list new syndication opportunities, or connect with investors.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Link
                href="/dashboard/deals"
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 no-underline shadow-md hover:bg-emerald-400 transition"
              >
                Explore Deals
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div
            className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[14px] border border-white/12 p-5 backdrop-blur-xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(0,221,148,0.10) 0%, rgba(18,16,20,0.85) 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#00DD94]/30 bg-[#00DD94]/15 text-[#00DD94]">
                <span className="material-symbols-outlined text-[24px]">create_new_folder</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#fdfffc]">Create new Project</h3>
                  <span className="rounded border border-[#00DD94]/40 bg-[#00DD94]/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#00DD94]">
                    3-Step Flow
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9E9DA0]">
                  Launch a new project workspace, assign team members, and link property acquisition deals with automated collision check.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Link
                href="/projects/new?source=dashboard"
                className="flex items-center gap-2 rounded-xl bg-[#00DD94] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0a0a0f] no-underline shadow-md hover:brightness-110 transition"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Create new Project
              </Link>
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
                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#121014]" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-bold leading-snug text-[#fdfffc]">
                    {displayName}
                  </h2>
                  {profileCard.company ? (
                    <p className="mt-0.5 truncate text-[11px] text-white/45">{profileCard.company}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#627C85]">
                    {roleLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/45">
                    {followerCount} Followers
                    {profileCard.teamCount != null ? ` · ${profileCard.teamCount} Team` : null}
                  </p>
                </div>
              </div>
              <div className="my-4 h-px bg-white/8" />
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/55">
                Followers
              </h3>
              {followerPreview.length === 0 ? (
                <EmptyBlock message="No followers yet." />
              ) : (
                <div className="space-y-1">
                  {followerPreview.map((follower) => (
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
              <EmptyBlock message="You're all caught up! No pending tasks assigned to you." />
            ) : (
              <ul className="space-y-2.5">
                {assignedTasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5 text-xs">
                    <span
                      className={`mt-0.5 material-symbols-outlined text-[16px] ${
                        task.done ? 'text-emerald-400' : 'text-white/35'
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
              <Link href="/dashboard/inbox" className="text-[11px] font-semibold text-[#7A9EAA] no-underline">
                Inbox
              </Link>
            </div>
            {recentMessages.length > 0 ? (
              <ul className="space-y-3">
                {recentMessages.map((message) => (
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
              <EmptyBlock message="No recent messages." />
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
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Portfolio IRR
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-[#fdfffc]">
                {summary.portfolioIrr}
              </p>
              <p className="mt-2 text-[11px] text-white/45">
                Live portfolio metrics from your workspace.
              </p>
            </div>
            <Link
              href="/dashboard/insights"
              className="mt-4 text-[11px] font-semibold text-[#7A9EAA] no-underline hover:underline"
            >
              Open insights →
            </Link>
          </article>

          {/* Operational alerts */}
          <article className={`${panel} p-5 lg:col-span-6`}>
            <div className="mb-3 flex items-center gap-2 border-b border-white/8 pb-3">
              <span className="material-symbols-outlined text-[18px] text-rose-400">warning</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                Operational Alerts
              </span>
            </div>
            {operationalAlerts.length === 0 ? (
              <EmptyBlock message="No operational alerts." />
            ) : (
              <div className="space-y-2.5">
                {operationalAlerts.map((alert) => (
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
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={alert.actionHref}
                        className="rounded-md bg-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80 no-underline"
                      >
                        {alert.actionLabel}
                      </Link>
                      {alert.secondaryLabel && alert.secondaryHref ? (
                        <Link
                          href={alert.secondaryHref}
                          className="rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/55 no-underline"
                        >
                          {alert.secondaryLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
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
                className="text-[11px] font-semibold text-[#00DD94] no-underline hover:underline"
              >
                + New Project
              </Link>
            </div>
            {projectSummaries.length === 0 ? (
              <EmptyBlock message="No active projects yet." />
            ) : (
              <div className="space-y-3">
                {projectSummaries.map((project) => {
                  const label = project.propertyName || project.name || project.id;
                  return (
                    <div
                      key={project.id}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <Link
                          href={`/project/${project.id}`}
                          className="font-medium text-white/90 hover:text-white transition"
                        >
                          {label}
                        </Link>
                        <span className="text-white/45 capitalize">
                          {project.currentPhase || project.status || '—'}
                        </span>
                      </div>

                      <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-[#00DD94]"
                          style={{ width: `${project.phaseCompletionPct ?? 0}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        {project.dealId || project.dealSlug ? (
                          <Link
                            href={`/deals/${project.dealSlug || 'detail'}/detail`}
                            className="flex items-center gap-1 text-[#00DD94] hover:underline"
                          >
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <span className="truncate max-w-[200px]">
                              {project.dealAddress || project.address || 'Linked deal'}
                            </span>
                          </Link>
                        ) : (
                          <Link
                            href={`/projects/new?step=2&projectId=${project.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-[#00DD94]/30 bg-[#00DD94]/10 px-2 py-0.5 font-semibold text-[#00DD94] hover:bg-[#00DD94]/20 transition"
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
                  );
                })}
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
                {summary.sparklineGrowth ?? '—'} Growth
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
                value: summary.portfolioIrr,
                meta: 'annualized · on track',
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
              {attentionItems.length === 0 ? (
                <EmptyBlock message="Nothing needs attention right now." />
              ) : (
                attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[#fdfffc]">{item.title}</p>
                    <p className="text-xs text-white/55">{item.project}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pipeline + Top performers */}
          <div className="lg:col-span-8">
            <SectionHeading title="Active Pipeline" href="/projects" linkLabel="Manage" />
            {phaseLegend.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-4">
                {phaseLegend.map((phase) => (
                  <span key={phase.label} className="flex items-center gap-1.5 text-[11px] text-white/45">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: phase.color }}
                    />
                    {phase.label}
                  </span>
                ))}
              </div>
            ) : null}
            <div className={`${panel} space-y-2 p-4`}>
              {pipelineSnapshot.length === 0 ? (
                <EmptyBlock message="No pipeline deals yet." />
              ) : (
                pipelineSnapshot.map((deal) => (
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
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <SectionHeading title="Top Performers" />
            <div className={`${panel} space-y-3 p-4`}>
              {topPerformers.length === 0 ? (
                <EmptyBlock message="No performers to show." />
              ) : (
                topPerformers.map((row) => (
                  <Link
                    key={row.id}
                    href={`/project/${row.id}`}
                    className="block rounded-xl border border-white/6 px-3 py-3 no-underline hover:border-white/14"
                  >
                    <p className="text-sm font-semibold text-[#fdfffc]">{row.name}</p>
                    <p className="mt-1 text-xs font-medium text-emerald-400">{row.metric}</p>
                    <p className="text-[11px] text-white/45">{row.note}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Heatmap placeholder */}
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
                Live map tiles connect when Bridge/MLS adapters are wired.
              </p>
              <Link
                href="/dashboard/marketplace"
                className="mt-2 text-xs font-semibold text-emerald-400 no-underline hover:underline"
              >
                Open marketplace →
              </Link>
            </div>
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-12">
            <SectionHeading title="Recent Activity" href="/dashboard/inbox" linkLabel="Inbox" />
            <div className={`${panel} divide-y divide-white/6`}>
              {recentActivity.length === 0 ? (
                <EmptyBlock message="No recent activity." />
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-white/85">{item.title}</p>
                      <p className="text-xs text-white/45">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-white/40">{item.time}</span>
                  </div>
                ))
              )}
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
                value: summary.portfolioIrr,
                meta: 'annualized',
                chip: 'On track',
              },
              {
                label: 'Equity Multiple',
                icon: 'layers',
                value: summary.equityMultiple ? `${summary.equityMultiple}×` : '—',
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
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
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
