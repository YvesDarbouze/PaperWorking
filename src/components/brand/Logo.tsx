import React from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Logo Lockup Component

   Icon: inline SVG, fill="currentColor" — transparent bg,
   works on any surface in any color.

   Wordmark: Inter 700 "Paper" + Inter 300 "Working" — no space.
   ═══════════════════════════════════════════════════════ */

interface LogoProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Explicit icon color override. Defaults to currentColor. */
  iconColor?: string;
  /** Render wordmark only (no icon) */
  wordmarkOnly?: boolean;
  /** Render icon only (no wordmark) */
  iconOnly?: boolean;
}

const sizeMap = {
  sm: { iconPx: 20, textPx: '1.0625rem', gap: '0.5rem' },
  md: { iconPx: 24, textPx: '1.1875rem', gap: '0.625rem' },
  lg: { iconPx: 30, textPx: '1.5rem',    gap: '0.75rem' },
  xl: { iconPx: 40, textPx: '2rem',      gap: '1rem'    },
};

/**
 * PaperWorking icon mark — 3 document sheets above an inbox tray.
 * Pure inline SVG, fill="currentColor". No background.
 */
function PaperWorkingIconSVG({ size, color }: { size: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill={color ?? 'currentColor'}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* Three document sheets */}
      <rect x="3"  y="1"  width="42" height="8" rx="2.5" />
      <rect x="3"  y="13" width="42" height="8" rx="2.5" />
      <rect x="3"  y="25" width="42" height="8" rx="2.5" />

      {/* Inbox tray with center slot — papers slide in from top */}
      <path d="M3 37C3 34.8 4.8 33 7 33H17V38H31V33H41C43.2 33 45 34.8 45 37V44C45 46.2 43.2 48 41 48H7C4.8 48 3 46.2 3 44V37Z" />
    </svg>
  );
}

export default function Logo({
  href,
  size = 'md',
  className = '',
  iconColor,
  wordmarkOnly = false,
  iconOnly = false,
}: LogoProps) {
  const s = sizeMap[size];

  const lockup = (
    <span
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: s.gap }}
    >
      {!wordmarkOnly && (
        <PaperWorkingIconSVG size={s.iconPx} color={iconColor} />
      )}
      {!iconOnly && (
        <span
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: s.textPx,
            lineHeight: 1,
            letterSpacing: '0',
          }}
        >
          <span style={{ fontWeight: 700 }}>Paper</span>
          <span style={{ fontWeight: 100 }}>Working</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex transition-opacity duration-150 hover:opacity-70 focus-visible:opacity-80"
        aria-label="PaperWorking — Return to homepage"
      >
        {lockup}
      </Link>
    );
  }

  return lockup;
}
