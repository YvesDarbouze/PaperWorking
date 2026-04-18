'use client';

import React, { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Flame, TrendingUp, Activity, BarChart3, Wind } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Market Heat Map Widget
   
   A high-tech visualization of market velocity and demand.
   Uses Antigravity dark aesthetics (obsidian panels, 
   tactical glows, mathematical typography).
   ═══════════════════════════════════════════════════════ */

export default function MarketHeatMap() {
  const projects = useProjectStore(state => state.projects);

  // Derive "Heat" metrics from existing projects
  const heatData = useMemo(() => {
    const total = projects.length;
    if (total === 0) return { velocity: 0, demand: 0, liquidity: 0 };

    const active = projects.filter(d => d.status === 'Listed' || d.status === 'Under Contract').length;
    const sold = projects.filter(d => d.status === 'Sold').length;
    
    // Abstracted calculation for "Market Temperature"
    const velocity = (sold / total) * 100;
    const demand = (active / total) * 100;
    const liquidity = ((sold + active) / total) * 100;

    return { velocity, demand, liquidity };
  }, [projects]);

  const sectors = [
    { name: 'Absorption Rate', value: heatData.velocity, icon: Activity, label: 'Velocity Drift' },
    { name: 'Buyer Inertia', value: heatData.demand, icon: Flame, label: 'Demand Vector' },
    { name: 'Capital Velocity', value: heatData.liquidity, icon: TrendingUp, label: 'Liquidity Sync' },
  ];

  return (
    <div className="ag-card bg-pw-surface shadow-[0_30px_60px_rgba(0,0,0,0.02)] border border-pw-border/10 flex flex-col h-full min-h-[500px]">
      <div className="px-8 py-10 flex items-center justify-between border-b border-pw-border/10">
          <div className="space-y-1">
            <p className="ag-label opacity-60">Market Telemetry</p>
            <h3 className="text-3xl font-light text-pw-black tracking-tighter">Heat Vectors</h3>
          </div>
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-pw-black/10"></div>
            ))}
          </div>
      </div>

      <div className="flex-1 px-8 py-10 space-y-12">
         {sectors.map((sector) => (
           <div key={sector.name} className="relative group/sector">
              <div className="flex items-end justify-between mb-4">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center text-pw-muted group-hover/sector:bg-pw-black group-hover/sector:text-pw-white transition-all duration-500">
                      <sector.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-pw-black tracking-tight">{sector.name}</p>
                      <p className="text-[10px] font-bold text-pw-muted uppercase tracking-widest opacity-40">{sector.label}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className="text-2xl font-light text-pw-black tracking-tighter">
                      {sector.value.toFixed(1)}%
                    </span>
                 </div>
              </div>
              
              {/* Minimalist Progress Bar */}
              <div className="h-1.5 w-full bg-pw-bg rounded-full overflow-hidden">
                 <div 
                    className="h-full bg-pw-black transition-all duration-1000 ease-in-out"
                    style={{ width: `${Math.max(15, sector.value)}%` }}
                 />
              </div>

              <div className="mt-3 flex justify-between">
                <p className="text-[9px] font-bold text-pw-muted uppercase tracking-[0.1em] opacity-30 italic">
                  Index Normalized: {(sector.value / 1.42).toFixed(2)}
                </p>
                <p className="text-[9px] font-bold text-pw-black uppercase tracking-[0.1em] opacity-80">
                  Status: Optimal
                </p>
              </div>
           </div>
         ))}
      </div>

      {/* Aggregate Heat Index */}
      <div className="p-10 bg-pw-bg/30 border-t border-pw-border/10 flex items-center justify-between mt-auto">
         <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-pw-white border border-pw-border/20 flex items-center justify-center shadow-sm">
               <Wind className="w-5 h-5 text-pw-black" />
            </div>
            <div>
               <p className="ag-label opacity-40 mb-1">Global Fluidity</p>
               <p className="text-xl font-medium text-pw-black tracking-tighter">Equilibrium_0.82</p>
            </div>
         </div>
         
         <div className="text-right">
            <p className="text-[10px] font-bold text-pw-muted uppercase tracking-[0.2em] opacity-40 mb-1">Alpha Signal</p>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-pw-black animate-pulse"></div>
               <span className="text-sm font-bold text-pw-black tracking-wider uppercase">Live</span>
            </div>
         </div>
      </div>
    </div>
  );
}
