import React from 'react';
import { deriveAllProjectMetrics } from '@/lib/metrics';
import { InsightsPanel } from '@/components/metrics/InsightsPanel';
import { canonicalSeedDeal } from '@/lib/metrics/fixtures/canonical-seed-deal';

export default async function ProjectInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const metrics = await deriveAllProjectMetrics(resolvedParams.id, { mockData: canonicalSeedDeal });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Granular Insights</h1>
          <p className="text-sm text-slate-400">Deep-dive 24 Metrics across Financial, Operational, Risk & Compliance categories</p>
        </div>
      </header>

      <InsightsPanel metrics={metrics} />
    </div>
  );
}
