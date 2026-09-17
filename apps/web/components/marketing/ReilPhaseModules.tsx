import React from 'react';
import { REIL_PHASE_MODULES } from '@/lib/marketing/reilModules';

export default function ReilPhaseModules() {
  return (
    <div
      data-testid="reil-phase-modules"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 text-left"
    >
      {REIL_PHASE_MODULES.map((module) => (
        <div
          key={module.title}
          data-testid={`reil-phase-${module.title.replace(/['']/g, '').toLowerCase()}`}
          className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0c090b]/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-[#00DD94]/30 sm:p-7"
        >
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[#00DD94]">
                {module.phaseNumber}
              </span>
              <span className="h-2 w-2 rounded-full bg-[#00DD94]/40" />
            </div>

            <h3 className="mb-4 text-xl font-bold tracking-tight text-white">
              {module.title}
            </h3>

            <ul className="space-y-2.5 pl-4 text-xs leading-[1.6] text-white/70 list-disc marker:text-[#00DD94] sm:text-[13px]">
              {module.bullets.map((bullet, idx) => (
                <li key={idx} className="pl-0.5">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
