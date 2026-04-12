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
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Three document lines (top section) */}
      <rect x="4" y="2" width="16" height="2.4" rx="0.4" />
      <rect x="5" y="6.8" width="14" height="2.4" rx="0.4" />
      <rect x="4" y="11.6" width="16" height="2.4" rx="0.4" />
      {/* Inbox tray (bottom section) */}
      <path
        d="M2 17.2C2 16.09 2.895 15.2 4 15.2H8.5C8.5 15.2 9 17.4 12 17.4C15 17.4 15.5 15.2 15.5 15.2H20C21.105 15.2 22 16.09 22 17.2V20.8C22 21.91 21.105 22.8 20 22.8H4C2.895 22.8 2 21.91 2 20.8V17.2Z"
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
      <span className={`${s.text} tracking-tight`}>
        <span className="font-bold">Paper</span>
        <span className="font-light text-gray-500">Working</span>
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
