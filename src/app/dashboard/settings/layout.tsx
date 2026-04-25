'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, UserCircle, Users, Bell, CreditCard } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Settings Layout Shell — Sidebar + Content Pane

   Classic SaaS "Sidebar Settings" pattern:
   • Fixed 240px sidebar with vertical nav
   • Scrollable content pane on the right
   • Mobile: sidebar collapses to horizontal tabs
   ═══════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { label: 'Profile',       href: '/dashboard/settings/profile',       Icon: UserCircle },
  { label: 'Team',          href: '/dashboard/settings/team',          Icon: Users },
  { label: 'Notifications', href: '/dashboard/settings/notifications', Icon: Bell },
  { label: 'Billing',       href: '/dashboard/settings/billing',       Icon: CreditCard },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ─── Back nav ─── */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* ─── Page title ─── */}
        <h1 className="text-3xl font-light tracking-tight text-text-primary mb-1">
          Settings
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Manage your account, team, notifications, and billing.
        </p>

        {/* ─── Mobile tab bar ─── */}
        <nav className="flex sm:hidden gap-1 overflow-x-auto pb-4 mb-6 border-b border-border-accent no-scrollbar">
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors
                  ${isActive
                    ? 'text-text-primary border-b-2 border-pw-black'
                    : 'text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ─── Desktop: sidebar + content ─── */}
        <div className="flex gap-8">

          {/* Sidebar — hidden on mobile */}
          <aside className="hidden sm:block w-56 flex-shrink-0">
            <nav className="space-y-1 sticky top-12">
              {NAV_ITEMS.map(({ label, href, Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-bg-surface border border-border-accent text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
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
