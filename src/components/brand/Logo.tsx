import React from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Logo Lockup Component

   Combines the inbox/document-tray icon with the
   mixed-weight "PaperWorking" logotype.

   The SVG icon uses fill="currentColor" and is sized
   to match the cap-height of the "P" in the logotype.
   ═══════════════════════════════════════════════════════ */

interface LogoProps {
  /** Renders the lockup inside an <a> tag pointing to this href */
  href?: string;
  /** Size variant: 'sm' for nav, 'md' for auth pages, 'lg' for splash */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes on the outer container */
  className?: string;
}

/** The PaperWorking inbox-tray icon as clean inline SVG */
function PaperWorkingIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Three thick horizontal bars */}
      <rect x="15" y="10" width="70" height="9" />
      <rect x="15" y="27" width="70" height="9" />
      <rect x="15" y="44" width="70" height="9" />
      {/* Inbox tray */}
      <path
        d="M 3.5,69 A 8,8 0 0 1 11.5,61 H 28 C 30,61 31,63 31,65 V 73 C 31,79 35,83 41,83 H 59 C 65,83 69,79 69,73 V 65 C 69,63 70,61 72,61 H 88.5 A 8,8 0 0 1 96.5,69 V 89 A 11,11 0 0 1 85.5,100 H 14.5 A 11,11 0 0 1 3.5,89 Z"
      />
    </svg>
  );
}

/** Size configuration: icon pixel size, text class, gap */
const sizeMap = {
  sm: { iconPx: 18, text: 'text-lg', gap: 'gap-2' },
  md: { iconPx: 22, text: 'text-xl', gap: 'gap-2.5' },
  lg: { iconPx: 28, text: 'text-2xl', gap: 'gap-3' },
};

export default function Logo({ href, size = 'md', className = '' }: LogoProps) {
  const s = sizeMap[size];

  const lockup = (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <PaperWorkingIcon size={s.iconPx} />
      <span 
        className={`${s.text} tracking-tight font-inter`}
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        <span className="font-bold">Paper</span>
        <span className="font-thin text-[var(--pw-subtle)]">Working</span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex transition-opacity hover:opacity-70"
        aria-label="PaperWorking — Return to homepage"
      >
        {lockup}
      </Link>
    );
  }

  return lockup;
}
