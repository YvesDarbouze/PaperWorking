'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react';

export interface StickyMobileCtaProps {
  thresholdY?: number;
  bottomOffset?: number;
}

export default function StickyMobileCta({
  thresholdY = 400,
  bottomOffset = 450,
}: StickyMobileCtaProps) {
  const pathname = usePathname() || '/';
  const [visible, setVisible] = useState(false);

  // Only active on long scrolling pages (Landing, How It Works, Pricing)
  const isEligiblePage =
    pathname === '/' ||
    pathname === '/how-it-works' ||
    pathname === '/pricing' ||
    pathname.startsWith('/support');

  useEffect(() => {
    if (!isEligiblePage) {
      setVisible(false);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const innerHeight = window.innerHeight;
      const distFromBottom = scrollHeight - (scrollY + innerHeight);

      // Show when scrolled past hero, hide when near bottom conversion block/footer
      const pastHero = scrollY > thresholdY;
      const notAtBottom = distFromBottom > bottomOffset;

      setVisible(pastHero && notAtBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isEligiblePage, thresholdY, bottomOffset]);

  if (!isEligiblePage) return null;

  return (
    <div
      data-testid="sticky-mobile-cta"
      aria-hidden={!visible}
      className={`fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 px-4 pointer-events-none md:hidden transition-all duration-300 ease-out ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-8 opacity-0 pointer-events-none'
      }`}
    >
      <div className="pointer-events-auto mx-auto max-w-sm rounded-none border border-neutral-800 bg-neutral-950/95 p-2 shadow-xl backdrop-blur-xl">
        <Link
          href="/signup"
          tabIndex={visible ? 0 : -1}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-none bg-neutral-100 px-5 text-sm font-bold text-neutral-900 no-underline shadow-sm transition-all hover:bg-neutral-200 active:scale-[0.98] touch-press min-h-[44px]"
        >
          <span>Start Free 14-Day Trial</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
