'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme, useSurface } from '@/lib/utils/ThemeProvider';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Brand Logo Component (v5 audited)
   
   Renders canonical PNG brand assets with surface-aware
   theme, variant, and breakpoint resolution.

   Source resolution caveat
   ────────────────────────
   Full lockup sources are 225×37 px. Icon sources are
   25×23 px. On Retina / HiDPI (every Mac, every modern
   phone), an h-8 nav logo needs ~64 px-tall source to
   render pixel-perfect. The current 37 px lockup will
   appear slightly soft on HiDPI at sizes above ~18 px.
   When higher-res exports (2×–4× from vector source)
   become available, drop them in /public/brand/ under
   the same filenames and the pipeline handles the rest.
   `unoptimized` is set deliberately because upscaling
   tiny PNGs through next/image optimization is
   counter-productive.

   Surface presets (v5 audit fixes)
   ────────────────────────────────
   - marketing-nav:    auto theme (was hardcoded 'light' — Bug #1)
   - marketing-footer: auto theme (was hardcoded 'dark' — Bug #2)
   - app-sidebar:      auto theme
   - app-topbar:       auto theme
   - auth:             explicit 'dark' (bg is always #0d0a0b)
   - empty-state:      auto theme
   - loading:          auto theme
   - email:            explicit 'light' (email bg is always white)
   - pdf:              explicit 'light' (page bg is always white)
   ═══════════════════════════════════════════════════════ */

type SizeKey = 'h-6' | 'h-8' | 'h-10' | 'h-12' | 'h-16' | 'sm' | 'md' | 'lg' | 'xl';

/** Whether a surface is above-the-fold and should eagerly load. */
const ABOVE_FOLD_SURFACES = new Set([
  'marketing-nav',
  'app-sidebar',
  'app-topbar',
  'auth',
]);

interface LogoProps {
  /** Target link when clicked. If omitted, renders non-interactively. */
  href?: string;
  /** Explicit variant override. Omit to let surface context decide. */
  variant?: 'full' | 'icon' | 'wordmark';
  /** Explicit theme override ('light' | 'dark' | 'auto'). Defaults to 'auto'. */
  theme?: 'light' | 'dark' | 'auto';
  /** Screen-reader alt text override. */
  alt?: string;
  /** Tailwind spacing token height or raw px number. Maps default heights if omitted. */
  size?: SizeKey | number;
  /** Tailwind classes for margins, positioning, or custom animations. */
  className?: string;
  /** Identifies layout context for automatic theme, variant, and breakpoint selection. */
  surface?:
    | 'marketing-nav'
    | 'marketing-footer'
    | 'app-sidebar'
    | 'app-topbar'
    | 'auth'
    | 'empty-state'
    | 'loading'
    | 'email'
    | 'pdf'
    | 'custom';
  /** For sidebars to force the icon-only variant. */
  collapsed?: boolean;
  /** Paired with visible text (disables redundant alt narration). */
  paired?: boolean;
}

const heightMap: Record<SizeKey, number> = {
  'h-6': 24,
  'h-8': 32,
  'h-10': 40,
  'h-12': 48,
  'h-16': 64,
  sm: 20,
  md: 24,
  lg: 30,
  xl: 40,
};

const ASPECT_RATIOS = {
  full: 225 / 37,
  icon: 25 / 23,
  wordmark: 199 / 37,
};

export default function Logo({
  href,
  variant,
  theme = 'auto',
  alt,
  size,
  className = '',
  surface = 'custom',
  collapsed = false,
  paired = false,
}: LogoProps) {
  const { theme: appTheme } = useTheme();
  const { isOnDark } = useSurface();

  const isAboveFold = ABOVE_FOLD_SURFACES.has(surface);

  // Helper to render a single logo graphic with rigid dimensions
  const renderSingleGraphic = (
    v: 'full' | 'icon' | 'wordmark',
    t: 'light' | 'dark' | 'auto',
    s: SizeKey | number | undefined,
    extraClass: string = ''
  ) => {
    // Resolve theme: 'light' (black assets) or 'dark' (white assets)
    let resolvedTheme: 'light' | 'dark' = 'light';
    if (t === 'dark') {
      resolvedTheme = 'dark';
    } else if (t === 'light') {
      resolvedTheme = 'light';
    } else {
      // auto: resolve from nearest SurfaceProvider, then app theme
      resolvedTheme = (isOnDark || appTheme === 'dark') ? 'dark' : 'light';
    }

    // Resolve size / height
    let resolvedHeight = 24; // default md
    if (typeof s === 'number') {
      resolvedHeight = s;
    } else if (s && s in heightMap) {
      resolvedHeight = heightMap[s as SizeKey];
    } else {
      // Defaults based on variant
      resolvedHeight = v === 'icon' ? 24 : 32;
    }

    const resolvedWidth = Math.round(resolvedHeight * ASPECT_RATIOS[v]);

    // Choose image source path
    let imgSrc = '';
    let filterStyle: React.CSSProperties = {};

    if (v === 'full') {
      imgSrc = resolvedTheme === 'dark'
        ? '/brand/PaperWorking_White_full_Logo_.png'
        : '/brand/PaperWorking_Black_full_Logo_.png';
    } else if (v === 'icon') {
      imgSrc = resolvedTheme === 'dark'
        ? '/brand/PaperWorking_White_Logo_Icon.png'
        : '/brand/PaperWorking_Black_Logo_Icon.png';
    } else if (v === 'wordmark') {
      imgSrc = '/brand/PaperWorking_Logo_Logotype.png';
      if (resolvedTheme === 'dark') {
        filterStyle = { filter: 'brightness(0) invert(1)' };
      }
    }

    // Resolve accessibility alt text
    let resolvedAlt = alt ?? 'PaperWorking';
    if (v === 'icon' && paired) {
      resolvedAlt = '';
    }

    return (
      <Image
        src={imgSrc}
        alt={resolvedAlt}
        width={resolvedWidth}
        height={resolvedHeight}
        unoptimized
        loading={isAboveFold ? 'eager' : 'lazy'}
        fetchPriority={isAboveFold ? 'high' : undefined}
        style={{
          height: `${resolvedHeight}px`,
          width: 'auto',
          flexShrink: 0,
          ...filterStyle,
        }}
        className={`max-w-none select-none shrink-0 ${extraClass || 'block'}`}
      />
    );
  };

  // ─── Surface rendering matrix ──────────────────────────────────
  // Theme values here come from the Prompt 0 surface audit.
  // Surfaces with themed (variable) backgrounds use `theme` (caller's
  // value, defaulting to 'auto') so the auto resolver picks the
  // correct variant. Surfaces with fixed backgrounds use explicit
  // 'light' or 'dark'.

  let logoContent: React.ReactNode = null;

  if (surface === 'marketing-nav') {
    // BG: var(--color-background) — themed. Auto resolves correctly.
    const navSize = size ?? 'h-8';
    logoContent = (
      <>
        {renderSingleGraphic('full', theme, navSize, 'hidden md:block')}
        {renderSingleGraphic('icon', theme, navSize, 'block md:hidden')}
      </>
    );
  } else if (surface === 'marketing-footer') {
    // BG: inherits page var(--color-background) — themed.
    // v4 hardcoded 'dark' here → white logo invisible on light theme.
    logoContent = renderSingleGraphic('full', theme, size ?? 'h-10');
  } else if (surface === 'app-sidebar') {
    // BG: Dark: #121317→#0d0a0b gradient, Light: #FDFFFC — themed.
    if (collapsed) {
      logoContent = renderSingleGraphic('icon', theme, size ?? 'h-6');
    } else {
      const desktopSize = size ?? 'lg'; // 30px
      const mobileSize = size ?? 'h-8'; // 32px
      logoContent = (
        <>
          {renderSingleGraphic('full', theme, desktopSize, 'hidden md:block')}
          {renderSingleGraphic('icon', theme, mobileSize, 'block md:hidden')}
        </>
      );
    }
  } else if (surface === 'app-topbar') {
    // BG: Dark: rgba(18,16,20,0.88), Light: rgba(253,255,252,0.92) — themed.
    logoContent = renderSingleGraphic('icon', theme, size ?? 'h-8');
  } else if (surface === 'auth') {
    // BG: #0d0a0b — always dark. Explicit theme.
    logoContent = renderSingleGraphic('full', 'dark', size ?? 'h-12');
  } else if (surface === 'empty-state') {
    // BG: themed canvas. Auto resolves.
    logoContent = renderSingleGraphic('icon', theme, size ?? 'h-12');
  } else if (surface === 'loading') {
    // BG: themed canvas. Auto resolves.
    logoContent = renderSingleGraphic('icon', theme, size ?? 'h-8', 'animate-pulse');
  } else if (surface === 'email') {
    // BG: #ffffff — always light. Explicit theme.
    logoContent = renderSingleGraphic('full', 'light', size ?? 'h-8');
  } else if (surface === 'pdf') {
    // BG: white page — always light. Explicit theme.
    logoContent = renderSingleGraphic('full', 'light', size ?? 'h-8');
  } else {
    // Custom / Fallback
    const targetVariant = variant ?? 'full';
    logoContent = renderSingleGraphic(targetVariant, theme, size);
  }

  // Wrap in a Link if href is specified
  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex transition-opacity duration-150 hover:opacity-75 focus-visible:opacity-75 focus-visible:outline-none shrink-0 ${className}`}
        aria-label={`${alt ?? 'PaperWorking'} — Return to homepage`}
      >
        {logoContent}
      </Link>
    );
  }

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`}>
      {logoContent}
    </span>
  );
}
