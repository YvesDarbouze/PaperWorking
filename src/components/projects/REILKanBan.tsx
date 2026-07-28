"use client";

/**
 * REILKanBan — 4-phase Real Estate Investment Lifecycle board.
 * UI chrome only — bucketing logic unchanged.
 */

import { useMemo } from "react";
import type { Project } from "@/types/schema";
import { useTheme } from "@/lib/utils/ThemeProvider";
import { projectsTokens } from "./projectsTheme";

export const REIL_PHASES = [
  {
    phase:       1,
    key:         "acquisition",
    label:       "Acquisition",
    icon:        "domain_add",
    colorKey:    "phase1" as const,
    description: "Find targets, underwrite, and get to contract.",
    activities:  ["Property search", "Offer letters", "Crowdfunding", "Due diligence"],
  },
  {
    phase:       2,
    key:         "fund",
    label:       "Fund",
    icon:        "account_balance",
    colorKey:    "phase2" as const,
    description: "Finance, legal, and close the deal.",
    activities:  ["Loan processing", "Attorney", "Title search", "Closing docs"],
  },
  {
    phase:       3,
    key:         "hold",
    label:       "Hold",
    icon:        "construction",
    colorKey:    "phase3" as const,
    description: "Rehab, operate, and track performance.",
    activities:  ["Rehab budget", "Holding costs", "Tenants", "Cash flow"],
  },
  {
    phase:       4,
    key:         "exit",
    label:       "Exit",
    icon:        "exit_to_app",
    colorKey:    "phase4" as const,
    description: "Sell or refinance and realize returns.",
    activities:  ["Listing", "Sale tracking", "ROI", "Tax docs"],
  },
] as const;

export type ReilPhaseKey = typeof REIL_PHASES[number]["key"];

function PhaseColumnHeader({
  phase,
  count,
  onAdd,
  color,
  t,
}: {
  phase: typeof REIL_PHASES[number];
  count: number;
  onAdd?: () => void;
  color: string;
  t: ReturnType<typeof projectsTokens>;
}) {
  return (
    <div className="flex flex-col gap-2.5 pb-3 flex-shrink-0">
      <div className="h-0.5" style={{ background: color, borderRadius: 1 }} />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, borderRadius: 2 }}
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ color, fontVariationSettings: "'FILL' 0" }}
            >
              {phase.icon}
            </span>
          </div>
          <span
            className="text-[13px] font-semibold truncate"
            style={{ color: t.heading, letterSpacing: "-0.01em" }}
          >
            {phase.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 tabular-nums"
            style={{
              background: `${color}18`,
              color,
              borderRadius: 2,
            }}
          >
            {count}
          </span>
          {onAdd && (
            <button
              type="button"
              className="pw-interactive-custom w-6 h-6 flex items-center justify-center transition-opacity hover:opacity-70"
              onClick={onAdd}
              style={{ background: `${color}18`, color, borderRadius: 2, padding: 0, border: "none" }}
              aria-label="Add project to Acquisition"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
            </button>
          )}
        </div>
      </div>

      <p className="text-[12px] leading-snug" style={{ color: t.muted }}>
        {phase.description}
      </p>
    </div>
  );
}

function EmptyLane({
  phase,
  onAdd,
  color,
  t,
}: {
  phase: typeof REIL_PHASES[number];
  onAdd?: () => void;
  color: string;
  t: ReturnType<typeof projectsTokens>;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2.5 py-8 text-center"
      style={{
        background: t.hover,
        border: `1px dashed ${t.border}`,
        borderRadius: 2,
      }}
    >
      <span
        className="material-symbols-outlined text-[24px]"
        style={{ color: t.muted, opacity: 0.5, fontVariationSettings: "'FILL' 0" }}
      >
        {phase.icon}
      </span>
      <p className="text-[12px]" style={{ color: t.muted }}>
        No deals in {phase.label}
      </p>
      {onAdd && (
        <button
          type="button"
          className="pw-interactive-custom flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 transition-opacity hover:opacity-80"
          onClick={onAdd}
          style={{
            background: `${color}18`,
            color,
            border: "none",
            borderRadius: 2,
            padding: "6px 10px",
          }}
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add first deal
        </button>
      )}
    </div>
  );
}

function KanbanLane({
  phase,
  projects,
  onAdd,
  renderCard,
  color,
  t,
  isLast,
}: {
  phase: typeof REIL_PHASES[number];
  projects: Project[];
  onAdd?: () => void;
  renderCard: (project: Project) => React.ReactNode;
  color: string;
  t: ReturnType<typeof projectsTokens>;
  isLast: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-3 min-w-[280px] w-[280px] lg:w-auto lg:flex-1 flex-shrink-0"
      style={{
        borderRight: isLast ? "none" : `1px solid ${t.divider}`,
        paddingRight: isLast ? 0 : 16,
      }}
    >
      <PhaseColumnHeader phase={phase} count={projects.length} onAdd={onAdd} color={color} t={t} />

      <div className="h-px" style={{ background: t.divider }} />

      <div className="flex flex-col gap-2.5 flex-1">
        {projects.length === 0 ? (
          <EmptyLane phase={phase} onAdd={onAdd} color={color} t={t} />
        ) : (
          projects.map((p) => renderCard(p))
        )}
      </div>
    </div>
  );
}

interface REILKanBanProps {
  projects:   Project[];
  onAdd:      () => void;
  renderCard: (project: Project) => React.ReactNode;
}

export function REILKanBan({ projects, onAdd, renderCard }: REILKanBanProps) {
  const { theme } = useTheme();
  const t = projectsTokens(theme === "dark");

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
      className="flex gap-4 lg:gap-5 overflow-x-auto pb-4"
      style={{ scrollbarWidth: "none" }}
    >
      {REIL_PHASES.map((phase, i) => (
        <KanbanLane
          key={phase.key}
          phase={phase}
          projects={buckets[phase.phase] ?? []}
          onAdd={phase.phase === 1 ? onAdd : undefined}
          renderCard={renderCard}
          color={t[phase.colorKey]}
          t={t}
          isLast={i === REIL_PHASES.length - 1}
        />
      ))}
    </div>
  );
}
