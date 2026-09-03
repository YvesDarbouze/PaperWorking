'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/marketing/Logo';
import UserAccountMenu from '@/components/shared/UserAccountMenu';
import { useAuth } from '@/context/AuthContext';
import { fetchSessionProfile } from '@/lib/auth/session-client';

const NAV_LINKS = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Marketplaces', href: '/marketplaces' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Support', href: '/support' },
];

export default function MarketingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
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
    fetchSessionProfile()
      .then((profile) => {
        if (cancelled) return;
        setAuthenticated(Boolean(profile.authenticated));
        setAccountType(profile.accountType ?? 'investor');
      })
      .catch(() => {
        if (cancelled) return;
        setAuthenticated(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleSignOut() {
    await logout();
    setAuthenticated(false);
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <header
        className={`sticky left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-[16px] transition-all duration-300 ${
          scrolled ? 'shadow-[0_1px_12px_0_rgba(0,0,0,0.4)]' : ''
        }`}
      >
        <nav
          className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:h-[72px] md:px-10"
          aria-label="Main navigation"
        >
          {/* Left: Logo */}
          <div className="flex w-1/4 items-center">
            <Logo href="/" tone="auth" size="h-8" theme="dark" />
          </div>

          {/* Center: Nav links */}
          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13.5px] font-medium text-white/70 no-underline transition-colors hover:text-white"
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex w-1/4 items-center justify-end gap-3.5">
            {authenticated ? (
              <UserAccountMenu
                className="hidden md:block"
                displayName="Account"
                accountType={accountType}
                role={accountType === 'vendor' ? 'Vendor Partner' : 'Investor'}
                onSignOut={handleSignOut}
              />
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-[13.5px] font-medium text-white/70 no-underline hover:text-white transition-colors md:inline-flex"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="hidden items-center gap-1.5 rounded-full bg-[color:var(--color-primary)] px-5 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-[#0a0a0f] no-underline hover:brightness-110 transition md:inline-flex"
                >
                  Start Free 14-Day Trial
                </Link>
              </>
            )}

            {/* Mobile hamburger menu */}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white md:hidden"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer (glass slide-out drawer from right) */}
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
          <nav className="absolute bottom-0 right-0 top-0 flex w-4/5 max-w-[320px] flex-col border-l border-white/10 bg-[#0a0a0f]/80 backdrop-blur-[20px] shadow-2xl transition-transform duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <Logo href="/" tone="auth" size="h-8" theme="dark" />
              <button
                type="button"
                className="text-white"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Navigation links */}
            <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white/80 no-underline hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 border-t border-white/10 px-4 pb-6 pt-4">
              {authenticated ? (
                <>
                  <div className="rounded-2xl border border-[color:var(--color-primary)]/40 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-white">
                      Account
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-primary)]">
                      {accountType === 'vendor' ? 'Vendor Partner' : 'Investor'}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center rounded-full bg-white px-4 py-3 text-[14px] font-semibold text-[#0a0a0f] no-underline"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/settings/profile"
                    className="flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-[14px] font-medium text-white no-underline"
                    onClick={() => setMobileOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-4 py-3 text-[14px] font-semibold text-white"
                    onClick={() => {
                      setMobileOpen(false);
                      void handleSignOut();
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-[14px] font-medium text-white no-underline hover:bg-white/5"
                    onClick={() => setMobileOpen(false)}
                  >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-4 py-3 text-[14px] font-semibold text-[#0a0a0f] no-underline hover:brightness-110 transition"
                  onClick={() => setMobileOpen(false)}
                >
                  Start Free 14-Day Trial
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
