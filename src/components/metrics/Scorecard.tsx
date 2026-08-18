'use client';

import React from 'react';
import { ProjectMetricsResult } from '@/lib/metrics/types';
import { ScorecardCard } from './ScorecardCard';

interface ScorecardProps {
  metrics: ProjectMetricsResult;
}

export function Scorecard({ metrics }: ScorecardProps) {
  const { scorecard, projectId } = metrics || {};

  if (!scorecard) {
    return <div className="p-6 text-center text-slate-400">No metrics available.</div>;
  }

  return (
    <div data-testid="scorecard-container" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white tracking-wide">Headline Scorecard (10 KPIs)</h3>
        <span className="text-xs text-slate-400">As of {new Date(metrics.asOfDate || Date.now()).toLocaleDateString()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ScorecardCard title="NOI" metric={scorecard.noi} format="currency" projectId={projectId} thresholdType="noi" />
        <ScorecardCard title="Cap Rate" metric={scorecard.capRate} format="percent" projectId={projectId} thresholdType="capRate" />
        <ScorecardCard title="Cash-on-Cash" metric={scorecard.cashOnCash} format="percent" projectId={projectId} />
        <ScorecardCard title="IRR" metric={scorecard.irr} format="percent" projectId={projectId} />
        <ScorecardCard title="Cash Flow" metric={scorecard.cashFlow} format="currency" projectId={projectId} thresholdType="cashFlow" />
        <ScorecardCard title="GRM" metric={scorecard.grm} format="ratio" projectId={projectId} />
        <ScorecardCard title="DSCR" metric={scorecard.dscr} format="ratio" projectId={projectId} thresholdType="dscr" />
        <ScorecardCard title="Occupancy Rate" metric={scorecard.occupancyRate} format="percent" projectId={projectId} />
        <ScorecardCard title="Expense Ratio" metric={scorecard.expenseRatio} format="percent" projectId={projectId} thresholdType="expenseRatio" />
        <ScorecardCard title="Long-Term Appreciation" metric={scorecard.longTermAppreciation} format="percent" projectId={projectId} />
      </div>
    </div>
  );
}
