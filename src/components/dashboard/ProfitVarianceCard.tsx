'use client';

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShieldAlert, CheckCircle } from 'lucide-react';
import { formatCentsToDollars } from '@/lib/calculations/financials';

interface ProfitVarianceCardProps {
  projectedProfit: number; // in cents
  actualProfit: number;    // in cents
}

/**
 * Profit Variance Component — Antigravity Edition
 * Displays Projected vs Actual profit with technical ledger indicators.
 */
const ProfitVarianceCard: React.FC<ProfitVarianceCardProps> = ({ 
  projectedProfit, 
  actualProfit 
}) => {
  const variance = actualProfit - projectedProfit;
  const isPositive = variance >= 0;
  const variancePercent = projectedProfit !== 0 ? (variance / projectedProfit) * 100 : 0;

  return (
    <div className="ag-card bg-pw-surface shadow-[0_30px_60px_rgba(0,0,0,0.02)] border border-pw-border/10 flex flex-col justify-between min-h-[360px] hover:scale-[1.01] transition-all duration-300 group">
      <div>
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center text-pw-black group-hover:bg-pw-black group-hover:text-pw-white transition-all duration-500">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="ag-label opacity-60">Variance Analysis</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-pw-bg border border-pw-border/30">
            {isPositive ? <TrendingUp className="w-4 h-4 text-pw-black" /> : <TrendingDown className="w-4 h-4 text-pw-black" />}
            <span className="text-[11px] font-bold text-pw-black uppercase tracking-widest">{isPositive ? '+' : ''}{variancePercent.toFixed(1)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-10">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-pw-muted/60 uppercase tracking-[0.2em] mb-4">Projected Yield</p>
            <p className="text-4xl font-light text-pw-black tracking-tighter leading-none">
              <span className="text-lg mr-1 opacity-20">$</span>{formatCentsToDollars(projectedProfit).replace('$', '').split('.')[0]}
              <span className="text-xl opacity-20">.{formatCentsToDollars(projectedProfit).split('.')[1]}</span>
            </p>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-[10px] font-bold text-pw-muted/60 uppercase tracking-[0.2em] mb-4">Actual Settlement</p>
            <p className="text-4xl font-light text-pw-black tracking-tighter leading-none">
              <span className="text-lg mr-1 opacity-20">$</span>{formatCentsToDollars(actualProfit).replace('$', '').split('.')[0]}
              <span className="text-xl opacity-20">.{formatCentsToDollars(actualProfit).split('.')[1]}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 bg-pw-bg/30 rounded-[28px] border border-pw-border/10 flex justify-between items-center group-hover:bg-pw-bg/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? 'bg-pw-black text-white' : 'bg-pw-muted/20 text-pw-muted'}`}>
            {isPositive ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
          </div>
          <span className="ag-label opacity-60">
            {isPositive ? 'Performance Stable' : 'Drift Detected'}
          </span>
        </div>
        <span className={`text-lg font-light tracking-tighter text-pw-black`}>
          {isPositive ? '+' : ''}{formatCentsToDollars(variance)}
        </span>
      </div>
    </div>
  );
};

export default ProfitVarianceCard;
