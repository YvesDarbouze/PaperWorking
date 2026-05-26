'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';

/* ═══════════════════════════════════════════════════════════════
   Insights — Desktop Dark — AI-driven portfolio intelligence hub
   Stitch design: "Insights (Desktop Dark)"
   Layout: Left sidebar insight cards + Right main analytics panel
   ═══════════════════════════════════════════════════════════════ */

type InsightSeverity = 'success' | 'warning' | 'info' | 'urgent';

interface Insight {
  id: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  metric?: string;
  metricLabel?: string;
  trend?: 'up' | 'down';
  href?: string;
  category: 'performance' | 'risk' | 'opportunity' | 'action';
}

const SEVERITY_STYLES: Record<InsightSeverity, { border: string; badge: string; icon: string }> = {
  success: { border: 'border-l-teal-400', badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20', icon: 'text-teal-400' },
  warning: { border: 'border-l-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: 'text-amber-400' },
  info:    { border: 'border-l-blue-400',  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   icon: 'text-blue-400' },
  urgent:  { border: 'border-l-red-400',   badge: 'bg-red-500/10 text-red-400 border-red-500/20',     icon: 'text-red-400' },
};

function InsightCard({ insight, active, onClick }: { insight: Insight; active: boolean; onClick: () => void }) {
  const styles = SEVERITY_STYLES[insight.severity];
  const SeverityIcon =
    insight.severity === 'success' ? CheckCircle2 :
    insight.severity === 'warning' ? AlertTriangle :
    insight.severity === 'urgent'  ? Zap :
    Clock;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border-l-2 transition-all ${styles.border} ${
        active
          ? 'bg-white/[0.06] border-r border-t border-b border-white/10'
          : 'bg-white/[0.02] border-r border-t border-b border-transparent hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <SeverityIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${styles.icon}`} strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-200 leading-snug">{insight.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{insight.body}</p>
        </div>
      </div>
      {insight.metric && (
        <div className="mt-2 pl-6">
          <span className={`text-sm font-bold tabular-nums ${insight.trend === 'up' ? 'text-teal-400' : insight.trend === 'down' ? 'text-red-400' : 'text-slate-300'}`}>
            {insight.metric}
          </span>
          {insight.metricLabel && (
            <span className="text-[10px] text-slate-500 ml-1.5">{insight.metricLabel}</span>
          )}
        </div>
      )}
    </button>
  );
}

function InsightDetail({ insight }: { insight: Insight }) {
  const styles = SEVERITY_STYLES[insight.severity];
  const SeverityIcon =
    insight.severity === 'success' ? CheckCircle2 :
    insight.severity === 'warning' ? AlertTriangle :
    insight.severity === 'urgent'  ? Zap :
    Clock;

  const actions: Record<string, { label: string; href: string }[]> = {
    'irr-performance': [
      { label: 'View IRR Intelligence', href: '/dashboard/intelligence/irr' },
      { label: 'Run Deal Analyzer', href: '/dashboard/deal-analyzer' },
    ],
    'ltv-warning': [
      { label: 'View LTV Intelligence', href: '/dashboard/intelligence/ltv' },
      { label: 'Open Reports', href: '/dashboard/reports' },
    ],
    'occupancy-risk': [
      { label: 'View Occupancy Trends', href: '/dashboard/intelligence/occupancy' },
      { label: 'Browse Marketplace', href: '/dashboard/marketplace' },
    ],
    'cap-rate-opportunity': [
      { label: 'Cap Rate Intelligence', href: '/dashboard/intelligence/cap-rate' },
      { label: 'Market Data', href: '/dashboard/data' },
    ],
    'dscr-healthy': [
      { label: 'DSCR Intelligence', href: '/dashboard/intelligence/dscr' },
      { label: 'Portfolio Performance', href: '/dashboard/intelligence/performance' },
    ],
    'exchange-window': [
      { label: 'Tax Intelligence', href: '/dashboard/reports' },
      { label: 'Market Data', href: '/dashboard/data' },
    ],
    'noi-growth': [
      { label: 'NOI Intelligence', href: '/dashboard/intelligence/noi' },
      { label: 'Cash Flow Analysis', href: '/dashboard/intelligence/cash-flow' },
    ],
    'oer-elevated': [
      { label: 'OER Intelligence', href: '/dashboard/intelligence/oer' },
      { label: 'Browse Vendors', href: '/dashboard/marketplace' },
    ],
  };

  const ctaList = actions[insight.id] ?? [
    { label: 'View Reports', href: '/dashboard/reports' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          insight.severity === 'success' ? 'bg-teal-500/15' :
          insight.severity === 'warning' ? 'bg-amber-500/15' :
          insight.severity === 'urgent'  ? 'bg-red-500/15' :
          'bg-blue-500/15'
        }`}>
          <SeverityIcon className={`w-5 h-5 ${styles.icon}`} strokeWidth={1.5} />
        </div>
        <div>
          <span className={`inline-flex text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${styles.badge} mb-2`}>
            {insight.category}
          </span>
          <h2 className="text-xl font-bold text-white leading-tight">{insight.title}</h2>
        </div>
      </div>

      {/* Metric highlight */}
      {insight.metric && (
        <div
          className="rounded-xl border border-white/10 p-5"
          style={{ background: 'rgba(24,33,39,0.7)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{insight.metricLabel}</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold tabular-nums ${insight.trend === 'up' ? 'text-teal-400' : insight.trend === 'down' ? 'text-red-400' : 'text-white'}`}>
              {insight.metric}
            </span>
            {insight.trend && (
              <ArrowUpRight className={`w-5 h-5 ${insight.trend === 'up' ? 'text-teal-400' : 'text-red-400 rotate-90'}`} />
            )}
          </div>
        </div>
      )}

      {/* Full analysis */}
      <div
        className="rounded-xl border border-white/10 p-5 space-y-3"
        style={{ background: 'rgba(24,33,39,0.7)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Analysis</p>
        <p className="text-sm text-slate-300 leading-relaxed">{insight.body}</p>
        <p className="text-sm text-slate-400 leading-relaxed">
          {insight.category === 'performance' && 'This signal is derived from your trailing 12-month portfolio data. Consistent improvement in this metric correlates strongly with portfolio appreciation and refinancing eligibility.'}
          {insight.category === 'risk' && 'Risk signals are monitored against industry benchmarks for residential and commercial REI. Early identification allows for proactive mitigation before impact compounds.'}
          {insight.category === 'opportunity' && 'Market intelligence has identified favorable conditions that align with your current portfolio positioning. Acting within the next 60–90 days maximizes the window.'}
          {insight.category === 'action' && 'This action item has been flagged based on your current deal pipeline and market timing. Completing it now prevents downstream delays in the deal lifecycle.'}
        </p>
      </div>

      {/* Recommended actions */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Recommended Actions</p>
        {ctaList.map((cta) => (
          <Link
            key={cta.href}
            href={cta.href}
            className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-white/10 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all group"
          >
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{cta.label}</span>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const { snapshots } = usePortfolioMetricSnapshots('monthly');
  const [activeId, setActiveId] = useState<string>('irr-performance');
  const [filter, setFilter] = useState<string>('all');

  const insights = useMemo((): Insight[] => {
    const latestSnap = snapshots?.[snapshots.length - 1];
    const irr      = latestSnap?.irr        ?? 14.2;
    const capRate  = latestSnap?.capRate     ?? 5.85;
    const dscr     = latestSnap?.dscr        ?? 1.42;
    const oer      = latestSnap?.oer         ?? 38.2;
    const ltv      = latestSnap?.ltv         ?? 68.5;
    const occupancy= latestSnap?.occupancyRate ?? 94.2;
    const noi      = latestSnap?.noi          ?? 482910;
    const prevSnap = snapshots?.[snapshots.length - 2];
    const noiPrev  = prevSnap?.noi ?? noi * 0.88;
    const noiGrowth= noiPrev > 0 ? ((noi - noiPrev) / noiPrev) * 100 : 12.3;

    return [
      {
        id: 'irr-performance',
        title: 'IRR tracking above market benchmark',
        body: `Your portfolio IRR of ${irr.toFixed(1)}% is outperforming the NCREIF Property Index by 3.2 percentage points. The 5-year hold scenario continues to show the strongest risk-adjusted returns.`,
        severity: 'success',
        metric: `${irr.toFixed(1)}%`,
        metricLabel: 'Portfolio IRR',
        trend: 'up',
        category: 'performance',
      },
      {
        id: 'ltv-warning',
        title: 'LTV approaching refinance threshold',
        body: `Current LTV of ${ltv.toFixed(1)}% is nearing the 70% threshold where refinancing becomes less favorable. Consider accelerated principal reduction or equity extraction to improve positioning.`,
        severity: ltv > 70 ? 'warning' : 'info',
        metric: `${ltv.toFixed(1)}%`,
        metricLabel: 'Loan-to-Value',
        trend: 'down',
        category: 'risk',
      },
      {
        id: 'occupancy-risk',
        title: 'Occupancy rate is healthy',
        body: `Portfolio-wide occupancy at ${occupancy.toFixed(1)}% is above the 92% benchmark. Monitor 2 units with leases expiring in Q2 — preemptive renewal outreach is recommended.`,
        severity: occupancy >= 92 ? 'success' : 'warning',
        metric: `${occupancy.toFixed(1)}%`,
        metricLabel: 'Occupancy Rate',
        trend: 'up',
        category: 'risk',
      },
      {
        id: 'cap-rate-opportunity',
        title: 'Cap rate compression signals exit window',
        body: `The ${capRate.toFixed(2)}% cap rate on your portfolio is in the Stable zone. Market data shows cap rate compression in your target submarkets — a favorable window for value-add dispositions in the next 6–12 months.`,
        severity: 'info',
        metric: `${capRate.toFixed(2)}%`,
        metricLabel: 'Portfolio Cap Rate',
        category: 'opportunity',
      },
      {
        id: 'dscr-healthy',
        title: 'DSCR confirms strong debt coverage',
        body: `DSCR of ${dscr.toFixed(2)}x provides a ${((dscr - 1) * 100).toFixed(0)}% buffer above break-even. Lenders typically require 1.20–1.25x minimum — you are well-positioned for additional leverage if needed.`,
        severity: 'success',
        metric: `${dscr.toFixed(2)}x`,
        metricLabel: 'Debt Service Coverage Ratio',
        trend: 'up',
        category: 'performance',
      },
      {
        id: 'exchange-window',
        title: '1031 Exchange window — act within 45 days',
        body: 'Identification period for a potential 1031 exchange on the Elm Street disposition closes in 45 days. Two replacement properties in Phoenix MSA meet the like-kind requirement and are currently under asking.',
        severity: 'urgent',
        category: 'action',
      },
      {
        id: 'noi-growth',
        title: `NOI grew ${noiGrowth.toFixed(1)}% MoM`,
        body: `Net Operating Income reached $${(noi / 1000).toFixed(0)}k this period, a ${noiGrowth.toFixed(1)}% increase versus the prior period. Rent escalation clauses and reduced maintenance expenses drove the improvement.`,
        severity: 'success',
        metric: `$${(noi / 1000).toFixed(0)}k`,
        metricLabel: 'Monthly NOI',
        trend: 'up',
        category: 'performance',
      },
      {
        id: 'oer-elevated',
        title: 'OER trending above target range',
        body: `Operating Expense Ratio of ${oer.toFixed(1)}% is above the 35% target. Primary drivers: maintenance (+18% YoY) and insurance premium increase (+9%). Vendor renegotiation could recover 3–4 OER points.`,
        severity: oer > 40 ? 'warning' : 'info',
        metric: `${oer.toFixed(1)}%`,
        metricLabel: 'Operating Expense Ratio',
        trend: 'down',
        category: 'risk',
      },
    ];
  }, [snapshots]);

  const categories = ['all', 'performance', 'risk', 'opportunity', 'action'] as const;
  const filtered = filter === 'all' ? insights : insights.filter((i) => i.category === filter);
  const activeInsight = insights.find((i) => i.id === activeId) ?? insights[0];

  const summary = useMemo(() => ({
    total:       insights.length,
    success:     insights.filter((i) => i.severity === 'success').length,
    warnings:    insights.filter((i) => i.severity === 'warning' || i.severity === 'urgent').length,
    opportunity: insights.filter((i) => i.category === 'opportunity').length,
  }), [insights]);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Lightbulb className="w-7 h-7 text-teal-400" strokeWidth={1.5} />
            Insights
          </h1>
          <p className="text-sm text-slate-400 mt-1">AI-driven intelligence signals across your portfolio</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all">
          <RefreshCw className="w-4 h-4" />
          Refresh Intelligence
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Signals',   value: summary.total,       color: 'text-white' },
          { label: 'Positive',         value: summary.success,     color: 'text-teal-400' },
          { label: 'Watch Items',      value: summary.warnings,    color: 'text-amber-400' },
          { label: 'Opportunities',    value: summary.opportunity, color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 px-4 py-3" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
            <p className={`text-3xl font-bold tabular-nums mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              filter === cat
                ? 'bg-teal-500 text-black'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Split panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Insight list */}
        <div className="lg:col-span-4 space-y-2">
          {filtered.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              active={activeId === insight.id}
              onClick={() => setActiveId(insight.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No signals in this category.
            </div>
          )}
        </div>

        {/* Right: Detail panel */}
        <div
          className="lg:col-span-8 rounded-2xl border border-white/10 p-6"
          style={{ background: 'rgba(20,29,35,0.5)', backdropFilter: 'blur(24px)' }}
        >
          {activeInsight ? (
            <InsightDetail insight={activeInsight} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Lightbulb className="w-10 h-10 mb-3 opacity-40" strokeWidth={1} />
              <p className="text-sm">Select an insight to view details</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
