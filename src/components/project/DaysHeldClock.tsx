import React, { useState, useEffect } from 'react';
import { AlertOctagon, Clock } from 'lucide-react';

interface DaysHeldClockProps {
  acquisitionDate?: Date;
  fallbackDate?: Date;
  daysHeld?: number;
}

export function DaysHeldClock({ acquisitionDate, fallbackDate, daysHeld: externalDaysHeld }: DaysHeldClockProps) {
  const [internalDaysHeld, setInternalDaysHeld] = useState(0);

  useEffect(() => {
    if (externalDaysHeld !== undefined) return;
    const startDate = acquisitionDate || fallbackDate;
    if (!startDate) return;

    const start = new Date(startDate);
    const now = new Date();
    
    // Calculate difference in days
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setInternalDaysHeld(diffDays);
  }, [acquisitionDate, fallbackDate, externalDaysHeld]);

  const displayDaysHeld = externalDaysHeld !== undefined ? externalDaysHeld : internalDaysHeld;

  // The higher the days, the more aggressive the UI
  const isSevere = displayDaysHeld >= 90;
  const isWarning = displayDaysHeld >= 60 && displayDaysHeld < 90;

  let containerClass = "bg-zinc-950 border-zinc-800 shadow-2xl";
  let textClass = "text-zinc-100";
  let labelClass = "text-zinc-500";
  let glowClass = "";
  
  if (isSevere) {
    containerClass = "bg-black border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.2)]";
    textClass = "text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]";
    labelClass = "text-red-600/80";
    glowClass = "animate-pulse";
  } else if (isWarning) {
    containerClass = "bg-zinc-950 border-orange-900/50 shadow-[0_0_30px_rgba(234,88,12,0.15)]";
    textClass = "text-orange-500 drop-shadow-[0_0_10px_rgba(234,88,12,0.5)]";
    labelClass = "text-orange-600/80";
  }

  return (
    <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-1000 ${containerClass}`}>
      
      {/* Background Scanline Effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)' }}></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4">
          {isSevere ? <AlertOctagon className={`w-6 h-6 ${textClass} ${glowClass}`} /> : <Clock className={`w-5 h-5 ${labelClass}`} />}
          <h2 className={`text-sm tracking-[0.25em] font-bold uppercase ${labelClass}`}>
            Capital Trapped For
          </h2>
        </div>

        <div className="flex items-baseline gap-3 my-2 font-mono">
          <span className={`text-8xl md:text-9xl font-black tabular-nums tracking-tighter leading-none ${textClass}`}>
            {displayDaysHeld.toString().padStart(3, '0')}
          </span>
          <span className={`text-3xl font-bold uppercase tracking-widest ${labelClass}`}>
            Days
          </span>
        </div>

        <div className="mt-6 text-xs font-mono px-4 py-2 rounded-md bg-white/5 border border-white/10 text-zinc-400 font-medium tracking-wider">
          ACQUIRED: {acquisitionDate ? new Date(acquisitionDate).toLocaleDateString() : (fallbackDate ? new Date(fallbackDate).toLocaleDateString() : 'N/A')}
        </div>
      </div>
    </div>
  );
}
