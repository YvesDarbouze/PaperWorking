'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/marketing/Logo';
import UserAccountMenu from '@/components/shared/UserAccountMenu';
import { List, X, SignOut, SquaresFour } from '@/components/icons/PhosphorIcons';
import { destroySession, fetchSessionProfile } from '@/lib/auth/session-client';
import { PROFILE_CARD } from '@/lib/dashboard/content';

const NAV_LINKS = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Marketplace', href: '/marketplaces' },
  { label: 'Support', href: '/support' },
  { label: 'Deal Calculator', href: '/deal-calculator' },
];

export default function MarketingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [accountType, setAccountType] = useState<string>('investor');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSessionProfile().then((profile) => {
      if (cancelled) return;
      setAuthenticated(Boolean(profile.authenticated));
      setAccountType(profile.accountType ?? 'investor');
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleSignOut() {
    await destroySession();
    setAuthenticated(false);
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <header
        className={`sticky left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm transition-all duration-300 ${
          scrolled ? 'shadow-sm' : ''
        }`}
      >
        <nav
          className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 md:h-[72px] md:px-8"
          aria-label="Main navigation"
        >
          {/* Left: Logo */}
          <div className="flex w-1/4 items-center">
            <Logo href="/" tone="auth" size="h-6" theme="dark" className="flex items-center" />
          </div>

          {/* Center: Nav links */}
          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13.5px] font-medium no-underline transition-colors hover:text-foreground ${
                  pathname === link.href ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-3.5">
            {authenticated ? (
              <>
                <UserAccountMenu
                  className="hidden md:block"
                  displayName={PROFILE_CARD.displayName}
                  accountType={accountType}
                  role={PROFILE_CARD.role}
                  onSignOut={handleSignOut}
                />
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded-none border border-border bg-card px-3 py-2 text-xs font-medium text-foreground md:hidden touch-press min-h-[44px]"
                >
                  <SquaresFour size={16} />
                  <span>App</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-xs font-medium text-muted-foreground no-underline hover:text-foreground transition-colors md:inline-flex"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="hidden items-center gap-1.5 rounded-none bg-primary bg-[color:var(--color-primary)] px-4 py-2 text-xs font-medium tracking-tight text-primary-foreground no-underline hover:bg-primary/90 transition md:inline-flex min-h-[44px]"
                >
                  Get started
                </Link>
                <Link
                  href="/login"
                  data-testid="mobile-quick-login"
                  className="flex items-center justify-center rounded-none border border-input bg-transparent px-3 py-2 text-xs font-medium text-foreground no-underline transition hover:bg-muted md:hidden touch-press min-h-[44px]"
                >
                  Log in
                </Link>
              </>
            )}

            {/* Mobile hamburger menu */}
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none text-foreground md:hidden touch-press hover:bg-muted"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer (slide-out drawer from right) */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu backdrop"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer container */}
          <nav className="absolute bottom-0 right-0 top-0 flex w-4/5 max-w-[320px] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Logo href="/" tone="auth" size="h-6" theme="dark" className="flex items-center" />
              <button
                type="button"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none text-foreground hover:bg-muted"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation links */}
            <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center min-h-[44px] rounded-none px-4 py-2.5 text-[14px] font-semibold no-underline transition-colors ${
                    pathname === link.href
                      ? 'bg-muted text-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 border-t border-border px-4 pb-6 pt-4">
              {authenticated ? (
                <>
                  <div className="rounded-none border border-border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                      {PROFILE_CARD.displayName}
                    </p>
                    <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      {PROFILE_CARD.role}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex min-h-[44px] items-center justify-center rounded-none bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground no-underline hover:bg-primary/80 transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/settings/profile"
                    className="flex min-h-[44px] w-full items-center justify-center rounded-none border border-border px-4 py-2.5 text-xs font-medium text-foreground no-underline hover:bg-muted transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-none bg-destructive/15 text-destructive px-4 py-2.5 text-xs font-semibold hover:bg-destructive/20 transition"
                    onClick={() => {
                      setMobileOpen(false);
                      void handleSignOut();
                    }}
                  >
                    <SignOut size={16} />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex min-h-[44px] w-full items-center justify-center rounded-none border border-input px-4 py-2.5 text-xs font-medium text-foreground no-underline hover:bg-muted transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex min-h-[44px] items-center justify-center rounded-none bg-primary bg-[color:var(--color-primary)] px-4 py-2.5 text-xs font-medium text-primary-foreground no-underline hover:bg-primary/80 transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
