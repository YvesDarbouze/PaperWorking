"use client";

/**
 * REILKanBan — 4-phase Real Estate Investment Lifecycle board.
 *
 * Columns: Acquisition → Fund → Hold → Exit
 * Each column shows FolderCards for projects in that phase.
 * Acquisition column has a featured "+" add button.
 */

import { useMemo } from "react";
import type { Project } from "@/types/schema";

// ─── Phase definitions ────────────────────────────────────────────────────────

export const REIL_PHASES = [
  {
    phase:       1,
    key:         "acquisition",
    label:       "Acquisition",
    icon:        "domain_add",
    color:       "#454955",
    colorAlpha:  "rgba(69,73,85,",
    description: "Find targets, crowd-fund deals, generate offer letters, and track seller responses.",
    activities:  ["Property search", "Offer letters", "Crowdfunding", "Due diligence"],
  },
  {
    phase:       2,
    key:         "purchase",
    label:       "Fund",
    icon:        "account_balance",
    color:       "#7A9EAA",
    colorAlpha:  "rgba(122,158,170,",
    description: "Loan processing, real estate attorney, all documents needed to close the deal.",
    activities:  ["Loan processing", "Attorney", "Title search", "Closing docs"],
  },
  {
    phase:       3,
    key:         "hold",
    label:       "Hold",
    icon:        "construction",
    color:       "#ffac5a",
    colorAlpha:  "rgba(255,172,90,",
    description: "Track rehab budgets, holding costs, and performance during ownership.",
    activities:  ["Rehab budget", "Holding costs", "Tenant management", "Cash flow"],
  },
  {
    phase:       4,
    key:         "exit",
    label:       "Exit",
    icon:        "exit_to_app",
    color:       "#5aaa3f",
    colorAlpha:  "rgba(90,170,63,",
    description: "Marketing, final sale, realized ROI charts, and end-of-year tax documents.",
    activities:  ["Listing costs", "Sale tracking", "ROI analysis", "Tax docs"],
  },
] as const;

export type ReilPhaseKey = typeof REIL_PHASES[number]["key"];

// ─── Column header ─────────────────────────────────────────────────────────────

function PhaseColumnHeader({
  phase,
  count,
  onAdd,
}: {
  phase: typeof REIL_PHASES[number];
  count: number;
  onAdd?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 pb-4 flex-shrink-0">
      {/* Top accent bar */}
      <div className="h-0.5 rounded-full" style={{ background: phase.color }} />

      {/* Phase title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${phase.colorAlpha}0.15)` }}
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ color: phase.color, fontVariationSettings: "'FILL' 0" }}
            >
              {phase.icon}
            </span>
          </div>
          <span className="text-[14px] font-bold" style={{ color: "rgba(253,255,252,0.92)", letterSpacing: "-0.01em" }}>
            {phase.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
            style={{
              background: `${phase.colorAlpha}0.12)`,
              color: phase.color,
              border: `1px solid ${phase.colorAlpha}0.20)`,
            }}
          >
            {count}
          </span>
          {onAdd && (
            <button
              onClick={onAdd}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: `${phase.colorAlpha}0.15)`, color: phase.color }}
              aria-label="Add project to Acquisition"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-[12px] leading-relaxed" style={{ color: "rgba(253,255,252,0.38)" }}>
        {phase.description}
      </p>

      {/* Activity chips */}
      <div className="flex flex-wrap gap-1.5">
        {phase.activities.map((a) => (
          <span
            key={a}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: `${phase.colorAlpha}0.08)`,
              color: `${phase.colorAlpha}0.70)`,
              border: `1px solid ${phase.colorAlpha}0.12)`,
            }}
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Empty lane ────────────────────────────────────────────────────────────────

function EmptyLane({
  phase,
  onAdd,
}: {
  phase: typeof REIL_PHASES[number];
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
      <p className="text-[12px]" style={{ color: "rgba(253,255,252,0.25)" }}>
        No deals in {phase.label}
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{
            background: `${phase.colorAlpha}0.10)`,
            color: phase.color,
            border: `1px solid ${phase.colorAlpha}0.20)`,
          }}
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add first deal
        </button>
      )}
    </div>
  );
}

// ─── Kanban lane ──────────────────────────────────────────────────────────────

function KanbanLane({
  phase,
  projects,
  onAdd,
  renderCard,
}: {
  phase: typeof REIL_PHASES[number];
  projects: Project[];
  onAdd?: () => void;
  renderCard: (project: Project) => React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-3 min-w-[280px] w-[280px] lg:w-auto lg:flex-1 flex-shrink-0"
      style={{
        borderRight: "1px solid rgba(255,255,255,0.04)",
        paddingRight: "16px",
      }}
    >
      <PhaseColumnHeader phase={phase} count={projects.length} onAdd={onAdd} />

      {/* Separator */}
      <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1">
        {projects.length === 0 ? (
          <EmptyLane phase={phase} onAdd={onAdd} />
        ) : (
          projects.map((p) => renderCard(p))
        )}
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

interface REILKanBanProps {
  projects:   Project[];
  onAdd:      () => void;
  renderCard: (project: Project) => React.ReactNode;
}

export function REILKanBan({ projects, onAdd, renderCard }: REILKanBanProps) {
  // Bucket projects into phases
  const buckets = useMemo(() => {
    const map: Record<number, Project[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const p of projects) {
      if (p.retrospective) continue;
      const ph = p.currentPhase ?? 1;
      const key = Math.min(Math.max(ph, 1), 4) as 1 | 2 | 3 | 4;
      map[key].push(p);
    }
    return map;
  }, [projects]);

  return (
    <div
      className="flex gap-4 lg:gap-6 overflow-x-auto pb-4"
      style={{ scrollbarWidth: "none" }}
    >
      {REIL_PHASES.map((phase) => (
        <KanbanLane
          key={phase.key}
          phase={phase}
          projects={buckets[phase.phase] ?? []}
          onAdd={phase.phase === 1 ? onAdd : undefined}
          renderCard={renderCard}
        />
      ))}
    </div>
  );
}
