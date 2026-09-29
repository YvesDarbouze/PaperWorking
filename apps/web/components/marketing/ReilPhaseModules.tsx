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
          className="group/card flex flex-col justify-between rounded-none border border-border bg-card p-6 shadow-sm ring-1 ring-foreground/10 text-card-foreground transition-colors hover:border-foreground/25"
        >
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {module.phaseNumber}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
            </div>

            <h3 className="mb-4 text-lg font-bold tracking-tight text-foreground">
              {module.title}
            </h3>

            <ul className="space-y-2.5 pl-4 text-xs sm:text-[13px] leading-relaxed text-muted-foreground list-disc marker:text-muted-foreground/60">
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
