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
  { label: 'Team',          href: '/dashboard/settings/team',          iconName: 'group' },
  { label: 'Notifications', href: '/dashboard/settings/notifications', iconName: 'notifications' },
  { label: 'Billing',       href: '/dashboard/settings/billing',       iconName: 'payments' },
  { label: 'Data & Privacy', href: '/dashboard/settings/data',          iconName: 'security' },
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
        <h1 className="font-headline-lg text-headline-lg font-bold text-pw-black mb-stack-sm">
          Settings
        </h1>
        <p className="font-body-md text-body-md text-pw-muted mb-stack-lg">
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
                  flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border
                  ${isActive
                    ? 'bg-pw-primary/20 border-pw-primary/30 text-pw-primary font-bold shadow-sm'
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

        {/* ─── Desktop: sidebar + content ─── */}
        <div className="flex flex-col sm:flex-row gap-8">

          {/* Sidebar — hidden on mobile */}
          <aside className="hidden sm:block w-56 flex-shrink-0">
            <div className="flex flex-col h-full justify-between gap-stack-md sticky top-12">
              <nav className="space-y-1">
                {NAV_ITEMS.map(({ label, href, iconName }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`
                        flex items-center gap-4 px-4 py-3 mx-2 rounded-lg font-label-md text-label-md transition-all
                        ${isActive
                          ? 'bg-pw-primary/20 border border-pw-primary/30 text-pw-primary font-bold shadow-[0_0_15px_rgba(87,241,219,0.15)]'
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
                    className="w-full py-2 text-[12px] font-bold bg-pw-glass-bg border border-pw-border hover:bg-white/10 transition-colors rounded-lg flex justify-center text-pw-black shadow-sm"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
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

