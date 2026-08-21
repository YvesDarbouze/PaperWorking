'use client';

import Link from 'next/link';
import { PaperWorkingIcon } from '@/components/brand/icons/PaperWorkingIcon';
import { PaperWorkingLogotype } from '@/components/brand/icons/PaperWorkingLogotype';

type SizeKey = 'h-6' | 'h-8' | 'h-10' | 'h-12' | 'sm' | 'md' | 'lg';

interface LogoProps {
  href?: string;
  /** `full` = icon+wordmark; `icon` = mark only */
  variant?: 'full' | 'icon';
  /** light = black mark; dark = white mark; auto follows tone */
  theme?: 'light' | 'dark' | 'auto';
  size?: SizeKey | number;
  className?: string;
  /** Presets for marketing / auth / dashboard chrome */
  tone?: 'marketing' | 'auth' | 'dashboard';
  collapsed?: boolean;
}

const heightMap: Record<SizeKey, number> = {
  'h-6': 24,
  'h-8': 32,
  'h-10': 40,
  'h-12': 48,
  sm: 20,
  md: 24,
  lg: 30,
};

const ASPECT_RATIOS = {
  full: 400 / 51.38,
  icon: 512 / 474,
};

export default function Logo({
  href = '/',
  variant,
  theme = 'auto',
  size,
  className = '',
  tone = 'marketing',
  collapsed = false,
}: LogoProps) {
  const resolvedTheme: 'light' | 'dark' =
    theme === 'auto' ? (tone === 'auth' || tone === 'dashboard' ? 'dark' : 'dark') : theme;

  // Marketing landing is dark-first (v0 parity); light pages can pass theme="light".
  const color = resolvedTheme === 'dark' ? '#fdfffc' : '#0d0a0b';

  const targetVariant: 'full' | 'icon' =
    variant ?? (collapsed || tone === 'dashboard' ? 'icon' : 'full');

  let resolvedHeight = 24;
  if (typeof size === 'number') resolvedHeight = size;
  else if (size && size in heightMap) resolvedHeight = heightMap[size];
  else resolvedHeight = targetVariant === 'icon' ? 24 : 28;

  const resolvedWidth = Math.round(resolvedHeight * ASPECT_RATIOS[targetVariant]);
  const Svg = targetVariant === 'full' ? PaperWorkingLogotype : PaperWorkingIcon;

  const mark = (
    <>
      {targetVariant === 'full' ? (
        <>
          <PaperWorkingLogotype
            width={resolvedWidth}
            height={resolvedHeight}
            role="img"
            aria-label="PaperWorking"
            style={{ color, flexShrink: 0 }}
            className="hidden max-w-none select-none md:block"
          />
          <PaperWorkingIcon
            width={Math.round(resolvedHeight * ASPECT_RATIOS.icon)}
            height={resolvedHeight}
            role="img"
            aria-label="PaperWorking"
            style={{ color, flexShrink: 0 }}
            className="block max-w-none select-none md:hidden"
          />
        </>
      ) : (
        <Svg
          width={resolvedWidth}
          height={resolvedHeight}
          role="img"
          aria-label="PaperWorking"
          style={{ color, flexShrink: 0 }}
          className="max-w-none select-none"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex shrink-0 transition-opacity duration-150 hover:opacity-75 focus-visible:opacity-75 focus-visible:outline-none ${className}`}
        aria-label="PaperWorking — Return to homepage"
      >
        {mark}
      </Link>
    );
  }

  return <span className={`inline-flex items-center shrink-0 ${className}`}>{mark}</span>;
}
