/**
 * UX-0 Token Layer — Single Source of Truth for Design System Tokens
 *
 * Derived from AGENTS.md v3 Global Navigation & Theme Contract and globals.css:
 * - Dark Canvas: rgba(18,16,20,0.98) (Hex: #121014)
 * - Light/Foreground Text: #FDFFFC
 * - Dark Border: rgba(253,255,252,0.07)
 * - Muted Text: rgba(253,255,252,0.60)
 * - Brand Accent: #EA580C
 * - Success Accent: #10B981
 */

export const UX0_TOKENS = {
  colors: {
    darkCanvas: 'var(--color-surface, #121014)',
    darkSurface: 'var(--color-surface-dim, rgba(18, 16, 20, 0.98))',
    textPrimary: 'var(--color-on-surface, #FDFFFC)',
    textMuted: 'var(--color-on-surface-variant, rgba(253, 255, 252, 0.60))',
    borderSubtle: 'var(--color-outline-variant, rgba(253, 255, 252, 0.07))',
    borderAccent: 'var(--color-primary-container, rgba(234, 88, 12, 0.30))',
    brandAccent: 'var(--color-primary, #EA580C)',
    successAccent: 'var(--color-status-info, #10B981)',
    statusSuccessContainer: 'var(--color-status-success-container)',
    statusSuccess: 'var(--color-status-success)',
  },
  typography: {
    readabilityFloor: 'text-sm', // 14px effective typography floor (UX-2)
  },
  greenSemanticsPolicy: {
    rule: 'Green is reserved for passing states, positive status chips (LIVE), and single primary CTA per view. Never on headings, tab labels, section titles, or decorative borders.',
  },
} as const;

export type UX0Tokens = typeof UX0_TOKENS;
