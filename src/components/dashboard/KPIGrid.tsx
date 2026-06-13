'use client';

import Link from 'next/link';
import KPICard from '@/components/dashboard/KPICard';
import { DollarSign, TrendingUp, FolderOpen, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useProjectStore } from '@/store/projectStore';
import { calculatePortfolioSummary } from '@/lib/analyticsUtils';

function KPICardSkeleton() {
  return (
    <div
      className="relative overflow-hidden flex flex-col justify-between min-h-[152px] rounded-lg p-6 animate-pulse"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md" style={{ background: 'var(--bg-canvas)' }} />
          <div className="h-2.5 w-24 rounded" style={{ background: 'var(--bg-canvas)' }} />
        </div>
        <div className="h-5 w-12 rounded" style={{ background: 'var(--bg-canvas)' }} />
      </div>
      <div className="mt-auto pt-6">
        <div className="h-8 w-32 rounded" style={{ background: 'var(--bg-canvas)' }} />
      </div>
    </div>
  );
}

export default function KPIGrid() {
  const { loading: authLoading } = useAuth();
  const { activeTenantId } = useTenant();
  const projects = useProjectStore((s) => s.projects);
  const projectsSynced = useProjectStore((s) => s.projectsSynced);

  // Show skeleton while:
  //   (a) Firebase Auth is still resolving (activeTenantId will be null until profile loads)
  //   (b) A real tenant ID is known but the first Firestore snapshot hasn't fired yet
  const isLoading =
    authLoading ||
    (!!activeTenantId && activeTenantId !== 'org_placeholder' && !projectsSynced);

  // Empty/onboarding once sync has confirmed zero projects
  const isEmpty = !isLoading && projectsSynced && projects.length === 0;

  if (isLoading) {
    return (
      <section
        aria-label="Portfolio performance metrics loading"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      >
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </section>
    );
  }

  if (isEmpty) {
    return (
      <section aria-label="Portfolio performance metrics" className="grid grid-cols-1 gap-4 sm:gap-5">
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-lg p-8 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
        >
          <FolderOpen className="w-10 h-10" style={{ color: 'var(--text-secondary)' }} />
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              No portfolio data yet
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Add your first project to start tracking realized profit, ROI, and closed deals.
            </p>
          </div>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer"
            style={{ background: '#00DD94', color: '#0a0a0a' }}
          >
            <PlusCircle className="w-4 h-4" />
            Create First Project
          </Link>
        </div>
      </section>
    );
  }

  const summary = calculatePortfolioSummary(projects);
  const totalNetProfit = summary.avgGrossProfit * summary.soldCount;

  const formattedProfit =
    totalNetProfit !== 0 ? `$${Math.round(totalNetProfit).toLocaleString()}` : '$0';
  const formattedROI = summary.avgROI !== 0 ? `${summary.avgROI.toFixed(1)}%` : '0%';
  const profitTrend =
    summary.soldCount > 0 && totalNetProfit > 0
      ? `+${summary.avgROI.toFixed(1)}%`
      : totalNetProfit < 0
        ? `${summary.avgROI.toFixed(1)}%`
        : '—';

  return (
    <section
      aria-label="Portfolio performance metrics"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
    >
      <KPICard
        title="Total Net Realized Profit"
        value={formattedProfit}
        trend={profitTrend}
        icon={<DollarSign className="w-4 h-4" />}
      />
      <KPICard
        title="Average Portfolio ROI"
        value={formattedROI}
        trend="—"
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <KPICard
        title="Closed Deal Count"
        value={summary.soldCount.toString()}
        trend="—"
        icon={<FolderOpen className="w-4 h-4" />}
      />
    </section>
  );
}
