'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
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

const panel =
  'rounded-2xl border border-white/10 bg-[#121014]/90 shadow-[0_8px_32px_rgba(0,0,0,0.12)]';

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

export default function CommandCenterPanel() {
  const { profile } = useAuth();
  const displayName = PROFILE_CARD.displayName;
  const roleLabel =
    profile?.accountType === 'vendor' ? 'Vendor Partner' : PROFILE_CARD.role;
  const pendingTasks = ASSIGNED_TASKS.filter((task) => !task.done).length;

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
                {PORTFOLIO_SUMMARY.needsAttention} Caution
              </Link>
            </div>
            <p className="text-[13px] text-white/55">
              {PORTFOLIO_SUMMARY.activeDeals} active deals across your portfolio
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/dashboard/deals"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[12px] font-semibold text-white/70 no-underline transition-colors hover:text-white"
            >
              <span className="material-symbols-outlined text-[15px]">query_stats</span>
              Deal Analyzer
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

        {/* Deals Marketplace banner */}
        <div
          className="relative flex flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/12 p-5 md:flex-row"
          style={{
            background:
              'linear-gradient(135deg, rgba(69,73,85,0.25) 0%, rgba(18,16,20,0.85) 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          <div className="flex items-center gap-4">
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
              <p className="mt-0.5 text-xs text-[#9E9DA0]">
                Search any street address to discover crowdfunding investments, list new syndication
                opportunities, or connect with investors.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href="/projects"
              className="flex items-center gap-1.5 rounded-xl border border-[#34d399]/25 bg-[#34d399]/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#34d399] no-underline"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Create new Project
            </Link>
            <Link
              href="/dashboard/deals"
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 no-underline shadow-md hover:bg-emerald-400"
            >
              Explore Deals
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
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
                  <p className="mt-0.5 truncate text-[11px] text-white/45">{PROFILE_CARD.company}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#627C85]">
                    {roleLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/45">
                    {PROFILE_CARD.followers} Followers · {PROFILE_CARD.teamCount} Team
                  </p>
                </div>
              </div>
              <div className="my-4 h-px bg-white/8" />
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/55">
                Followers
              </h3>
              <div className="space-y-1">
                {PROFILE_CARD.followerPreview.map((follower) => (
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
              <p className="py-6 text-center text-xs text-white/45">
                You&apos;re all caught up! No pending tasks assigned to you.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {ASSIGNED_TASKS.map((task) => (
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
            {RECENT_MESSAGES.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/45">No recent messages.</p>
            ) : (
              <ul className="space-y-3">
                {RECENT_MESSAGES.map((message) => (
                  <li key={message.id} className="border-b border-white/6 pb-2.5 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-semibold text-white/85">{message.from}</p>
                      <span className="shrink-0 text-[10px] text-white/40">{message.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-white/50">{message.preview}</p>
                  </li>
                ))}
              </ul>
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
                {PORTFOLIO_SUMMARY.portfolioIrr}
              </p>
              <p className="mt-2 text-[11px] text-white/45">
                Seed highlight — live KPI engine wires in a later wave.
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
            <div className="space-y-2.5">
              {OPERATIONAL_ALERTS.map((alert) => (
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
          </article>

          {/* Active projects progress */}
          <article className={`${panel} p-5 lg:col-span-6`}>
            <div className="mb-3 flex items-center gap-2 border-b border-white/8 pb-3">
              <span className="material-symbols-outlined text-[18px] text-[#7A9EAA]">folder_open</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                Active Projects
              </span>
            </div>
            <div className="space-y-3">
              {ACTIVE_PROJECT_PROGRESS.map((project) => (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="block no-underline"
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-white/85">{project.name}</span>
                    <span className="text-white/45">{project.phase}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[#7A9EAA]"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
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
                {PORTFOLIO_SUMMARY.sparklineGrowth} Growth
              </span>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Total Portfolio Assets Value
                </p>
                <p className="font-mono text-2xl font-bold text-white">
                  {PORTFOLIO_SUMMARY.portfolioValue}{' '}
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
                value: PORTFOLIO_SUMMARY.totalNoi,
                meta: '/yr · hold-phase',
                icon: 'home_work',
              },
              {
                label: 'Blended Portfolio IRR',
                value: PORTFOLIO_SUMMARY.portfolioIrr,
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
                  <p className="mt-1 text-xs font-medium text-emerald-400">{row.metric}</p>
                  <p className="text-[11px] text-white/45">{row.note}</p>
                </Link>
              ))}
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
                Live map tiles connect when Bridge/MLS adapters are wired. Explore vendor marketplace
                for the current seed surface.
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
                value: PORTFOLIO_SUMMARY.portfolioIrr,
                meta: 'annualized',
                chip: 'On track',
              },
              {
                label: 'Equity Multiple',
                icon: 'layers',
                value: `${PORTFOLIO_SUMMARY.equityMultiple}×`,
                meta: 'vs. 2.5× target',
                chip: 'On track',
              },
              {
                label: 'Total NOI',
                icon: 'home_work',
                value: PORTFOLIO_SUMMARY.totalNoi,
                meta: 'hold-phase',
                chip: 'Rental',
              },
              {
                label: 'Monthly Cash Flow',
                icon: 'waterfall_chart',
                value: PORTFOLIO_SUMMARY.monthlyCashFlow,
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
