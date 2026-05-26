'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ═══════════════════════════════════════════════════════
   Settings Layout Shell — Luminous Glass Sidebar + Pane
   ═══════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { label: 'Profile',       href: '/dashboard/settings/profile',       iconName: 'account_circle' },
  { label: 'Team',          href: '/dashboard/settings/team',          iconName: 'group' },
  { label: 'Notifications', href: '/dashboard/settings/notifications', iconName: 'notifications' },
  { label: 'Billing',       href: '/dashboard/settings/billing',       iconName: 'credit_card' },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-pw-bg text-pw-black font-sans antialiased">
      <div className="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop py-8 sm:py-12">

        {/* ─── Back nav ─── */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-pw-muted hover:text-pw-primary transition-colors mb-8 group"
        >
          <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1 select-none">arrow_back</span>
          Back to Dashboard
        </Link>

        {/* ─── Page title ─── */}
        <h1 className="text-3xl font-light tracking-tight text-pw-black mb-2">
          Settings
        </h1>
        <p className="text-sm text-pw-muted mb-8">
          Manage your personal profile, team seats, notification matrices, and subscription billing.
        </p>

        {/* ─── Mobile tab bar ─── */}
        <nav className="flex sm:hidden gap-2 overflow-x-auto pb-4 mb-6 border-b border-pw-primary/10 no-scrollbar">
          {NAV_ITEMS.map(({ label, href, iconName }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-none text-xs font-semibold whitespace-nowrap transition-all border
                  ${isActive
                    ? 'bg-pw-primary/10 border-pw-primary text-pw-primary'
                    : 'bg-transparent border-transparent text-pw-muted hover:text-pw-black hover:bg-pw-muted/10'
                  }
                `}
              >
                <span className="material-symbols-outlined text-base select-none">{iconName}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ─── Desktop: sidebar + content ─── */}
        <div className="flex flex-col sm:flex-row gap-8">

          {/* Sidebar — hidden on mobile */}
          <aside className="hidden sm:block w-56 flex-shrink-0">
            <nav className="space-y-2 sticky top-12">
              {NAV_ITEMS.map(({ label, href, iconName }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-none text-sm font-semibold transition-all border
                      ${isActive
                        ? 'bg-pw-primary/10 border-pw-primary text-pw-primary'
                        : 'bg-transparent border-transparent text-pw-muted hover:text-pw-black hover:bg-pw-muted/10'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-lg select-none">{iconName}</span>
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content pane */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

