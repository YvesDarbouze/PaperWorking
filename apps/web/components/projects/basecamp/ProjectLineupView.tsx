'use client';

import Link from 'next/link';
import { ChartBarHorizontal, ArrowRight } from '@phosphor-icons/react';
import type { ProjectSummary } from '@/lib/projects/types';
import { PHASE_LABELS } from '@/lib/projects/phase-utils';

export default function ProjectLineupView({
  projects,
}: {
  projects: ProjectSummary[];
}) {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <ChartBarHorizontal size={20} className="text-foreground shrink-0" />
          <h3 className="text-base font-semibold text-foreground tracking-tight">Lineup & Everything View</h3>
          <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
            {projects.length} Active Workstreams
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cross-project high-level roadmap monitoring status, completion, and current REIL phases across the portfolio.
        </p>
      </div>

      <div className="space-y-3">
        {projects.map((p) => {
          const completion = p.phaseCompletionPct || 0;
          return (
            <div
              key={p.id}
              className="rounded-none border border-border bg-card p-4 transition hover:bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 md:w-1/3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground tracking-tight">{p.propertyName}</h4>
                  <span className="text-[10px] font-mono uppercase rounded-none border border-border px-2 py-0.5 bg-muted/40 text-foreground">
                    {PHASE_LABELS[p.currentPhase]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{p.address || p.city}</p>
              </div>

              {/* Trajectory Timeline Bar */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Current Status: <strong className="text-foreground font-sans font-medium">{p.status}</strong></span>
                  <span>{completion}% Complete</span>
                </div>
                <div className="h-1.5 w-full rounded-none bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-none transition-all duration-300"
                    style={{ width: `${Math.max(5, completion)}%` }}
                  />
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-end">
                <Link
                  href={`/project/${p.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-background border border-border hover:bg-muted px-3.5 py-2 rounded-none transition min-h-[44px]"
                >
                  <span>Open Workspace</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
