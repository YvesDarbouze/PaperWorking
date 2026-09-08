/**
 * Data Visualization Theme Tokens & Constants (@/lib/viz/theme.ts)
 * Governed by Article 3 & Article 4 of the Data Visualization Constitution.
 */

export const VIZ_COLORS = {
  // Primary semantic series
  accent: 'var(--accent, #00DD94)',
  accentHex: '#00DD94',

  // Secondary comparison series
  secondary: 'var(--text-secondary, #9E9DA0)',
  secondaryHex: '#9E9DA0',

  // Caution / Underperformance
  caution: 'var(--status-caution, #F06543)',
  cautionHex: '#F06543',

  // Danger / Severe Stress
  danger: 'var(--danger, #EF4444)',
  dangerHex: '#EF4444',

  // Grid & Surface chrome
  grid: 'rgba(255, 255, 255, 0.05)',
  border: 'var(--border-subtle, rgba(255, 255, 255, 0.10))',
  surface: 'var(--bg-surface, #121014)',
  elevated: 'var(--bg-elevated, #1e1b20)',
  textPrimary: 'var(--text-primary, #fdfffc)',
  textSecondary: 'var(--text-secondary, #9E9DA0)',
  textMuted: 'var(--text-muted, rgba(255, 255, 255, 0.45))',
} as const;

/**
 * Authoritative Series Palette (Order: Accent -> Neutral -> Caution -> Danger).
 * Constitution Article 3 Rule 1: Max 4 series per chart.
 */
export const VIZ_SERIES_PALETTE = [
  VIZ_COLORS.accent,
  VIZ_COLORS.secondary,
  VIZ_COLORS.caution,
  VIZ_COLORS.danger,
] as const;

export const VIZ_SERIES_HEX_PALETTE = [
  VIZ_COLORS.accentHex,
  VIZ_COLORS.secondaryHex,
  VIZ_COLORS.cautionHex,
  VIZ_COLORS.dangerHex,
] as const;

export const VIZ_TYPOGRAPHY = {
  tabular: 'font-mono tabular-nums',
  axisLabel: 'text-[10px] font-semibold uppercase tracking-wider text-slate-400',
  title: 'text-sm font-semibold tracking-tight text-white',
  timeframe: 'text-[10px] font-bold uppercase tracking-wider text-slate-500',
  source: 'text-[10px] text-white/40 tracking-wide',
} as const;
