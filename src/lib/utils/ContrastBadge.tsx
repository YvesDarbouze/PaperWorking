'use client';

/**
 * ContrastBadge.tsx — Dev-Only WCAG Contrast Overlay
 *
 * Renders a small badge in the corner of any element showing its
 * live contrast ratio and WCAG compliance level (AAA / AA / FAIL).
 *
 * Completely tree-shaken from production builds — renders null unless
 * process.env.NODE_ENV === 'development' AND the debug prop is true.
 *
 * Usage:
 *   <div style={{ position: 'relative', background: '#7f7f7f' }}>
 *     <ContrastBadge bg="#7f7f7f" debug />
 *     <p>Content</p>
 *   </div>
 */

import React from 'react';
import { getContrastColor, getContrastRatio } from '@/lib/utils/contrast';

interface ContrastBadgeProps {
  /** The background color of the container this badge is decorating */
  bg: string;
  /** Only render if true — prevents accidental production display */
  debug?: boolean;
  /** Position offset — defaults to top-right corner */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function ContrastBadge({
  bg,
  debug = false,
  position = 'top-right',
}: ContrastBadgeProps) {
  // Gate: never render in production or without explicit debug flag
  if (!debug || process.env.NODE_ENV !== 'development') return null;

  let ratio: number;
  let level: string;
  let levelColor: string;

  try {
    const textColor = getContrastColor(bg);
    ratio = getContrastRatio(bg, textColor);

    if (ratio >= 7.0) {
      level      = 'AAA';
      levelColor = '#16a34a'; // green
    } else if (ratio >= 4.5) {
      level      = 'AA';
      levelColor = '#2563eb'; // blue
    } else if (ratio >= 3.0) {
      level      = 'AA-large';
      levelColor = '#d97706'; // amber
    } else {
      level      = 'FAIL';
      levelColor = '#dc2626'; // red
    }
  } catch {
    return null;
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right':    { top: 4, right: 4 },
    'top-left':     { top: 4, left: 4 },
    'bottom-right': { bottom: 4, right: 4 },
    'bottom-left':  { bottom: 4, left: 4 },
  };

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        zIndex: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        backgroundColor: '#ffffff',
        border: `1px solid ${levelColor}`,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.6,
        color: '#0d0d0d',
        pointerEvents: 'none',
        userSelect: 'none',
        ...positionStyles[position],
      }}
    >
      <span style={{ color: levelColor }}>{level}</span>
      <span style={{ opacity: 0.6 }}>{ratio.toFixed(1)}:1</span>
    </div>
  );
}
