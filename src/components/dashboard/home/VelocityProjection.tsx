'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { calculatePortfolioVelocity } from '@/lib/analyticsUtils';
import { Activity, Calendar, Zap, TrendingDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   VelocityProjection — Tactical Exit & Burn Intelligence
   
   Visualizes portfolio-wide burn rates and projected capital
   recycling events.
   ═══════════════════════════════════════════════════════════════ */

interface VelocityProjectionProps {
  projects: Project[];
}

export default function VelocityProjection({ projects }: VelocityProjectionProps) {
  const data = useMemo(() => calculatePortfolioVelocity(projects), [projects]);

  const formatCurrency = (val: number) => 
    `$${Math.round(val).toLocaleString()}`;

  const formatMonth = (date: Date) => 
    date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

  const ageData = [
    { label: '0-30',  value: data.ageBuckets['0-30'] },
    { label: '31-60', value: data.ageBuckets['31-60'] },
    { label: '61-90', value: data.ageBuckets['61-90'] },
    { label: '91+',   value: data.ageBuckets['91+'] },
  ];

  const maxAgeCount = Math.max(...ageData.map(d => d.value), 1);

  return (
    <div className="space-y-8">
      {/* 1. Burn Rate Pulse */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-bg-surface border border-border-accent/10 shadow-sm">
          <p className="text-[9px] uppercase tracking-widest text-text-secondary opacity-40 mb-1 font-black">Daily Portfolio Burn</p>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-lg font-mono font-bold text-text-primary">
              {formatCurrency(data.totalDailyBurn)}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-bg-surface border border-border-accent/10 shadow-sm">
          <p className="text-[9px] uppercase tracking-widest text-text-secondary opacity-40 mb-1 font-black">Monthly Overhead</p>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-red-500" />
            <span className="text-lg font-mono font-bold text-text-primary">
              {formatCurrency(data.totalMonthlyBurn)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Inventory Aging Histogram */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingDown className="w-3 h-3 text-text-secondary/40" />
          <p className="ag-label opacity-40 text-[10px] font-bold uppercase tracking-[0.1em]">Inventory Aging (Days)</p>
        </div>
        
        <div className="flex items-end justify-between gap-2 h-20 px-2">
          {ageData.map(d => {
            const pct = (d.value / maxAgeCount) * 100;
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group/bar">
                <div className="w-full relative bg-bg-primary rounded-t-sm h-full overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 w-full bg-text-primary/20 group-hover/bar:bg-pw-black transition-all duration-500"
                    style={{ height: `${pct}%` }}
                  />
                  {d.value > 0 && (
                    <span className="absolute bottom-1 w-full text-center text-[9px] font-mono font-bold text-text-primary/40 group-hover/bar:text-pw-white transition-colors">
                      {d.value}
                    </span>
                  )}
                </div>
                <span className="text-[8px] font-mono text-text-secondary opacity-40 uppercase">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Projected Exit Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Calendar className="w-3 h-3 text-text-secondary/40" />
          <p className="ag-label opacity-40 text-[10px] font-bold uppercase tracking-[0.1em]">Projected Exit Velocity</p>
        </div>

        {data.projections.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-border-accent/20 rounded-xl">
             <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-30">No Upcoming Exits</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.projections.slice(0, 4).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-border-accent/5 hover:border-pw-black/10 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-text-primary truncate max-w-[120px]">{p.address}</span>
                  <span className="text-[9px] font-mono text-text-secondary opacity-40">{formatMonth(p.date)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-green-600">{formatCurrency(p.amount)}</span>
                  <p className="text-[8px] uppercase tracking-tighter text-text-secondary opacity-30 font-black">Est. Liquidity</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
