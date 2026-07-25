'use client';

import React from 'react';

/**
 * GoogleAttribution — DM-3 ToS Compliance
 *
 * Renders "Powered by Google" attribution text wherever Google Maps Content
 * is displayed. Required by Google Maps Platform ToS Section 3.2.3.
 *
 * Must appear on:
 * - Autocomplete prediction dropdown (already present)
 * - Static Map tiles
 * - Street View images
 * - Interactive maps
 *
 * Props:
 * @param variant - 'light' for dark backgrounds, 'dark' for light backgrounds
 * @param size - 'sm' for compact, 'md' for standard
 * @param className - Additional CSS classes
 */
interface GoogleAttributionProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
  className?: string;
}

export function GoogleAttribution({
  variant = 'light',
  size = 'sm',
  className = '',
}: GoogleAttributionProps) {
  const colorClass = variant === 'light'
    ? 'text-white/50'
    : 'text-black/40';

  const sizeClass = size === 'sm'
    ? 'text-[9px] tracking-[0.2em]'
    : 'text-[10px] tracking-[0.15em]';

  return (
    <span
      className={`font-bold uppercase ${sizeClass} ${colorClass} select-none pointer-events-none ${className}`}
      aria-label="Powered by Google"
    >
      Powered by Google
    </span>
  );
}
