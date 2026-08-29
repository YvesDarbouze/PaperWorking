'use client';

import { useEffect, useState } from 'react';
import { scorecardEntries } from '@/lib/insights/adapters';
import { apiFetch } from '@/lib/api/client';

interface ProjectKpiPayload {
  success?: boolean;
  kpis?: {
    snapshotAt?: string;
    scorecard?: Record<string, { value: number | null }>;
  };
}

export default function ProjectScorecardPanel({ projectId }: { projectId: string }) {
  const [payload, setPayload] = useState<ProjectKpiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(`/api/projects/${projectId}/kpis/current`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = (await response.json()) as ProjectKpiPayload & { error?: string };
        if (!response.ok) throw new Error(body.error ?? 'Failed to load scorecard');
        if (!cancelled) setPayload(body);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load scorecard');
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
        Loading scorecard…
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

  const entries = scorecardEntries(
    payload.kpis.scorecard as Parameters<typeof scorecardEntries>[0],
  );

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          REIL scorecard
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">Canonical metric snapshot</h2>
        <p className="mt-2 text-sm text-white/65">
          Snapshot at {payload.kpis.snapshotAt ?? 'latest'} — financial engine authoritative values.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-white/55">
            <tr>
              <th className="px-4 py-3 font-medium">Metric</th>
              <th className="px-4 py-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.key} className="border-t border-white/8">
                <td className="px-4 py-3 font-medium">{entry.label}</td>
                <td className="px-4 py-3 text-white/80">{entry.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
