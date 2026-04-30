'use client';

import React from 'react';
import type { Project } from '@/types/schema';
import { computeAutopsyMetrics } from '@/lib/math/calculatorUtils';
import { TrendingDown, Info } from 'lucide-react';

interface TotalAllInCostCardProps {
  project: Project;
}

export function TotalAllInCostCard({ project }: TotalAllInCostCardProps) {
  const metrics = computeAutopsyMetrics(project);
  
  // Requirement 2: Initial Capitalized Basis (Phase 2) + Total CapEx (Phase 3) + Total Holding Costs (Phase 3)
  // metrics.acquisitionCosts + metrics.purchasePrice = Initial Capitalized Basis
  // metrics.actualRehabCost = Total CapEx
  // metrics.holdingCosts = Total Holding Costs
  const totalAllInCost = metrics.purchasePrice + metrics.acquisitionCosts + metrics.actualRehabCost + metrics.holdingCosts;

  const fmtCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="rounded-[8px] border p-6 flex flex-col justify-center gap-4 transition-all hover:shadow-md" 
         style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-[#7F7F7F]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
            Total All-In Cost
          </span>
        </div>
        <div className="group relative">
          <Info className="w-3.5 h-3.5 text-[#CCCCCC] cursor-help transition-colors hover:text-[#595959]" />
          <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-md bg-[#595959] text-white text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            <p className="font-bold mb-1 uppercase tracking-wider">Historical Cost Aggregation</p>
            <p>Calculated as: Basis ({fmtCurrency(metrics.purchasePrice + metrics.acquisitionCosts)}) + CapEx ({fmtCurrency(metrics.actualRehabCost)}) + Holding ({fmtCurrency(metrics.holdingCosts)})</p>
          </div>
        </div>
      </div>

      <div>
        <span className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>
          {fmtCurrency(totalAllInCost)}
        </span>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 w-full bg-[#F2F2F2] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#595959] transition-all duration-1000 ease-out" 
              style={{ width: '100%' }} 
            />
          </div>
        </div>
        <p className="text-[10px] mt-2 font-medium" style={{ color: 'var(--text-tertiary)' }}>
          Authoritative financial baseline for final reconciliation.
        </p>
      </div>
    </div>
  );
}
