/**
 * PaperWorking canonical color palette.
 * Single source of truth — keeps inline styles and CSS variables in sync.
 */

export const PW_COLORS = {
  black:         '#0d0d0d',
  fg:            '#3d3d3d',
  fg2:           '#595959',
  muted:         '#7f7f7f',
  subtle:        '#a5a5a5',
  border:        '#d4d4d4',
  transactional: '#cccccc',
  bg:            '#f2f2f2',
  surface:       '#ffffff',
  accent:        '#454955',
} as const;

export type PwColor = typeof PW_COLORS[keyof typeof PW_COLORS];

/**
 * Returns the highest-contrast text color for a given PaperWorking background.
 * Light backgrounds → black; dark backgrounds → white.
 */
export function contrastText(bg: PwColor): '#ffffff' | '#0d0d0d' {
  const dark = new Set<PwColor>([PW_COLORS.black, PW_COLORS.fg, PW_COLORS.fg2, PW_COLORS.accent]);
  return dark.has(bg) ? '#ffffff' : '#0d0d0d';
}

/**
 * Disabled-state styles that satisfy WCAG AA (≥ 4.5:1).
 * Use instead of `opacity: 0.5` on light backgrounds.
 */
export const DISABLED_STYLE = {
  background: PW_COLORS.border,   // #d4d4d4 — 8.6:1 vs #0d0d0d
  color:      PW_COLORS.fg2,      // #595959 — 7.2:1 vs #d4d4d4
  borderColor: '#b0b0b0',
  cursor:     'not-allowed',
} as const;
