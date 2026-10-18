'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Gear,
  Lock,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
} from '@phosphor-icons/react';

type SettingsNavItem = {
  id: string;
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV_ITEMS: SettingsNavItem[] = [
  { id: 'general', label: 'General', href: '/dashboard/settings?section=general', Icon: Gear },
  { id: 'security', label: 'Security', href: '/dashboard/settings?section=security', Icon: Lock },
  { id: 'billing', label: 'Billing', href: '/dashboard/settings?section=billing', Icon: CreditCard },
  { id: 'data-privacy', label: 'Data & Privacy', href: '/dashboard/settings?section=data-privacy', Icon: ShieldCheck },
];

function SettingsNavContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') || 'general';

  const isLocked =
    typeof window !== 'undefined' &&
    (searchParams.get('milestone') === 'locked' ||
      document.cookie.includes('__pw_milestone=locked') ||
      document.cookie.includes('__pw_first_deal=0'));

  const isSectionActive = (itemId: string) => {
    if (itemId === 'general') {
      return activeSection === 'general' || (!searchParams.get('section') && pathname === '/dashboard/settings');
    }
    return activeSection === itemId;
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href="/dashboard"
          className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground no-underline transition-colors hover:text-foreground min-h-[44px]"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </Link>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Manage your personal preferences, security credentials, active subscription, and data controls.
        </p>

        {/* Mobile tabs */}
        <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-4 sm:hidden">
          {NAV_ITEMS.map((item) => {
            const active = isSectionActive(item.id);
            const Icon = item.Icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                data-testid={`settings-tab-mobile-${item.id}`}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-none border px-4 text-xs font-semibold no-underline transition-all ${
                  active
                    ? 'border-border bg-card font-bold text-foreground shadow-sm ring-1 ring-foreground/10'
                    : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {isLocked && item.id !== 'general' && (
                  <span title="Milestone locked" className="inline-flex items-center">
                    <Lock size={12} className="text-amber-400" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-6 sm:flex-row">
          <aside className="hidden w-56 shrink-0 sm:block">
            <div className="sticky top-20 flex flex-col gap-6">
              <nav className="space-y-1">
                {NAV_ITEMS.map((item, index) => {
                  const active = isSectionActive(item.id);
                  const Icon = item.Icon;
                  return (
                    <Link
                      key={item.id}
                      id={`settings-nav-${index}`}
                      data-testid={`settings-tab-${item.id}`}
                      href={item.href}
                      className={`mx-2 flex min-h-[44px] items-center gap-3 rounded-none border px-4 text-sm no-underline transition-all ${
                        active
                          ? 'border-border bg-card font-semibold text-foreground shadow-sm ring-1 ring-foreground/10'
                          : 'border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="flex-1 text-xs">{item.label}</span>
                      {isLocked && item.id !== 'general' && (
                        <span title="Milestone locked" className="inline-flex items-center">
                          <Lock size={12} className="text-amber-400" />
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-2">
                <div
                  className="rounded-none border border-border bg-card p-4 shadow-sm"
                  data-testid="settings-need-help-card"
                >
                  <p className="mb-1 text-xs font-bold text-foreground">Need help?</p>
                  <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                    Priority operator support is available for active accounts.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/support"
                      data-testid="settings-contact-support-link"
                      className="flex min-h-[44px] w-full items-center justify-center rounded-none border border-border bg-muted/40 text-xs font-semibold text-foreground no-underline hover:bg-muted transition"
                    >
                      Contact Support
                    </Link>
                    <Link
                      href="/help/workspace-settings-and-preferences"
                      data-testid="settings-help-article-link"
                      className="flex min-h-[44px] w-full items-center justify-center rounded-none border border-border bg-background text-xs font-medium text-muted-foreground no-underline hover:bg-muted/30 hover:text-foreground transition"
                    >
                      Settings Guide
                    </Link>
                  </div>
                </div>

                <div
                  className="px-2 pt-2 pb-1 text-[11px] text-muted-foreground font-mono flex items-center justify-between"
                  data-testid="build-identity-footer"
                >
                  <span>Documentation</span>
                  <Link
                    href="/help"
                    className="inline-flex min-h-[44px] items-center text-foreground hover:underline transition-colors decoration-border underline-offset-2 no-underline"
                    title="Browse Knowledge Base & Help Articles"
                    data-testid="build-sha-link"
                  >
                    Help Guides →
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 w-full flex-1 max-w-[900px]">{children}</main>

          <div className="mt-4 sm:hidden">
            <div
              className="rounded-none border border-border bg-card p-4 shadow-sm"
              data-testid="mobile-settings-need-help-card"
            >
              <p className="mb-1 text-xs font-bold text-foreground">Need help?</p>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Priority operator support is available for active accounts.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/support"
                  data-testid="mobile-settings-contact-support-link"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-none border border-border bg-muted/40 text-xs font-semibold text-foreground no-underline hover:bg-muted transition"
                >
                  Contact Support
                </Link>
                <Link
                  href="/help/workspace-settings-and-preferences"
                  data-testid="mobile-settings-help-article-link"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-none border border-border bg-background text-xs font-medium text-muted-foreground no-underline hover:bg-muted/30 hover:text-foreground transition"
                >
                  Settings Guide
                </Link>
                <div
                  className="px-1 pt-1 text-xs text-muted-foreground font-mono flex items-center justify-between"
                  data-testid="mobile-help-footer"
                >
                  <span>Documentation</span>
                  <Link
                    href="/help"
                    className="inline-flex min-h-[44px] items-center text-foreground hover:underline transition-colors decoration-border underline-offset-2 no-underline"
                    data-testid="mobile-help-guides-link"
                  >
                    Help Guides →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading settings…</div>}>
      <SettingsNavContent>{children}</SettingsNavContent>
    </Suspense>
  );
}
