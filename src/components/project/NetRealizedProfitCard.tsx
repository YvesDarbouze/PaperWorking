'use client';

import React from 'react';
import type { Project } from '@/types/schema';
import { computeAutopsyMetrics } from '@/lib/math/calculatorUtils';
import { Trophy, TrendingUp, AlertTriangle } from 'lucide-react';

interface NetRealizedProfitCardProps {
  project: Project;
}

export function NetRealizedProfitCard({ project }: NetRealizedProfitCardProps) {
  const metrics = computeAutopsyMetrics(project);
  
  const isLoss = metrics.netProfit < 0;
  const profitColor = isLoss ? '#B91C1C' : '#595959';

  const fmtCurrency = (val: number) => {
    return (val < 0 ? '-' : '') + Math.abs(val).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="rounded-[8px] border p-8 flex flex-col justify-center items-center text-center gap-4 transition-all hover:shadow-lg" 
         style={{ backgroundColor: 'var(--bg-surface)', borderColor: isLoss ? '#FCA5A5' : 'var(--border-ui)', borderWidth: isLoss ? '2px' : '1px' }}>
      
      <div className="flex flex-col items-center gap-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${isLoss ? 'bg-[#FEF2F2]' : 'bg-[#F2F2F2]'}`}>
          {isLoss ? (
            <AlertTriangle className="w-6 h-6 text-[#B91C1C]" />
          ) : (
            <Trophy className="w-6 h-6" style={{ color: '#595959' }} />
          )}
        </div>
        <h2 className="text-[12px] font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--text-secondary)' }}>
          Net Realized Profit
        </h2>
      </div>

      <div className="space-y-1">
        <span className="text-6xl font-black tracking-tighter" style={{ color: profitColor }}>
          {fmtCurrency(metrics.netProfit)}
        </span>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${isLoss ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#F0FDF4] text-[#15803D]'}`}>
            <TrendingUp className={`w-3 h-3 ${isLoss ? 'rotate-180' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {metrics.roi.toFixed(2)}% ROI
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#A5A5A5] uppercase tracking-widest">
            Stabilized Exit
          </span>
        </div>
      </div>

      <div className="max-w-xs mt-4 pt-6 border-t w-full" style={{ borderColor: 'var(--border-ui)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {isLoss 
            ? 'Final reconciliation confirms a margin erosion. Audit individual ledgers to identify cost overruns.'
            : 'Successful execution of the investment thesis. Historical costs and exit settlements reconciled.'}
        </p>
      </div>
    </div>
  );
}
