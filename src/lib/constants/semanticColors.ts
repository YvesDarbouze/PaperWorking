/**
 * SEMANTIC_COLORS — Canonical Color Intent Map
 *
 * Single source of truth for *why* a color is applied, not just which color.
 * Introduced by the UX/UI Hardening Sprint (August 2026) to end the
 * system-wide overuse of the emerald accent.
 *
 * ── The Green Rule ────────────────────────────────────────────────────────
 * The emerald accent (`var(--color-primary)`, #00CE8E light / #00DD94 dark)
 * is RESERVED. It may appear ONLY as:
 *
 *   1. `cta`     — the primary call-to-action button. MAX ONE PER VIEW.
 *   2. `active`  — the active/selected state of a nav item, tab, or toggle.
 *   3. `success` — a success confirmation (saved, funded, approved, paid).
 *   4. The chat bot button outline (see ChatbotWidget.tsx).
 *
 * Everything else that used to be green — decorative badges, section
 * headers, icon tints, card borders, positive financial figures — resolves
 * to `neutral` / `neutralAlt` slate or plain white-on-dark text.
 *
 * ── The Red Rule ──────────────────────────────────────────────────────────
 * Red (`negative`) is equally reserved. It may appear ONLY as:
 *
 *   1. A negative financial value.
 *   2. An error state.
 *   3. A warning alert (prefer `warning` amber for non-blocking cases).
 *   4. A destructive action (delete, revoke, terminate).
 *
 * Never use red for neutral labels, decorative badges, or category chips.
 *
 * @see src/lib/constants/phaseColors.ts for REIL workflow phase colors,
 *      which are a separate, orthogonal axis and are NOT governed by this map.
 */

export type SemanticIntent =
  | 'cta'
  | 'active'
  | 'success'
  | 'negative'
  | 'warning'
  | 'neutral'
  | 'neutralAlt'
  | 'onSurface';

export interface SemanticColorConfig {
  readonly intent: SemanticIntent;
  /** Human-readable description of when this intent is permitted. */
  readonly usage: string;
  /** Tailwind background class. */
  readonly bg: string;
  /** Tailwind text class. */
  readonly text: string;
  /** Tailwind border class. */
  readonly border: string;
  /** Raw CSS color for inline styles, canvas, and chart series. */
  readonly hex: string;
  /** Whether this intent is rate-limited to one instance per view. */
  readonly oncePerView: boolean;
}

export const SEMANTIC_COLORS: Record<SemanticIntent, SemanticColorConfig> = {
  cta: {
    intent: 'cta',
    usage: 'Primary call-to-action button. Maximum one per view.',
    bg: 'bg-[var(--color-primary)]',
    text: 'text-[var(--color-on-primary)]',
    border: 'border-[var(--color-primary)]',
    hex: 'var(--color-primary)',
    oncePerView: true,
  },
  active: {
    intent: 'active',
    usage: 'Active or selected state of a nav item, tab, or toggle.',
    bg: 'bg-primary/20',
    text: 'text-primary',
    border: 'border-primary/30',
    hex: 'var(--color-primary)',
    oncePerView: false,
  },
  success: {
    intent: 'success',
    usage: 'Success confirmation: saved, funded, approved, paid, cleared.',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    hex: '#34d399',
    oncePerView: false,
  },
  negative: {
    intent: 'negative',
    usage: 'Negative financial value, error state, or destructive action.',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    hex: '#ef4444',
    oncePerView: false,
  },
  warning: {
    intent: 'warning',
    usage: 'Non-blocking warning or attention-required alert.',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    hex: '#f59e0b',
    oncePerView: false,
  },
  neutral: {
    intent: 'neutral',
    usage: 'Default surface for badges, chips, and secondary containers.',
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    hex: '#1e293b',
    oncePerView: false,
  },
  neutralAlt: {
    intent: 'neutralAlt',
    usage: 'Raised neutral surface — hover states and nested containers.',
    bg: 'bg-slate-700',
    text: 'text-slate-200',
    border: 'border-slate-600',
    hex: '#334155',
    oncePerView: false,
  },
  onSurface: {
    intent: 'onSurface',
    usage: 'Plain readable text on a dark card. The default for data values.',
    bg: 'bg-transparent',
    text: 'text-white',
    border: 'border-white/10',
    hex: '#ffffff',
    oncePerView: false,
  },
};

/** Intents permitted to render in the reserved emerald accent. */
export const GREEN_SANCTIONED_INTENTS: readonly SemanticIntent[] = [
  'cta',
  'active',
  'success',
] as const;

/** Intents permitted to render in the reserved red accent. */
export const RED_SANCTIONED_INTENTS: readonly SemanticIntent[] = [
  'negative',
] as const;

/** Look up a semantic config, falling back to neutral. */
export function getSemanticColor(intent?: SemanticIntent): SemanticColorConfig {
  return SEMANTIC_COLORS[intent ?? 'neutral'] ?? SEMANTIC_COLORS.neutral;
}

/** True when the intent is allowed to use the emerald accent. */
export function isGreenSanctioned(intent: SemanticIntent): boolean {
  return GREEN_SANCTIONED_INTENTS.includes(intent);
}

/** True when the intent is allowed to use the red accent. */
export function isRedSanctioned(intent: SemanticIntent): boolean {
  return RED_SANCTIONED_INTENTS.includes(intent);
}

/**
 * Resolve the correct classes for a financial delta.
 * Positive values render neutral-on-surface (white) — green is NOT a
 * sanctioned intent for positive figures. Negative values render red.
 */
export function financialToneClasses(value: number): string {
  const config = value < 0 ? SEMANTIC_COLORS.negative : SEMANTIC_COLORS.onSurface;
  return config.text;
}

/** Compose the badge classes (bg + text + border) for an intent. */
export function badgeClasses(intent: SemanticIntent): string {
  const c = getSemanticColor(intent);
  return `${c.bg} ${c.text} ${c.border}`;
}
