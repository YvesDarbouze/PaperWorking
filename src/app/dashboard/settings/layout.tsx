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
    <div className="min-h-screen bg-pw-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ─── Back nav ─── */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-pw-muted hover:text-pw-black transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* ─── Page title ─── */}
        <h1 className="text-3xl font-light tracking-tight text-pw-black mb-1">
          Settings
        </h1>
        <p className="text-sm text-pw-muted mb-8">
          Manage your account, team, notifications, and billing.
        </p>

        {/* ─── Mobile tab bar ─── */}
        <nav className="flex sm:hidden gap-1 overflow-x-auto pb-4 mb-6 border-b border-pw-border no-scrollbar">
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors
                  ${isActive
                    ? 'text-pw-black border-b-2 border-pw-black'
                    : 'text-pw-muted hover:text-pw-fg'
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
                        ? 'bg-white border border-pw-border text-pw-black shadow-sm'
                        : 'text-pw-muted hover:text-pw-fg hover:bg-white/50'
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
