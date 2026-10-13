'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { REIL_PHASES, type ReilPhaseKey } from '@/lib/projects/reil-phases';
import type { ProjectSummary } from '@/lib/projects/types';
import {
  Buildings,
  Bank,
  Wrench,
  SignOut,
  Plus,
  FolderSimpleDashed,
} from '@phosphor-icons/react';

function getPhaseIcon(key: ReilPhaseKey) {
  switch (key) {
    case 'acquisition':
      return Buildings;
    case 'purchase':
      return Bank;
    case 'hold':
      return Wrench;
    case 'exit':
      return SignOut;
    default:
      return Buildings;
  }
}

function PhaseColumnHeader({
  phase,
  count,
  onAdd,
}: {
  phase: (typeof REIL_PHASES)[number];
  count: number;
  onAdd?: () => void;
}) {
  const Icon = getPhaseIcon(phase.key);

  return (
    <div className="flex flex-shrink-0 flex-col gap-2.5 pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-none border border-border bg-muted text-foreground">
            <Icon size={16} weight="regular" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            {phase.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-none border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground tabular-nums">
            {count}
          </span>
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex h-6 w-6 items-center justify-center rounded-none border border-border bg-muted/60 text-foreground transition hover:bg-muted"
              aria-label={`Add project to ${phase.label}`}
            >
              <Plus size={14} weight="bold" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {phase.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {phase.activities.map((activity) => (
          <span
            key={activity}
            className="rounded-none border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {activity}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyLane({
  phase,
  onAdd,
}: {
  phase: (typeof REIL_PHASES)[number];
  onAdd?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-none border border-dashed border-border bg-card/50 py-10 text-center">
      <FolderSimpleDashed size={24} className="text-muted-foreground/50" />
      <p className="text-xs text-muted-foreground">
        No deals in {phase.label}
      </p>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 flex items-center gap-1 rounded-none border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/80 min-h-[32px]"
        >
          <Plus size={12} weight="bold" />
          <span>Add first deal</span>
        </button>
      ) : null}
    </div>
  );
}

function KanbanLane({
  phase,
  projects,
  onAdd,
  renderCard,
}: {
  phase: (typeof REIL_PHASES)[number];
  projects: ProjectSummary[];
  onAdd?: () => void;
  renderCard: (project: ProjectSummary) => ReactNode;
}) {
  return (
    <div className="flex w-[290px] min-w-[290px] flex-shrink-0 flex-col gap-3 rounded-none border border-border bg-card p-3 shadow-sm lg:w-auto lg:flex-1">
      <PhaseColumnHeader phase={phase} count={projects.length} onAdd={onAdd} />
      <div className="h-px bg-border" />
      <div className="flex flex-1 flex-col gap-3">
        {projects.length === 0 ? (
          <EmptyLane phase={phase} onAdd={onAdd} />
        ) : (
          projects.map((project) => (
            <div key={project.id}>{renderCard(project)}</div>
          ))
        )}
      </div>
    </div>
  );
}

export default function REILKanBan({
  projects,
  onAdd,
  renderCard,
}: {
  projects: ProjectSummary[];
  onAdd: () => void;
  renderCard: (project: ProjectSummary) => ReactNode;
}) {
  const buckets = useMemo(() => {
    const map: Record<ReilPhaseKey, ProjectSummary[]> = {
      acquisition: [],
      purchase: [],
      hold: [],
      exit: [],
    };
    for (const project of projects) {
      map[project.currentPhase]?.push(project);
    }
    return map;
  }, [projects]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {REIL_PHASES.map((phase) => (
        <KanbanLane
          key={phase.key}
          phase={phase}
          projects={buckets[phase.key]}
          onAdd={phase.key === 'acquisition' ? onAdd : undefined}
          renderCard={renderCard}
        />
      ))}
    </div>
  );
}
