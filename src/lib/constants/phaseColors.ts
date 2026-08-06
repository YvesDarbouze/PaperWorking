/**
 * PHASE_COLORS — Canonical REIL Workflow Phase Colors
 *
 * Single source of truth for phase styling across PaperWorking.
 * Consumed by: project-card, TopPerformersWidget, ProjectsWidget,
 *              ActiveProjectsWidget, intelligence comparison page.
 *
 * Color Semantics (per Design System v7):
 *   Phase 1 — Acquisition: amber/orange
 *   Phase 2 — Fund & Close: blue
 *   Phase 3 — Rehab & Hold: emerald (subdued, not neon)
 *   Phase 4 — Exit: purple
 */

export interface PhaseColorConfig {
  readonly key: string;
  readonly label: string;
  /** Primary hex color for strokes, dots, progress bars */
  readonly hex: string;
  /** Tailwind bg class (with opacity) */
  readonly bg: string;
  /** Tailwind text class */
  readonly text: string;
  /** Tailwind border class */
  readonly border: string;
  /** CSS glow/bg rgba value */
  readonly bgHex: string;
  /** CSS border rgba value */
  readonly borderHex: string;
}

export const PHASE_COLORS: Record<number, PhaseColorConfig> = {
  1: {
    key: 'acquisition',
    label: 'Acquisition',
    hex: '#F59E0B',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    bgHex: 'rgba(245,158,11,0.15)',
    borderHex: 'rgba(245,158,11,0.3)',
  },
  2: {
    key: 'fund',
    label: 'Fund & Close',
    hex: '#3B82F6',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    bgHex: 'rgba(59,130,246,0.15)',
    borderHex: 'rgba(59,130,246,0.3)',
  },
  3: {
    key: 'hold',
    label: 'Rehab & Hold',
    hex: '#34d399',
    bg: 'bg-emerald-400/10',
    text: 'text-emerald-400/70',
    border: 'border-emerald-400/20',
    bgHex: 'rgba(52,211,153,0.10)',
    borderHex: 'rgba(52,211,153,0.20)',
  },
  4: {
    key: 'exit',
    label: 'Exit',
    hex: '#A78BFA',
    bg: 'bg-purple-400/15',
    text: 'text-purple-400',
    border: 'border-purple-400/30',
    bgHex: 'rgba(167,139,250,0.15)',
    borderHex: 'rgba(167,139,250,0.3)',
  },
} as const;

/** String-keyed lookup for contexts that use phase name strings */
export const PHASE_COLORS_BY_NAME: Record<string, string> = {
  Acquisition: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Fund: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Hold: 'text-emerald-400/70 bg-emerald-400/5 border-emerald-400/15',
  Exit: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

/** Helper: get phase config with fallback */
export function getPhaseConfig(phase?: number): PhaseColorConfig {
  return PHASE_COLORS[phase ?? 1] ?? PHASE_COLORS[1];
}

/** Phase label from number */
export function getPhaseLabel(phase?: number): string {
  return (PHASE_COLORS[phase ?? 1] ?? PHASE_COLORS[1]).label;
}
