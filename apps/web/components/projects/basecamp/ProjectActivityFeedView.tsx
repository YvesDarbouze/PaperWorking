'use client';

import { useMemo } from 'react';
import { ClockCounterClockwise, Eye, EyeSlash } from '@phosphor-icons/react';
import type { ProjectActivityEntry } from '@/lib/projects/types';

interface ProjectActivityFeedViewProps {
  activity: ProjectActivityEntry[];
  vendorMode?: boolean;
}

export default function ProjectActivityFeedView({
  activity,
  vendorMode = false,
}: ProjectActivityFeedViewProps) {
  const visibleActivity = useMemo(() => {
    return vendorMode ? activity.filter((a) => a.vendorVisible) : activity;
  }, [activity, vendorMode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <ClockCounterClockwise size={20} className="text-foreground shrink-0" />
          <h3 className="text-base font-semibold text-foreground tracking-tight">Project Activity Feed</h3>
          <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
            {visibleActivity.length} Events
          </span>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Audit trail of task updates, file uploads, discussions, and milestones.
        </p>
      </div>

      {visibleActivity.length === 0 ? (
        <div className="rounded-none border border-border bg-card p-8 text-center text-muted-foreground">
          <p className="text-sm">No activity recorded yet.</p>
          <p className="text-xs mt-1 text-muted-foreground">Actions taken across project tools will appear here in chronological order.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60 rounded-none border border-border bg-card">
          {visibleActivity.map((entry) => {
            const dateStr = entry.at
              ? new Date(entry.at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently';

            return (
              <div key={entry.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{entry.actorName}</span>
                    <span className="text-[10px] font-mono rounded-none border border-border bg-muted/30 px-1.5 py-0.2 text-muted-foreground uppercase">
                      {entry.kind.replace('.', ' / ')}
                    </span>
                    {entry.vendorVisible ? (
                      <span className="text-foreground flex items-center gap-0.5 font-mono text-[10px]">
                        <Eye size={11} /> Shared with guests
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-0.5 font-mono text-[10px]">
                        <EyeSlash size={11} /> Internal
                      </span>
                    )}
                  </div>
                  <p className="text-foreground leading-relaxed">{entry.summary}</p>
                </div>
                <time className="text-[11px] font-mono text-muted-foreground shrink-0 mt-0.5">
                  {dateStr}
                </time>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
