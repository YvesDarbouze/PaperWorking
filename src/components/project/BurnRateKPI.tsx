import React from 'react';
import { Flame, AlertTriangle } from 'lucide-react';

interface BurnRateKPIProps {
  monthlyHoldingCosts: number;
  daysHeld?: number;
  estimatedTimelineDays?: number;
}

export function BurnRateKPI({ monthlyHoldingCosts, daysHeld, estimatedTimelineDays }: BurnRateKPIProps) {
  const dailyBurnRate = monthlyHoldingCosts / 30;
  
  const isOverdue = daysHeld !== undefined && estimatedTimelineDays !== undefined && daysHeld > estimatedTimelineDays;
  const isHigh = monthlyHoldingCosts > 5000 || isOverdue;
  
  const containerClass = isHigh ? "bg-black border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.15)]" : "bg-zinc-950 border-zinc-800 shadow-2xl";
  const textClass = isHigh ? "text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]" : "text-zinc-100";
  const iconClass = isHigh ? "text-red-500 animate-pulse" : "text-zinc-400";
  const labelClass = isHigh ? "text-red-600/80" : "text-zinc-500";

  return (
    <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-1000 ${containerClass}`}>
      {/* Background Scanline Effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)' }}></div>

      {isOverdue && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-xs font-bold uppercase tracking-[0.2em] py-1.5 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.8)] z-20">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          Schedule Exceeded by {daysHeld - estimatedTimelineDays} Days
        </div>
      )}

      <div className={`relative z-10 flex flex-col items-center ${isOverdue ? 'mt-4' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <Flame className={`w-6 h-6 ${iconClass}`} />
          <h2 className={`text-sm tracking-[0.25em] font-bold uppercase ${labelClass}`}>
            Daily Burn Rate
          </h2>
        </div>

        <div className="flex items-baseline gap-2 my-2 font-mono">
          <span className={`text-2xl font-bold ${textClass} opacity-70`}>$</span>
          <span className={`text-6xl md:text-7xl font-black tabular-nums tracking-tighter leading-none ${textClass}`}>
            {dailyBurnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-xl font-bold uppercase tracking-widest ${labelClass}`}>
            / Day
          </span>
        </div>

        <div className="mt-6 text-xs font-mono px-4 py-2 rounded-md bg-white/5 border border-white/10 text-zinc-400 font-medium tracking-wider">
          ${monthlyHoldingCosts.toLocaleString()} / MONTH
        </div>
      </div>
    </div>
  );
}
