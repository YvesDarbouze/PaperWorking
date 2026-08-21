'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/marketing/Logo';
import UserAccountMenu from '@/components/shared/UserAccountMenu';
import { destroySession, fetchSessionProfile } from '@/lib/auth/session-client';
import { PROFILE_CARD } from '@/lib/dashboard/content';
import { MARKETING_NAV_LINKS } from '@/lib/marketing/content';

export default function MarketingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [accountType, setAccountType] = useState<string>('investor');
  const supportRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const onOut = (e: MouseEvent) => {
      if (supportRef.current && !supportRef.current.contains(e.target as Node)) {
        setSupportOpen(false);
      }
    };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  const enterSupport = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSupportOpen(true);
  };
  const leaveSupport = () => {
    timerRef.current = setTimeout(() => setSupportOpen(false), 150);
  };

  async function handleSignOut() {
    await destroySession();
    setAuthenticated(false);
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'shadow-[0_1px_12px_0_rgba(0,0,0,0.4)]' : ''
        }`}
        style={{
          backgroundColor: scrolled
            ? 'color-mix(in srgb, #0d0a0b 96%, transparent)'
            : 'color-mix(in srgb, #0d0a0b 90%, transparent)',
          backdropFilter: `blur(${scrolled ? '20px' : '16px'})`,
          WebkitBackdropFilter: `blur(${scrolled ? '20px' : '16px'})`,
          borderBottom: '1px solid rgba(253, 255, 252, 0.07)',
        }}
      >
        <nav
          className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:h-[72px] md:px-10"
          aria-label="Main navigation"
        >
          <Logo href="/" tone="auth" size="h-8" theme="dark" />

          <div className="hidden items-center gap-7 md:flex">
            {MARKETING_NAV_LINKS.map((link) =>
              link.label === 'Support' ? (
                <div
                  key={link.href}
                  ref={supportRef}
                  className="relative"
                  onMouseEnter={enterSupport}
                  onMouseLeave={leaveSupport}
                >
                  <Link
                    href={link.href}
                    className="flex items-center gap-1 text-[13.5px] font-medium text-white/70 no-underline transition-opacity hover:text-white"
                    aria-current={pathname === link.href ? 'page' : undefined}
                  >
                    Support
                    <span className="material-symbols-outlined text-[14px]">expand_more</span>
                  </Link>
                  {supportOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#121014] py-2 shadow-xl">
                      <Link
                        href="/support"
                        className="block px-4 py-2 text-[13px] font-medium text-white no-underline hover:bg-white/5"
                      >
                        Support Center
                      </Link>
                      <Link
                        href="/support/glossary"
                        className="block px-4 py-2 text-[13px] font-medium text-white no-underline hover:bg-white/5"
                      >
                        Real Estate Glossary
                      </Link>
                      <Link
                        href="/support/metrics"
                        className="block px-4 py-2 text-[13px] font-medium text-white no-underline hover:bg-white/5"
                      >
                        The Playbook (33 Metrics)
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13.5px] font-medium text-white/70 no-underline transition-opacity hover:text-white"
                  aria-current={pathname === link.href ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-3">
            {authenticated ? (
              <UserAccountMenu
                className="hidden md:block"
                displayName={PROFILE_CARD.displayName}
                accountType={accountType}
                role={PROFILE_CARD.role}
                onSignOut={handleSignOut}
              />
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-[13.5px] font-medium text-white/70 no-underline hover:text-white md:inline-flex"
                >
                  Sign In
                </Link>
                <Link
                  href="/pricing"
                  className="hidden items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-[#0d0a0b] no-underline transition-opacity hover:opacity-88 md:inline-flex"
                >
                  Start Free 14-Day Trial
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </>
            )}

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

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu backdrop"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute bottom-0 left-0 top-0 flex w-4/5 max-w-[320px] flex-col border-r border-white/10 bg-[#121014]">
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
            <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {MARKETING_NAV_LINKS.map((link) =>
                link.label === 'Support' ? (
                  <div key={link.href} className="space-y-1">
                    <Link
                      href="/support"
                      className="block rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white no-underline hover:bg-white/5"
                      onClick={() => setMobileOpen(false)}
                    >
                      Support Center
                    </Link>
                    <Link
                      href="/support/glossary"
                      className="block rounded-xl py-2 pl-8 text-[13px] font-medium text-white/65 no-underline hover:bg-white/5"
                      onClick={() => setMobileOpen(false)}
                    >
                      Real Estate Glossary
                    </Link>
                    <Link
                      href="/support/metrics"
                      className="block rounded-xl py-2 pl-8 text-[13px] font-medium text-white/65 no-underline hover:bg-white/5"
                      onClick={() => setMobileOpen(false)}
                    >
                      The Playbook (33 Metrics)
                    </Link>
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white no-underline hover:bg-white/5"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
            <div className="space-y-3 border-t border-white/10 px-4 pb-6 pt-4">
              {authenticated ? (
                <>
                  <div className="rounded-2xl border border-[color:var(--color-primary)]/40 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-white">
                      {PROFILE_CARD.displayName}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-primary)]">
                      {PROFILE_CARD.role}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center rounded-full bg-white px-4 py-3 text-[14px] font-semibold text-[#0d0a0b] no-underline"
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
                    className="flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-[14px] font-medium text-white no-underline"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/pricing"
                    className="flex items-center justify-center rounded-full bg-white px-4 py-3 text-[14px] font-semibold text-[#0d0a0b] no-underline"
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
