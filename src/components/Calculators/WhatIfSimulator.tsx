'use client';

import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { SlidersHorizontal, AlertCircle, TrendingDown } from 'lucide-react';

export default function WhatIfSimulator() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const offset = useProjectStore((state) => state.whatIfOffsetMonths);
  const setOffset = useProjectStore((state) => state.setWhatIfOffset);
  const metrics = useProjectStore((state) => state.metrics);

  if (!currentProject?.financials) return null;

  const baselineTimeline = currentProject.financials.estimatedTimelineDays || 0;
  
  // Compute naive margin diff for presentation
  // Because 'metrics' represents the aggregated state, changing 'offset' instantly
  // recompiles 'projectedProfit' on the dealStore directly. We just show it.

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 border border-indigo-800 rounded-xl p-6 shadow-xl text-white">
      <div className="flex items-center justify-between border-b border-indigo-800/50 pb-4 mb-6">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold tracking-wide">"What-If" Stress Test</h3>
        </div>
        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 flex items-center py-1 rounded">
           <AlertCircle className="w-3 h-3 mr-1" /> Memory Only
        </span>
      </div>
      
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
           <label className="text-sm font-medium text-indigo-200">Timeline Delay Simulator</label>
           <span className="text-2xl font-light text-white">+{offset} mo</span>
        </div>
        
        <input 
           type="range" 
           min="0" 
           max="12" 
           step="1"
           value={offset}
           onChange={(e) => setOffset(parseInt(e.target.value))}
           className="w-full h-2 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-indigo-400"
        />
        <div className="flex justify-between text-xs text-indigo-400 mt-2">
           <span>Base: {baselineTimeline} mo</span>
           <span>Severe Delay (+12 mo)</span>
        </div>
      </div>

      <div className="bg-black/20 rounded-lg p-4 border border-white/5">
         <p className="text-xs text-indigo-300 uppercase tracking-widest mb-1 flex items-center">
            <TrendingDown className="w-3 h-3 mr-1" /> Projected Net Margin
         </p>
         <p className={`text-4xl font-mono ${metrics.projectedProfit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            ${metrics.projectedProfit.toLocaleString()}
         </p>
         <p className="text-xs text-indigo-300 mt-2">
            Total active holding costs calculated across portfolio: <span className="text-red-300">${metrics.totalHoldingCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
         </p>
      </div>
    </div>
  );
}
