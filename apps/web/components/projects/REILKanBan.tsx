'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { REIL_PHASES, type ReilPhaseKey } from '@/lib/projects/reil-phases';
import type { ProjectSummary } from '@/lib/projects/types';

function PhaseColumnHeader({
  phase,
  count,
  onAdd,
}: {
  phase: (typeof REIL_PHASES)[number];
  count: number;
  onAdd?: () => void;
}) {
  return (
    <div className="flex flex-shrink-0 flex-col gap-3 pb-4">
      <div className="h-0.5 rounded-full" style={{ background: phase.color }} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${phase.colorAlpha}0.15)` }}
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ color: phase.color, fontVariationSettings: "'FILL' 0" }}
            >
              {phase.icon}
            </span>
          </div>
          <span
            className="text-[14px] font-bold tracking-[-0.01em]"
            style={{ color: 'rgba(253,255,252,0.92)' }}
          >
            {phase.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums"
            style={{
              background: `${phase.colorAlpha}0.12)`,
              color: phase.color,
              border: `1px solid ${phase.colorAlpha}0.20)`,
            }}
          >
            {count}
          </span>
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex h-6 w-6 items-center justify-center rounded-md transition-opacity hover:opacity-70"
              style={{ background: `${phase.colorAlpha}0.15)`, color: phase.color }}
              aria-label={`Add project to ${phase.label}`}
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(253,255,252,0.38)' }}>
        {phase.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {phase.activities.map((activity) => (
          <span
            key={activity}
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{
              background: `${phase.colorAlpha}0.08)`,
              color: `${phase.colorAlpha}0.70)`,
              border: `1px solid ${phase.colorAlpha}0.12)`,
            }}
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
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl py-10 text-center"
      style={{
        background: `${phase.colorAlpha}0.03)`,
        border: `1px dashed ${phase.colorAlpha}0.15)`,
      }}
    >
      <span
        className="material-symbols-outlined text-[28px]"
        style={{ color: `${phase.colorAlpha}0.25)`, fontVariationSettings: "'FILL' 0" }}
      >
        {phase.icon}
      </span>
      <p className="text-[12px]" style={{ color: 'rgba(253,255,252,0.25)' }}>
        No deals in {phase.label}
      </p>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-70"
          style={{
            background: `${phase.colorAlpha}0.10)`,
            color: phase.color,
            border: `1px solid ${phase.colorAlpha}0.20)`,
          }}
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add first deal
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
    <div
      className="flex w-[280px] min-w-[280px] flex-shrink-0 flex-col gap-3 lg:w-auto lg:flex-1"
      style={{ borderRight: '1px solid rgba(255,255,255,0.04)', paddingRight: 16 }}
    >
      <PhaseColumnHeader phase={phase} count={projects.length} onAdd={onAdd} />
      <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
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
    <div className="flex gap-4 overflow-x-auto pb-2 lg:gap-5">
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
