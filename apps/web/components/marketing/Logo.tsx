'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type SizeKey = 'h-6' | 'h-8' | 'h-10' | 'h-12' | 'h-16' | 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  href?: string;
  variant?: 'full' | 'icon' | 'icon-solid' | 'hero-landing';
  theme?: 'light' | 'dark' | 'auto';
  size?: SizeKey | number;
  className?: string;
  /** V1 chrome presets — mapped to Yves surface matrix without ThemeProvider. */
  tone?: 'marketing' | 'auth' | 'dashboard';
  collapsed?: boolean;
  alt?: string;
  priority?: boolean;
  unoptimized?: boolean;
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

function resolveSurface(
  tone: LogoProps['tone'],
  collapsed: boolean,
): 'marketing-nav' | 'marketing-footer' | 'app-sidebar' | 'auth' | 'custom' {
  if (tone === 'dashboard') return 'app-sidebar';
  if (tone === 'auth') return 'auth';
  return 'marketing-nav';
}

export default function Logo({
  href = '/',
  variant,
  theme = 'auto',
  alt,
  size,
  className = '',
  tone = 'marketing',
  collapsed = false,
  unoptimized = false,
  priority = true,
}: LogoProps) {
  const surface = resolveSurface(tone, collapsed);
  const appThemeDark = theme === 'dark' || (theme === 'auto' && tone !== 'dashboard');

  const renderSingleGraphic = (
    v: 'full' | 'icon' | 'icon-solid',
    t: 'light' | 'dark' | 'auto',
    s: SizeKey | number | undefined,
    extraClass = '',
  ) => {
    let resolvedTheme: 'light' | 'dark' = 'light';
    if (t === 'dark') resolvedTheme = 'dark';
    else if (t === 'light') resolvedTheme = 'light';
    else resolvedTheme = appThemeDark ? 'dark' : 'light';

    let resolvedHeight = 28;
    if (typeof s === 'number') resolvedHeight = s;
    else if (s && s in heightMap) resolvedHeight = heightMap[s as SizeKey];
    else if (surface === 'auth') resolvedHeight = 36;
    else if (surface === 'marketing-nav') resolvedHeight = v === 'icon' ? 28 : 28;
    else resolvedHeight = v === 'icon' || v === 'icon-solid' ? 24 : 28;

    const resolvedWidth = Math.round(resolvedHeight * ASPECT_RATIOS[v]);

    let src = '';
    if (v === 'full') {
      src =
        resolvedTheme === 'dark'
          ? '/brand/paperworking-logotype-white-transparent.png'
          : '/brand/paperworking-logotype-black-transparent.png';
    } else if (v === 'icon-solid') {
      src =
        resolvedTheme === 'dark'
          ? '/brand/paperworking-icon-white-on-black.png'
          : '/brand/paperworking-icon-black-on-white.png';
    } else {
      src =
        resolvedTheme === 'dark'
          ? '/brand/paperworking-icon-white-transparent.png'
          : '/brand/paperworking-icon-black-transparent.png';
    }

    return (
      <Image
        src={src}
        alt={alt ?? 'PaperWorking'}
        width={resolvedWidth}
        height={resolvedHeight}
        priority={priority}
        unoptimized={unoptimized}
        className={`max-w-none shrink-0 select-none object-contain ${extraClass || 'block'}`}
        style={{ width: resolvedWidth, height: resolvedHeight, flexShrink: 0 }}
      />
    );
  };

  let logoContent: ReactNode = null;

  if (surface === 'marketing-nav') {
    const navSize = size ?? 28;
    logoContent = (
      <>
        {renderSingleGraphic('full', theme, navSize, 'hidden md:block')}
        {renderSingleGraphic('icon', theme, navSize, 'block md:hidden')}
      </>
    );
  } else if (surface === 'auth') {
    const authTheme = theme === 'light' ? 'light' : 'dark';
    logoContent = renderSingleGraphic('full', authTheme, size ?? 32);
  } else if (surface === 'app-sidebar') {
    if (collapsed) {
      logoContent = renderSingleGraphic('icon', theme, size ?? 24);
    } else {
      logoContent = (
        <>
          {renderSingleGraphic('full', theme, size ?? 28, 'hidden md:block')}
          {renderSingleGraphic('icon', theme, size ?? 24, 'block md:hidden')}
        </>
      );
    }
  } else {
    const targetVariant =
      variant === 'hero-landing' ? 'full' : (variant ?? 'full');
    logoContent = renderSingleGraphic(targetVariant, theme, size);
  }

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex shrink-0 items-center transition-opacity duration-150 hover:opacity-85 focus-visible:opacity-85 focus-visible:outline-none ${className}`}
        aria-label={`${alt ?? 'PaperWorking'} — Return to homepage`}
      >
        {logoContent}
      </Link>
    );
  }

  return <span className={`inline-flex shrink-0 items-center ${className}`}>{logoContent}</span>;
}
