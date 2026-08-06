'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ═══════════════════════════════════════════════════════
   Settings Layout Shell — Luminous Glass Sidebar + Pane
   ═══════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { label: 'General',       href: '/dashboard/settings/general',       iconName: 'settings' },
  { label: 'Profile',       href: '/dashboard/settings/profile',       iconName: 'person' },
  { label: 'Marketplace',   href: '/dashboard/settings/marketplace-profile', iconName: 'storefront' },
  { label: 'Team',          href: '/dashboard/settings/team',          iconName: 'group' },
  { label: 'Notifications', href: '/dashboard/settings/notifications', iconName: 'notifications' },
  { label: 'Billing',       href: '/dashboard/settings/billing',       iconName: 'payments' },
  { label: 'Data & Privacy', href: '/dashboard/settings/data',          iconName: 'security' },
  { label: 'Audit Logs',    href: '/dashboard/settings/audit-logs',    iconName: 'manage_history' },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % NAV_ITEMS.length;
      const nextEl = document.getElementById(`settings-nav-${nextIndex}`);
      nextEl?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
      const prevEl = document.getElementById(`settings-nav-${prevIndex}`);
      prevEl?.focus();
    }
  };

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
        <h1 className="font-headline-lg text-headline-lg font-bold text-pw-black mb-stack-sm">
          Settings
        </h1>
        <p className="font-body-md text-body-md text-pw-muted mb-stack-lg">
          Manage your personal profile, team seats, notification matrices, and subscription billing.
        </p>

        {/* ─── Mobile tab bar ─── */}
        {/* Neutral divider — the emerald-tinted border here was the last green
            left in the settings tab strip after the active states were fixed. */}
        <nav className="flex sm:hidden gap-2 overflow-x-auto pb-4 mb-6 border-b border-pw-border no-scrollbar">
          {NAV_ITEMS.map(({ label, href, iconName }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                /* Active state mirrors the main sidebar: a subtle neutral fill
                   with a hairline border, not the emerald accent. */
                className={`
                  flex items-center gap-2 px-4 h-10 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border
                  ${isActive
                    ? 'bg-pw-glass-bg border-pw-border text-pw-black font-bold'
                    : 'bg-transparent border-transparent text-pw-muted hover:text-pw-black hover:bg-white/5'
                  }
                `}
              >
                <span className="material-symbols-outlined text-base select-none">{iconName}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ─── Desktop: sidebar + content ───
             Gutter is 24px (gap-6). The content pane is left-aligned against
             the sidebar rather than centred: `mx-auto` on a 720px pane inside
             a much wider flex track pushed the content away from the nav and
             left dead whitespace columns on both sides at >=1440px. */}
        <div className="flex flex-col sm:flex-row gap-6">

          {/* Sidebar — hidden on mobile */}
          <aside className="hidden sm:block w-56 flex-shrink-0">
            <div className="flex flex-col h-full justify-between gap-stack-md sticky top-12">
              <nav className="space-y-1">
                {NAV_ITEMS.map(({ label, href, iconName }, index) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      id={`settings-nav-${index}`}
                      href={href}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      /* Matches the main sidebar's active treatment — subtle
                         neutral fill + hairline border, no emerald accent and
                         no green left rail. */
                      className={`
                        flex items-center gap-4 px-4 h-10 mx-2 rounded-lg transition-all font-label-md text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pw-border focus-visible:ring-offset-2 focus-visible:ring-offset-pw-bg
                        ${isActive
                          ? 'bg-pw-glass-bg border border-pw-border text-pw-black font-bold'
                          : 'bg-transparent border border-transparent text-pw-muted hover:text-pw-black hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="material-symbols-outlined text-lg select-none">{iconName}</span>
                      {label}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-2 mt-4">
                <div className="p-4 rounded-xl bg-pw-primary/5 border border-pw-primary/10">
                  <p className="text-xs text-pw-primary font-bold mb-1">Need help?</p>
                  <p className="text-[11px] text-pw-muted mb-3 leading-relaxed">Priority support is available for Team plans.</p>
                  <Link
                    href="/dashboard/support"
                    className="w-full h-10 px-5 text-sm font-medium bg-pw-glass-bg border border-pw-border hover:bg-white/10 transition-all rounded-lg flex items-center justify-center text-pw-black shadow-sm"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Content pane — left-aligned, capped at 900px */}
          <main className="flex-1 min-w-0 w-full max-w-[900px]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

