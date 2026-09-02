'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme, useSurface } from '@/lib/utils/ThemeProvider';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Brand Logo Component (Canonical Masters)
   
   Renders the canonical master raster brand assets with
   surface-aware theme, variant, and responsive breakpoint resolution.
   
   Aspect ratios:
   - Full Logotype: 1926 / 311 (≈6.1929:1)
   - Icon:          2134 / 2134 (1.0:1)

   Master Assets:
   - /brand/paperworking-logotype-white-transparent.png
   - /brand/paperworking-logotype-black-transparent.png
   - /brand/paperworking-icon-white-transparent.png
   - /brand/paperworking-icon-black-transparent.png
   - /brand/paperworking-icon-white-on-black.png
   - /brand/paperworking-icon-black-on-white.png
   ═══════════════════════════════════════════════════════ */

type SizeKey = 'h-6' | 'h-8' | 'h-10' | 'h-12' | 'h-16' | 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  /** Target link when clicked. Defaults to '/' to return to homepage. */
  href?: string;
  /** Explicit variant override. Omit to let surface context decide. */
  variant?: 'full' | 'icon' | 'icon-solid';
  /** Explicit theme override ('light' | 'dark' | 'auto'). Defaults to 'auto'. */
  theme?: 'light' | 'dark' | 'auto';
  /** Screen-reader alt text override. */
  alt?: string;
  /** Tailwind spacing token height or raw px number. */
  size?: SizeKey | number;
  /** Tailwind classes for margins, positioning, or custom styling. */
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
  /** Force unoptimized <img> for SSR/PDF/Email contexts. */
  unoptimized?: boolean;
  /** Priority loading flag for above-the-fold banners. */
  priority?: boolean;
}

const heightMap: Record<SizeKey, number> = {
  'h-6': 24,
  'h-8': 32,
  'h-10': 40,
  'h-12': 48,
  'h-16': 64,
  sm: 24,
  md: 28,
  lg: 32,
  xl: 40,
};

const ASPECT_RATIOS = {
  full: 1926 / 311,
  icon: 1.0,
  'icon-solid': 1.0,
};

export default function Logo({
  href = '/',
  variant,
  theme = 'auto',
  alt,
  size,
  className = '',
  surface = 'custom',
  collapsed = false,
  paired = false,
  unoptimized = false,
  priority = true,
}: LogoProps) {
  const { theme: appTheme } = useTheme();
  const { isOnDark } = useSurface();

  // Helper to render a single logo graphic with rigid dimensions and canonical masters
  const renderSingleGraphic = (
    v: 'full' | 'icon' | 'icon-solid',
    t: 'light' | 'dark' | 'auto',
    s: SizeKey | number | undefined,
    extraClass: string = ''
  ) => {
    // Resolve theme: 'light' (black mark) or 'dark' (white mark)
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
    let resolvedHeight = 28;
    if (typeof s === 'number') {
      resolvedHeight = s;
    } else if (s && s in heightMap) {
      resolvedHeight = heightMap[s as SizeKey];
    } else {
      if (surface === 'marketing-nav') {
        resolvedHeight = v === 'icon' ? 28 : 28;
      } else if (surface === 'marketing-footer') {
        resolvedHeight = 32;
      } else if (surface === 'auth') {
        resolvedHeight = 36;
      } else {
        resolvedHeight = v === 'icon' || v === 'icon-solid' ? 24 : 28;
      }
    }

    const resolvedWidth = Math.round(resolvedHeight * ASPECT_RATIOS[v]);

    // Select canonical master file
    let src = '';
    if (v === 'full') {
      src = resolvedTheme === 'dark'
        ? '/brand/paperworking-logotype-white-transparent.png'
        : '/brand/paperworking-logotype-black-transparent.png';
    } else if (v === 'icon-solid') {
      src = resolvedTheme === 'dark'
        ? '/brand/paperworking-icon-white-on-black.png'
        : '/brand/paperworking-icon-black-on-white.png';
    } else {
      src = resolvedTheme === 'dark'
        ? '/brand/paperworking-icon-white-transparent.png'
        : '/brand/paperworking-icon-black-transparent.png';
    }

    const isDecorative = (v === 'icon' || v === 'icon-solid') && paired;
    const resolvedAlt = alt ?? 'PaperWorking';

    return (
      <Image
        src={src}
        alt={isDecorative ? '' : resolvedAlt}
        width={resolvedWidth}
        height={resolvedHeight}
        priority={priority}
        unoptimized={unoptimized}
        aria-hidden={isDecorative ? true : undefined}
        className={`object-contain max-w-none select-none shrink-0 ${extraClass || 'block'}`}
        style={{
          width: resolvedWidth,
          height: resolvedHeight,
          flexShrink: 0,
        }}
      />
    );
  };

  // ─── Surface rendering matrix ────────

  let logoContent: React.ReactNode = null;

  if (surface === 'marketing-nav') {
    const navSize = size ?? 28;
    logoContent = (
      <>
        {renderSingleGraphic('full', theme, navSize, 'hidden md:block')}
        {renderSingleGraphic('icon', theme, navSize, 'block md:hidden')}
      </>
    );
  } else if (surface === 'marketing-footer') {
    logoContent = renderSingleGraphic('full', theme === 'auto' ? 'dark' : theme, size ?? 32);
  } else if (surface === 'app-sidebar') {
    if (collapsed) {
      logoContent = renderSingleGraphic('icon', theme, size ?? 24);
    } else {
      const desktopSize = size ?? 28;
      const mobileSize = size ?? 24;
      logoContent = (
        <>
          {renderSingleGraphic('full', theme, desktopSize, 'hidden md:block')}
          {renderSingleGraphic('icon', theme, mobileSize, 'block md:hidden')}
        </>
      );
    }
  } else if (surface === 'app-topbar') {
    logoContent = renderSingleGraphic('icon', theme, size ?? 24);
  } else if (surface === 'auth') {
    logoContent = renderSingleGraphic('full', 'dark', size ?? 32);
  } else if (surface === 'empty-state') {
    logoContent = renderSingleGraphic('icon', theme, size ?? 40);
  } else if (surface === 'loading') {
    logoContent = renderSingleGraphic('icon', theme, size ?? 32, 'animate-pulse');
  } else if (surface === 'email') {
    logoContent = renderSingleGraphic('full', 'light', size ?? 32);
  } else if (surface === 'pdf') {
    logoContent = renderSingleGraphic('full', 'light', size ?? 32);
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
        className={`inline-flex items-center transition-opacity duration-150 hover:opacity-85 focus-visible:opacity-85 focus-visible:outline-none shrink-0 ${className}`}
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

