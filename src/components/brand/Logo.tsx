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
      {/* Rising paper sheets */}
      <rect x="5" y="2" width="14" height="2" rx="0.5" />
      <rect x="5" y="6" width="14" height="2" rx="0.5" />
      <rect x="5" y="10" width="14" height="2" rx="0.5" />
      <rect x="5" y="14" width="14" height="2" rx="0.5" />
      {/* Inbox tray */}
      <path
        d="M2 17.2C2 16.1 2.9 15.2 4 15.2H7C7.55 15.2 8 16.2 8 16.2V17.2C8 18.3 8.9 19.2 10 19.2H14C15.1 19.2 16 18.3 16 17.2V16.2C16 15.65 16.45 15.2 17 15.2H20C21.1 15.2 22 16.1 22 17.2V20.8C22 21.9 21.1 22.8 20 22.8H4C2.9 22.8 2 21.9 2 20.8V17.2Z"
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
        <span className="font-black">Paper</span>
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
