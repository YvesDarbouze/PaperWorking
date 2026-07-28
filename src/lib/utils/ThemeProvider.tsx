'use client';

import React, { createContext, useContext, useMemo, ReactNode, useState, useEffect, useCallback } from 'react';
import {
  getContrastColor,
  getContrastRatio,
  PW_COLORS,
  type PWColor,
} from '@/lib/utils/contrast';

// ─── Theme Toggle Context ────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark';

interface ThemeToggleContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeToggleContext = createContext<ThemeToggleContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function useTheme(): ThemeToggleContextValue {
  return useContext(ThemeToggleContext);
}

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
 * have access to the surface context and theme toggle without extra configuration.
 *
 * Theme is persisted in localStorage under "pw-theme".
 * The <html> element receives data-theme="light"|"dark" and class "light"|"dark".
 *
 * Add this in src/app/layout.tsx around {children}.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    try { localStorage.setItem('pw-theme', mode); } catch { /* SSR guard */ }
  }, []);

  // Sync on mount from localStorage or system preference
  useEffect(() => {
    let saved: ThemeMode | null = null;
    try {
      saved = localStorage.getItem('pw-theme') as ThemeMode | null;
    } catch { /* SSR guard */ }

    const resolved: ThemeMode =
      saved === 'light' || saved === 'dark'
        ? saved
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    applyTheme(resolved);
    setThemeState(resolved);
  }, [applyTheme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    applyTheme(mode);
    setThemeState(mode);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  const bg = theme === 'dark' ? PW_COLORS.nightBg : '#FDFFFC';

  return (
    <ThemeToggleContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <SurfaceProvider bg={bg}>
        {children}
      </SurfaceProvider>
    </ThemeToggleContext.Provider>
  );
}
