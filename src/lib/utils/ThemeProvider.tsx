'use client';

/**
 * ThemeProvider.tsx — PaperWorking Global Theme Context
 *
 * Wraps the application so any component can:
 *   1. Read the current surface background color via `useSurface()`
 *   2. Automatically get the correct text/interactive colors via the
 *      contrast hooks without needing to re-implement WCAG logic locally.
 *
 * Usage:
 *   // In layout.tsx (already wraps children):
 *   <ThemeProvider>
 *     {children}
 *   </ThemeProvider>
 *
 *   // In any descendant component:
 *   const { bg, text, isOnDark } = useSurface();
 *
 * Surface Registration:
 *   Wrap a section in <SurfaceProvider bg="#595959"> to declare that all
 *   children are rendering on that background. Children automatically
 *   receive the correct contrast color without prop-drilling.
 *
 *   <SurfaceProvider bg={phaseColor}>
 *     <PhaseCard />   ← calls useSurface(), gets white text automatically
 *   </SurfaceProvider>
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  getContrastColor,
  getContrastRatio,
  PW_COLORS,
  type PWColor,
} from '@/lib/utils/contrast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SurfaceContextValue {
  /** The background color of the closest ancestor SurfaceProvider */
  bg: string;
  /** The highest-contrast text color for this surface */
  text: '#0d0d0d' | '#ffffff';
  /** Whether this surface uses white text (i.e., is a dark surface) */
  isOnDark: boolean;
  /** WCAG contrast ratio of text on this bg */
  ratio: number;
  /** Muted text — checked to still pass WCAG AA on this bg */
  mutedText: string;
  /** Hover overlay color for interactive elements on this surface */
  hoverOverlay: string;
  /** Active/pressed overlay color for interactive elements */
  activeOverlay: string;
  /** Focus ring color — always full-contrast opposite of bg */
  focusRingColor: string;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SurfaceContext = createContext<SurfaceContextValue>({
  bg:             PW_COLORS.bg,
  text:           PW_COLORS.black,
  isOnDark:       false,
  ratio:          17.1,
  mutedText:      PW_COLORS.muted,
  hoverOverlay:   'rgba(0,0,0,0.06)',
  activeOverlay:  'rgba(0,0,0,0.12)',
  focusRingColor: PW_COLORS.black,
});

// ─── Surface Provider ────────────────────────────────────────────────────────

interface SurfaceProviderProps {
  bg: string;
  children: ReactNode;
}

/**
 * Registers a surface background color so all descendant components can
 * call useSurface() to get the correct contrast colors without prop-drilling.
 *
 * @example
 *   <SurfaceProvider bg="#595959">
 *     <PhaseClosedCard />
 *   </SurfaceProvider>
 */
export function SurfaceProvider({ bg, children }: SurfaceProviderProps) {
  const value = useMemo<SurfaceContextValue>(() => {
    const text     = getContrastColor(bg);
    const isOnDark = text === PW_COLORS.white;
    const ratio    = getContrastRatio(bg, text);

    // Muted text: PW muted token if it passes WCAG AA, else primary text color
    let mutedText: string = text;
    try {
      const mutedToken = isOnDark ? PW_COLORS.white : PW_COLORS.muted;
      const mutedRatio = getContrastRatio(bg, mutedToken);
      if (mutedRatio >= 4.5) mutedText = mutedToken;
    } catch { /* fallback already set */ }

    return {
      bg,
      text,
      isOnDark,
      ratio,
      mutedText,
      hoverOverlay:   isOnDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
      activeOverlay:  isOnDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
      focusRingColor: isOnDark ? PW_COLORS.white           : PW_COLORS.black,
    };
  }, [bg]);

  return (
    <SurfaceContext.Provider value={value}>
      {children}
    </SurfaceContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns the current surface context — background color and all computed
 * contrast values. Must be called inside a SurfaceProvider.
 *
 * Falls back to the default PW canvas (#f2f2f2 → dark text) if no
 * SurfaceProvider is in scope.
 *
 * @example
 *   function PhaseLabel() {
 *     const { text, mutedText, isOnDark } = useSurface();
 *     return <p style={{ color: mutedText }}>Phase 04 · Closed</p>;
 *   }
 */
export function useSurface(): SurfaceContextValue {
  return useContext(SurfaceContext);
}

// ─── Root Theme Provider ─────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Root-level provider. Wraps the entire app so all components
 * have access to the surface context without extra configuration.
 * Already uses the PW default canvas (#f2f2f2).
 *
 * Add this in src/app/layout.tsx around {children}.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <SurfaceProvider bg={PW_COLORS.bg}>
      {children}
    </SurfaceProvider>
  );
}
