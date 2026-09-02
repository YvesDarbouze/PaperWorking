'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme, useSurface } from '@/lib/utils/ThemeProvider';
import { PaperWorkingIcon } from '@/components/brand/icons/PaperWorkingIcon';
import { PaperWorkingLogotype } from '@/components/brand/icons/PaperWorkingLogotype';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Brand Logo Component (v6, vector)

   Renders the canonical inline SVG icon/logotype with
   surface-aware theme, variant, and breakpoint resolution.
   Color is driven by CSS `color` (fill="currentColor" on
   the source SVGs) — no more separate black/white asset
   files, and no upscale-blur ceiling since these are vector.

   Surface presets (unchanged from v5 audit)
   ────────────────────────────────
   - marketing-nav:    auto theme
   - marketing-footer: auto theme
   - app-sidebar:      auto theme
   - app-topbar:       auto theme
   - auth:             explicit 'dark' (bg is always #0d0a0b)
   - empty-state:      auto theme
   - loading:          auto theme
   - email:            explicit 'light' (email bg is always white)
   - pdf:              explicit 'light' (page bg is always white)

   Note: email templates and jsPDF-based PDF exports can't
   render inline/currentColor SVG (poor email-client SVG support,
   and jsPDF.addImage requires a raster image) — those two
   contexts continue to reference the raster PNGs in
   /public/brand/ directly, regenerated from this same vector
   source at proper resolution. See public/brand/README.md.
   ═══════════════════════════════════════════════════════ */

type SizeKey = 'h-6' | 'h-8' | 'h-10' | 'h-12' | 'h-16' | 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  /** Target link when clicked. If omitted, renders non-interactively. */
  href?: string;
  /** Explicit variant override. Omit to let surface context decide. */
  variant?: 'full' | 'icon';
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
  full: 400 / 51.38,
  icon: 1.0,
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

  // Helper to render a single logo graphic with rigid dimensions
  const renderSingleGraphic = (
    v: 'full' | 'icon',
    t: 'light' | 'dark' | 'auto',
    s: SizeKey | number | undefined,
    extraClass: string = ''
  ) => {
    // Resolve theme: 'light' (black) or 'dark' (white)
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
      // Defaults based on variant & surface (UX-10: dashboard chrome downsized 10% from 32px -> 28.8px)
      const isDashboardChrome = surface === 'app-sidebar' || surface === 'app-topbar';
      const baseHeight = v === 'icon' ? 24 : 32;
      resolvedHeight = isDashboardChrome ? baseHeight * 0.9 : baseHeight;
    }

    const resolvedWidth = Math.round(resolvedHeight * ASPECT_RATIOS[v]);
    const color = resolvedTheme === 'dark' ? '#fff' : '#000';

    // Resolve accessibility: icon paired with visible text should not be
    // double-announced by a screen reader; standalone graphics need a name.
    const isDecorative = v === 'icon' && paired;
    const resolvedAlt = alt ?? 'PaperWorking';

    const SvgComponent = v === 'full' ? PaperWorkingLogotype : PaperWorkingIcon;

    return (
      <SvgComponent
        width={resolvedWidth}
        height={resolvedHeight}
        role={isDecorative ? undefined : 'img'}
        aria-label={isDecorative ? undefined : resolvedAlt}
        aria-hidden={isDecorative ? true : undefined}
        style={{ color, flexShrink: 0 }}
        className={`max-w-none select-none shrink-0 ${extraClass || 'block'}`}
      />
    );
  };

  // ─── Surface rendering matrix (unchanged from v5 audit) ────────

  let logoContent: React.ReactNode = null;

  if (surface === 'marketing-nav') {
    const navSize = size ?? 'h-8';
    logoContent = (
      <>
        {renderSingleGraphic('full', theme, navSize, 'hidden md:block')}
        {renderSingleGraphic('icon', theme, navSize, 'block md:hidden')}
      </>
    );
  } else if (surface === 'marketing-footer') {
    logoContent = renderSingleGraphic('full', theme, size ?? 'h-10');
  } else if (surface === 'app-sidebar') {
    if (collapsed) {
      logoContent = renderSingleGraphic('icon', theme, size ?? 19.2);
    } else {
      const desktopSize = size ?? 24; // 30px - 20% = 24px
      const mobileSize = size ?? 25.6; // 32px - 20% = 25.6px
      logoContent = (
        <>
          {renderSingleGraphic('full', theme, desktopSize, 'hidden md:block')}
          {renderSingleGraphic('icon', theme, mobileSize, 'block md:hidden')}
        </>
      );
    }
  } else if (surface === 'app-topbar') {
    logoContent = renderSingleGraphic('icon', theme, size ?? 25.6); // 32px - 20% = 25.6px
  } else if (surface === 'auth') {
    logoContent = renderSingleGraphic('full', 'dark', size ?? 'h-12');
  } else if (surface === 'empty-state') {
    logoContent = renderSingleGraphic('icon', theme, size ?? 'h-12');
  } else if (surface === 'loading') {
    logoContent = renderSingleGraphic('icon', theme, size ?? 'h-8', 'animate-pulse');
  } else if (surface === 'email') {
    logoContent = renderSingleGraphic('full', 'light', size ?? 'h-8');
  } else if (surface === 'pdf') {
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
