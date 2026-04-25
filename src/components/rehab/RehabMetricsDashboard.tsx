'use client';

import React, { useMemo } from 'react';
import { useProjectStore, selectActiveProjectMetrics } from '@/store/projectStore';
import { TrendingUp, AlertTriangle, DollarSign, Target } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Rehab Metrics Dashboard — Phase 3 (The Engine Room)
   3 live widgets:
     1. Target ARV
     2. Rehab Budget Contingency (% remaining of 10-20% buffer)
     3. Projected ROI
   ═══════════════════════════════════════════════════════ */

export default function RehabMetricsDashboard() {
  const currentProject = useProjectStore(s => s.currentProject);
  const dealMetrics = useProjectStore(selectActiveProjectMetrics);

  const metrics = useMemo(() => {
    const arv = currentProject?.financials?.estimatedARV ?? 0;
    const purchasePrice = currentProject?.financials?.purchasePrice ?? 0;

    // Total rehab spend = rehab module tasks (approved) + rehabExpenses
    const rehabTaskCosts =
      currentProject?.rehab?.tasks
        ?.filter(t => t.status === 'Complete' || t.status === 'In Progress')
        .reduce((s, t) => s + t.estimatedCost, 0) ?? 0;

    const rehabExpenseCosts =
      currentProject?.rehabExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0;

    const totalRehabSpent = rehabTaskCosts + rehabExpenseCosts;

    // Budget contingency
    const baseBudget = currentProject?.rehab?.baseBudget ?? 0;
    const bufferPct = currentProject?.rehab?.contingencyBufferPercentage ?? 0.15;
    const contingencyAmount = baseBudget * bufferPct;
    const bufferedBudget = baseBudget + contingencyAmount;
    const overBudget = totalRehabSpent > baseBudget;
    const contingencyUsed = overBudget ? Math.min(totalRehabSpent - baseBudget, contingencyAmount) : 0;
    const contingencyRemaining = contingencyAmount > 0 ? ((contingencyAmount - contingencyUsed) / contingencyAmount) * 100 : 100;

    // Projected ROI
    const holdingCostTotal =
      currentProject?.holdingCosts?.reduce((s, c) => s + c.monthlyAmount * c.totalMonths, 0) ?? 0;

    const totalInvestment = purchasePrice + totalRehabSpent + holdingCostTotal + dealMetrics.closingCostsBuy;
    const netProfit = arv - totalInvestment - dealMetrics.closingCostsSell;
    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

    return {
      arv,
      totalRehabSpent,
      baseBudget,
      bufferedBudget,
      contingencyRemaining,
      contingencyUsed,
      contingencyAmount,
      overBudget,
      bufferPct,
      roi,
      netProfit,
      totalInvestment,
    };
  }, [currentProject, dealMetrics]);

  // Color helpers
  const roiColor = metrics.roi >= 20 ? 'text-green-600' : metrics.roi >= 10 ? 'text-amber-600' : 'text-red-600';
  const roiBg = metrics.roi >= 20 ? 'bg-green-50' : metrics.roi >= 10 ? 'bg-amber-50' : 'bg-red-50';
  const contColor = metrics.contingencyRemaining >= 80 ? 'text-green-600' : metrics.contingencyRemaining >= 50 ? 'text-amber-600' : 'text-red-600';
  const contBg = metrics.contingencyRemaining >= 80 ? 'bg-green-50' : metrics.contingencyRemaining >= 50 ? 'bg-amber-50' : 'bg-red-50';
  const contBarColor = metrics.contingencyRemaining >= 80 ? 'bg-green-500' : metrics.contingencyRemaining >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Widget 1: Target ARV */}
      <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-text-secondary" />
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">Target ARV</p>
        </div>
        <p className="text-3xl font-light tracking-tight text-text-primary mb-2">
          ${metrics.arv.toLocaleString()}
        </p>
        <div className="mt-auto text-xs text-text-secondary">
          <div className="flex justify-between">
            <span>Rehab Spent</span>
            <span className="font-mono">${metrics.totalRehabSpent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between mt-0.5">
            <span>Total Investment</span>
            <span className="font-mono">${metrics.totalInvestment.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Widget 2: Budget Contingency */}
      <div className={`rounded-xl shadow-sm border border-border-accent p-5 flex flex-col ${contBg}`}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className={`w-4 h-4 ${contColor}`} />
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
            Rehab Contingency ({(metrics.bufferPct * 100).toFixed(0)}%)
          </p>
        </div>
        <p className={`text-3xl font-light tracking-tight mb-1 ${contColor}`}>
          {metrics.contingencyRemaining.toFixed(1)}%
        </p>
        <p className="text-xs text-text-secondary mb-3">
          ${(metrics.contingencyAmount - metrics.contingencyUsed).toLocaleString()} of ${metrics.contingencyAmount.toLocaleString()} remaining
        </p>

        {/* Visual bar */}
        <div className="mt-auto">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${contBarColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.max(0, Math.min(100, metrics.contingencyRemaining))}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-text-secondary">
            <span>Budget: ${metrics.baseBudget.toLocaleString()}</span>
            <span>Buffered: ${metrics.bufferedBudget.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Widget 3: Projected ROI */}
      <div className={`rounded-xl shadow-sm border border-border-accent p-5 flex flex-col ${roiBg}`}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className={`w-4 h-4 ${roiColor}`} />
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">Projected ROI</p>
        </div>
        <p className={`text-3xl font-light tracking-tight mb-1 ${roiColor}`}>
          {metrics.roi.toFixed(1)}%
        </p>
        <p className="text-xs text-text-secondary mb-3">
          Net Profit: <span className={`font-mono ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.netProfit >= 0 ? '' : '-'}${Math.abs(metrics.netProfit).toLocaleString()}
          </span>
        </p>

        {/* ROI gauge bar */}
        <div className="mt-auto">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7f7f7f] to-[#595959] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.roi))}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-text-secondary">
            <span>0%</span>
            <span className="font-medium">Target: 20%+</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
