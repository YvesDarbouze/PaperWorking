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

import Image from 'next/image';

/** The PaperWorking inbox-tray icon using the custom PNG */
function PaperWorkingIcon({ size }: { size: number }) {
  return (
    <Image
      src="/logo-icon.png"
      alt="PaperWorking Icon"
      width={size}
      height={size}
      className="flex-shrink-0"
      style={{ width: size, height: size }}
    />
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
