'use client';

import { useEffect, useState } from 'react';
import MetricCard from '@/components/insights/MetricCard';
import { scorecardEntries } from '@/lib/insights/adapters';

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
  kpis?: {
    scorecard?: Record<
      string,
      { value: number | null; projected?: boolean; missingInputs?: string[] }
    >;
  };
  trends?: KpiTrendPoint[];
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
        const response = await fetch(`/api/projects/${projectId}/kpis/current`, {
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
          Derived via `deriveAllProjectMetrics()` and served through `handleProjectKpisCurrentGet`.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((metric) => (
          <MetricCard
            key={metric.key}
            name={metric.label}
            value={metric.display}
            category="Scorecard"
          />
        ))}
      </section>

      {payload.trends?.length ? (
        <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <h3 className="mb-4 text-lg font-semibold">Six-month trend strip</h3>
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
          <h3 className="mb-4 text-lg font-semibold">Recent activity</h3>
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
