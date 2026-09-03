'use client';

import { useEffect, useState } from 'react';
import MetricCard from '@/components/insights/MetricCard';
import { bffFetch } from '@/lib/api/bff-fetch';
import { scorecardEntries, scorecardSourceStatusCopy, trendStatusCopy } from '@/lib/insights/adapters';

interface KpiTrendPoint {
  month: string;
  cashOnCash: number;
  dscr: number;
  capRate: number;
  noi: number;
  cashFlow: number;
  occupancy: number;
}

interface ProjectKpiPayload {
  success?: boolean;
  trendStatus?: string;
  kpis?: {
    sourceStatus?: string;
    scorecard?: Record<
      string,
      { value: number | null; projected?: boolean; missingInputs?: string[] }
    >;
  };
  trends?: KpiTrendPoint[];
  recentActivityStatus?: string;
  recentActivity?: Array<{
    id: string;
    payee: string | null;
    category: string;
    amount: number;
    date: string;
    impactNote: string;
  }>;
}

export default function ProjectInsightsPanel({ projectId }: { projectId: string }) {
  const [payload, setPayload] = useState<ProjectKpiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await bffFetch(`/api/projects/${projectId}/kpis/current`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = (await response.json()) as ProjectKpiPayload & { error?: string };
        if (!response.ok) throw new Error(body.error ?? 'Failed to load project KPIs');
        if (!cancelled) setPayload(body);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load KPIs');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-sm text-white/65">
        Loading project insights…
      </div>
    );
  }

  if (error || !payload?.kpis?.scorecard) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-950/20 p-6 text-sm text-red-100">
        {error ?? 'Scorecard unavailable'}
      </div>
    );
  }

  const scorecard = payload.kpis.scorecard as Parameters<typeof scorecardEntries>[0];
  const cards = scorecardEntries(scorecard);

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Granular insights
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">Project KPI engine</h2>
        <p className="mt-2 text-sm text-white/65">
          {scorecardSourceStatusCopy(payload.kpis.sourceStatus)}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((metric) => (
          <MetricCard
            key={metric.key}
            name={metric.label}
            value={metric.display}
            category="Scorecard"
            projected={metric.projected}
          />
        ))}
      </section>

      {payload.trends?.length ? (
        <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">Six-month trend strip</h3>
            {payload.trendStatus === 'demo' ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100/90">
                Demo data
              </span>
            ) : null}
          </div>
          {trendStatusCopy(payload.trendStatus) ? (
            <p className="mb-4 text-xs text-white/55">{trendStatusCopy(payload.trendStatus)}</p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {payload.trends.map((point) => (
              <article key={point.month} className="rounded-xl border border-white/8 px-3 py-3 text-sm">
                <p className="text-white/45">{point.month}</p>
                <p className="mt-1 font-medium">CoC {point.cashOnCash}%</p>
                <p className="text-xs text-white/55">NOI {point.noi.toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {payload.recentActivity?.length ? (
        <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            {payload.recentActivityStatus === 'actual' ? (
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100/90">
                From transactions
              </span>
            ) : null}
          </div>
          <div className="space-y-3">
            {payload.recentActivity.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/8 px-4 py-3 text-sm">
                <p className="font-medium">{item.payee ?? item.category}</p>
                <p className="text-xs text-white/55">{item.impactNote}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
