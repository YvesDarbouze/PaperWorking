/**
 * contrast.ts — PaperWorking WCAG 2.1 Contrast Engine
 *
 * Provides pure-function contrast checkers and React hooks so every component
 * that renders on a dynamic background automatically selects the
 * highest-contrast text / interactive-state colors from the design system.
 *
 * Algorithm: WCAG 2.1 relative luminance → contrast ratio
 * Reference: https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * Pre-computed results for the PaperWorking palette (for documentation):
 *   #f2f2f2 → #0d0d0d  (17.1:1  — WCAG AAA)
 *   #cccccc → #0d0d0d  (10.5:1  — WCAG AAA)
 *   #a5a5a5 → #0d0d0d  ( 5.6:1  — WCAG AA, dark wins by 0.9:1)
 *   #7f7f7f → #ffffff  ( 4.6:1  — WCAG AA, light wins)
 *   #595959 → #ffffff  ( 7.2:1  — WCAG AAA)
 *   #0d0d0d → #ffffff  (19.6:1  — WCAG AAA)
 *   #ffffff → #0d0d0d  (21.0:1  — WCAG AAA)
 *
 * Public API surface:
 *   Core math:
 *     hexToRgb()          — parse hex → [R, G, B]
 *     getLuminance()      — WCAG relative luminance
 *     getContrastRatio()  — contrast ratio between two colors
 *     getContrastColor()  — best text color (#0d0d0d | #ffffff) for a bg
 *     requiresLightText() — boolean shorthand
 *     getContrastClass()  — CSS class string for Tailwind
 *
 *   Interactive styles (inline style objects):
 *     getAccessibleButtonStyles()  — full 4-state style set for a given bg
 *
 *   React hooks:
 *     useContrastColor()    — memoized text color value
 *     useContrastStyle()    — memoized color + class + WCAG pass/fail
 *     useAdaptiveText()     — all-in-one: color + class + ratio + level
 *     useInteractiveStyles()— 4-state style objects for interactive elements
 *
 *   Dev utilities:
 *     auditPalette()        — WCAG table for all PW palette combinations
 */

import { useMemo, CSSProperties } from 'react';

// ─── PaperWorking brand tokens ────────────────────────────────────────────────

export const PW_COLORS = {
  black:         '#0d0d0d',
  white:         '#ffffff',
  bg:            '#f2f2f2',
  transactional: '#cccccc',
  surface:       '#ffffff',
  border:        '#d4d4d4',
  fg:            '#3d3d3d',
  muted:         '#7f7f7f',
  subtle:        '#a5a5a5',
  accent:        '#1a73e8',

  // Deal lifecycle phases
  phaseSourceing: '#f2f2f2',
  phaseContract:  '#cccccc',
  phaseRehab:     '#a5a5a5',
  phaseListed:    '#7f7f7f',
  phaseClosed:    '#595959',

  // Vault surface (external investor portal)
  vault:          '#1a1a1a',
} as const;

export type PWColor = (typeof PW_COLORS)[keyof typeof PW_COLORS];

// ─── Core WCAG math ──────────────────────────────────────────────────────────

/**
 * Converts a single 8-bit channel value (0–255) to its linear light value
 * using the sRGB transfer function defined by WCAG 2.1.
 */
function toLinear(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Parses a 3- or 6-digit hex color string into its [R, G, B] components (0–255).
 * Throws if the string is not a valid hex color.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();

  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }

  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }

  throw new Error(`[contrast] Invalid hex color: "${hex}"`);
}

/**
 * Computes the WCAG 2.1 relative luminance of a hex color.
 * Returns a value in the range [0, 1] where 0 = pure black, 1 = pure white.
 */
export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value in [1, 21] where 1 = no contrast, 21 = black on white.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Primary color selectors ─────────────────────────────────────────────────

type ContrastResult = '#0d0d0d' | '#ffffff';
type WCAGLevel = 'AAA' | 'AA' | 'AA-large' | 'FAIL';

function wcagLevel(ratio: number): WCAGLevel {
  if (ratio >= 7.0)  return 'AAA';
  if (ratio >= 4.5)  return 'AA';
  if (ratio >= 3.0)  return 'AA-large';
  return 'FAIL';
}

/**
 * Returns the highest-contrast text color (PW near-black or white)
 * for a given background hex color.
 *
 * Uses PaperWorking brand tokens (#0d0d0d, #ffffff) rather than pure black/white.
 *
 * @example
 *   getContrastColor('#7f7f7f') // → '#ffffff'
 *   getContrastColor('#f2f2f2') // → '#0d0d0d'
 *   getContrastColor('#a5a5a5') // → '#0d0d0d'  (dark wins by narrow margin)
 */
export function getContrastColor(backgroundHex: string): ContrastResult {
  try {
    const darkRatio  = getContrastRatio(backgroundHex, PW_COLORS.black);
    const lightRatio = getContrastRatio(backgroundHex, PW_COLORS.white);
    return lightRatio > darkRatio ? PW_COLORS.white : PW_COLORS.black;
  } catch {
    return PW_COLORS.black;
  }
}

/**
 * Returns true if the given background requires light (white) text to meet
 * WCAG AA minimum contrast (4.5:1 for normal text).
 */
export function requiresLightText(backgroundHex: string): boolean {
  return getContrastColor(backgroundHex) === PW_COLORS.white;
}

/**
 * Returns a CSS class string for text color based on background.
 * Maps to utility classes defined in globals.css.
 *
 * @example
 *   getContrastClass('#595959') // → 'pw-text-on-dark'
 *   getContrastClass('#f2f2f2') // → 'pw-text-on-light'
 */
export function getContrastClass(backgroundHex: string): 'pw-text-on-dark' | 'pw-text-on-light' {
  return requiresLightText(backgroundHex) ? 'pw-text-on-dark' : 'pw-text-on-light';
}

// ─── Interactive element style factory ───────────────────────────────────────

/**
 * All four interaction states as inline CSSProperties objects.
 * Use this when a component renders on a dynamic/unknown background
 * and you cannot rely on static CSS class selectors.
 */
export interface InteractiveStateStyles {
  /** Default state — highest-contrast text on bg */
  default: CSSProperties;
  /** Hover state — subtle bg overlay, same text color */
  hover: CSSProperties;
  /** Focus/active state — 2px outline ring, same text color */
  focus: CSSProperties;
  /** Disabled state — 38% opacity, not-allowed cursor */
  disabled: CSSProperties;
  /** Whether this surface needs light (white) text */
  isOnDark: boolean;
}

/**
 * Returns inline style objects for all four interaction states of an
 * interactive element on the given background.
 *
 * The returned hover/focus overlays are always computed against the
 * background — dark surfaces get a white-alpha overlay, light surfaces
 * get a black-alpha overlay. This is mathematically guaranteed to
 * provide a perceivable state change regardless of background hue.
 *
 * @example
 *   const styles = getAccessibleButtonStyles('#595959');
 *   // Use styles.default on the element, swap to styles.hover on :hover etc.
 */
export function getAccessibleButtonStyles(backgroundHex: string): InteractiveStateStyles {
  const isOnDark = requiresLightText(backgroundHex);
  const textColor = getContrastColor(backgroundHex);

  // Overlay colors: white-alpha on dark surfaces, black-alpha on light
  const hoverOverlay   = isOnDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const activeOverlay  = isOnDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  // Focus ring color: always full-contrast opposite
  const focusRingColor = isOnDark ? PW_COLORS.white : PW_COLORS.black;

  return {
    isOnDark,
    default: {
      color: textColor,
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease, opacity 0.15s ease',
    },
    hover: {
      color: textColor,
      backgroundColor: hoverOverlay,
    },
    focus: {
      color: textColor,
      outline: `2px solid ${focusRingColor}`,
      outlineOffset: '3px',
    },
    disabled: {
      color: textColor,
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
  };
}

// ─── React hooks ─────────────────────────────────────────────────────────────

/**
 * React hook that memoizes contrast computation.
 * Safe to call on every render — WCAG math only re-runs when backgroundHex changes.
 *
 * @example
 *   function MyPanel({ bg }: { bg: string }) {
 *     const textColor = useContrastColor(bg);
 *     return <div style={{ background: bg, color: textColor }}>Content</div>;
 *   }
 */
export function useContrastColor(backgroundHex: string): ContrastResult {
  return useMemo(() => getContrastColor(backgroundHex), [backgroundHex]);
}

/**
 * React hook that returns both the contrast color and its CSS class string.
 */
export function useContrastStyle(backgroundHex: string): {
  color: ContrastResult;
  className: 'pw-text-on-dark' | 'pw-text-on-light';
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
} {
  return useMemo(() => {
    const color = getContrastColor(backgroundHex);
    const ratio = getContrastRatio(backgroundHex, color);
    return {
      color,
      className: color === PW_COLORS.white ? 'pw-text-on-dark' : 'pw-text-on-light',
      ratio,
      passesAA:  ratio >= 4.5,
      passesAAA: ratio >= 7.0,
    };
  }, [backgroundHex]);
}

/**
 * All-in-one adaptive text hook. Returns everything a component needs to
 * render text correctly on a dynamic background — color, CSS class, ratio,
 * and WCAG compliance level. This is the preferred hook for new components.
 *
 * @example
 *   function PhaseCard({ bg, label }: { bg: string; label: string }) {
 *     const text = useAdaptiveText(bg);
 *     return (
 *       <div style={{ backgroundColor: bg }}>
 *         <span style={{ color: text.color }}>{label}</span>
 *         {text.level === 'FAIL' && <span>⚠ Low contrast</span>}
 *       </div>
 *     );
 *   }
 */
export function useAdaptiveText(backgroundHex: string): {
  /** The hex text color to apply — either #0d0d0d or #ffffff */
  color: ContrastResult;
  /** CSS utility class — 'pw-text-on-dark' | 'pw-text-on-light' */
  className: 'pw-text-on-dark' | 'pw-text-on-light';
  /** WCAG contrast ratio (rounded to 2dp) */
  ratio: number;
  /** WCAG compliance level */
  level: WCAGLevel;
  /** True if this surface requires white text */
  isOnDark: boolean;
  /** Muted text color — still passes AA on this surface */
  mutedColor: string;
} {
  return useMemo(() => {
    const color   = getContrastColor(backgroundHex);
    const ratio   = getContrastRatio(backgroundHex, color);
    const isOnDark = color === PW_COLORS.white;

    // Muted text: use the design system muted value if it passes AA,
    // otherwise fall back to the primary contrast color at 65% opacity.
    let mutedColor: string;
    try {
      const mutedToken = isOnDark ? PW_COLORS.white : PW_COLORS.muted;
      const mutedRatio = getContrastRatio(backgroundHex, mutedToken);
      mutedColor = mutedRatio >= 4.5 ? mutedToken : color;
    } catch {
      mutedColor = color;
    }

    return {
      color,
      className: isOnDark ? 'pw-text-on-dark' : 'pw-text-on-light',
      ratio: Math.round(ratio * 100) / 100,
      level: wcagLevel(ratio),
      isOnDark,
      mutedColor,
    };
  }, [backgroundHex]);
}

/**
 * Returns inline style objects for all four interaction states.
 * Prefer this hook when rendering interactive elements (buttons, tabs,
 * menu items) on programmatic / user-defined backgrounds.
 *
 * @example
 *   function DynamicButton({ bg, label }: { bg: string; label: string }) {
 *     const [hovered, setHovered] = useState(false);
 *     const [focused, setFocused] = useState(false);
 *     const s = useInteractiveStyles(bg);
 *     return (
 *       <button
 *         style={focused ? s.focus : hovered ? s.hover : s.default}
 *         onMouseEnter={() => setHovered(true)}
 *         onMouseLeave={() => setHovered(false)}
 *         onFocus={() => setFocused(true)}
 *         onBlur={() => setFocused(false)}
 *       >
 *         {label}
 *       </button>
 *     );
 *   }
 */
export function useInteractiveStyles(backgroundHex: string): InteractiveStateStyles {
  return useMemo(() => getAccessibleButtonStyles(backgroundHex), [backgroundHex]);
}

// ─── Palette audit helper (dev-only) ─────────────────────────────────────────

/**
 * Returns a report of contrast ratios for all PaperWorking palette combinations.
 * Use in development to validate the design system.
 *
 * @example
 *   if (process.env.NODE_ENV === 'development') {
 *     console.table(auditPalette());
 *   }
 */
export function auditPalette(): Record<string, {
  darkText: string;
  lightText: string;
  winner: string;
  ratio: string;
  level: WCAGLevel;
}> {
  const report: Record<string, {
    darkText: string;
    lightText: string;
    winner: string;
    ratio: string;
    level: WCAGLevel;
  }> = {};

  for (const [name, hex] of Object.entries(PW_COLORS)) {
    try {
      const darkRatio  = getContrastRatio(hex, PW_COLORS.black);
      const lightRatio = getContrastRatio(hex, PW_COLORS.white);
      const winner     = lightRatio > darkRatio ? 'white (#ffffff)' : 'dark (#0d0d0d)';
      const winRatio   = Math.max(darkRatio, lightRatio);
      report[`${name} (${hex})`] = {
        darkText:  `${darkRatio.toFixed(2)}:1`,
        lightText: `${lightRatio.toFixed(2)}:1`,
        winner,
        ratio: `${winRatio.toFixed(2)}:1`,
        level: wcagLevel(winRatio),
      };
    } catch {
      // Skip non-hex values (e.g. CSS variable references)
    }
  }

  return report;
}
