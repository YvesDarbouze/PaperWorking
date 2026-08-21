'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SettingsNavItem = {
  label: string;
  href: string;
  iconName: string;
  exact?: boolean;
  disabled?: boolean;
};

const NAV_ITEMS: SettingsNavItem[] = [
  { label: 'General', href: '/dashboard/settings', iconName: 'settings', exact: true },
  { label: 'Profile', href: '/dashboard/settings/profile', iconName: 'person' },
  { label: 'Marketplace', href: '/dashboard/marketplace', iconName: 'storefront' },
  { label: 'Team', href: '/dashboard/team', iconName: 'group' },
  { label: 'Billing', href: '/dashboard/settings/billing', iconName: 'payments' },
  {
    label: 'Notifications',
    href: '/dashboard/settings',
    iconName: 'notifications',
    disabled: true,
  },
  {
    label: 'Data & Privacy',
    href: '/dashboard/settings/profile',
    iconName: 'security',
  },
  {
    label: 'Audit Logs',
    href: '/dashboard/settings',
    iconName: 'manage_history',
    disabled: true,
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';

  return (
    <div className="min-h-screen bg-[#0d0a0b] text-[#fdfffc] antialiased">
      <div className="w-full min-w-0 px-4 py-6 sm:px-5 sm:py-8 lg:px-6 xl:px-8">
        <Link
          href="/dashboard"
          className="group mb-8 inline-flex items-center gap-2 text-sm text-white/45 no-underline transition-colors hover:text-emerald-300"
        >
          <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">
            arrow_back
          </span>
          Back to Dashboard
        </Link>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[#fdfffc]">Settings</h1>
        <p className="mb-8 text-sm text-white/50">
          Manage your personal profile, team seats, notification matrices, and subscription billing.
        </p>

        {/* Mobile tabs */}
        <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-4 sm:hidden">
          {NAV_ITEMS.map((item) => {
            const active = !item.disabled && isActive(pathname, item.href, item.exact);
            if (item.disabled) {
              return (
                <span
                  key={item.label}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-transparent px-4 text-xs font-semibold text-white/25"
                >
                  <span className="material-symbols-outlined text-base">{item.iconName}</span>
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-xs font-semibold no-underline transition-all ${
                  active
                    ? 'border-white/15 bg-white/[0.06] font-bold text-white'
                    : 'border-transparent text-white/45 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">{item.iconName}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-6 sm:flex-row">
          <aside className="hidden w-56 shrink-0 sm:block">
            <div className="sticky top-20 flex h-full flex-col justify-between gap-6">
              <nav className="space-y-1">
                {NAV_ITEMS.map((item, index) => {
                  const active = !item.disabled && isActive(pathname, item.href, item.exact);
                  if (item.disabled) {
                    return (
                      <span
                        key={item.label}
                        className="mx-2 flex h-10 items-center gap-4 rounded-lg border border-transparent px-4 text-sm text-white/25"
                      >
                        <span className="material-symbols-outlined text-lg">{item.iconName}</span>
                        {item.label}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={item.label}
                      id={`settings-nav-${index}`}
                      href={item.href}
                      className={`mx-2 flex h-10 items-center gap-4 rounded-lg border px-4 text-sm no-underline transition-all ${
                        active
                          ? 'border-white/15 bg-white/[0.06] font-bold text-white'
                          : 'border-transparent text-white/45 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{item.iconName}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-2">
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <p className="mb-1 text-xs font-bold text-emerald-300">Need help?</p>
                  <p className="mb-3 text-[11px] leading-relaxed text-white/45">
                    Priority support is available for Team plans.
                  </p>
                  <Link
                    href="/support"
                    className="flex h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-medium text-white no-underline hover:bg-white/10"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 w-full flex-1 max-w-[900px]">{children}</main>
        </div>
      </div>
    </div>
  );
}
