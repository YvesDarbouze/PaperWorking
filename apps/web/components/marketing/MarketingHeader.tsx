'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Logo from '@/components/marketing/Logo';
import { MARKETING_NAV_LINKS } from '@/lib/marketing/content';

export default function MarketingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: 'rgba(253, 255, 252, 0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--nav-border)',
      }}
    >
      <nav
        className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:h-[72px] md:px-10"
        aria-label="Main navigation"
      >
        <Logo href="/home" />

        <div className="hidden items-center gap-7 md:flex">
          {MARKETING_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="pw-nav-link"
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <Link href="/login" className="pw-nav-link">
            Sign In
          </Link>
          <Link href="/pricing" className="pw-pill-cta">
            Start 14-Day Free Trial
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border md:hidden"
          style={{ borderColor: 'var(--color-outline)' }}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="text-lg leading-none">{mobileOpen ? '×' : '☰'}</span>
        </button>
      </nav>

      {mobileOpen ? (
        <div
          className="border-t px-5 py-4 md:hidden"
          style={{ borderColor: 'var(--nav-border)' }}
        >
          <div className="flex flex-col gap-3">
            {MARKETING_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="pw-nav-link py-1"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="pw-nav-link py-1" onClick={() => setMobileOpen(false)}>
              Sign In
            </Link>
            <Link href="/pricing" className="pw-pill-cta w-fit" onClick={() => setMobileOpen(false)}>
              Start 14-Day Free Trial
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
