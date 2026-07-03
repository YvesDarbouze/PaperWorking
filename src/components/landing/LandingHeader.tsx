'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '@/components/brand/Logo';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════
   LandingHeader — Marketing nav. Five items + auth control.

   Desktop (L → R):
     Logo  |  How It Works  Marketplaces  Pricing  Support  |  [auth]

   Nav item destinations:
     Logo           → / (scroll to top; navigate from any route)
     How It Works   → smooth-scroll #how-it-works on landing; navigate /#how-it-works from other routes
     Marketplaces   → /marketplaces
     Pricing        → smooth-scroll #pricing on landing; navigate /#pricing from other routes
     Support        → /support

   Auth control (never show both states simultaneously):
     logged-out  → "Sign In"  +  "Sign Up" pill
     logged-in   → "Sign Out" button only
     loading     → empty placeholder (prevents first-paint flash)
   ═══════════════════════════════════════════════════════ */

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const { theme, toggleTheme }      = useTheme();
  const [mounted, setMounted]       = useState(false);
  const isDark = theme === 'dark';

  const router   = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Scroll-or-navigate for landing sections ── */
  const goToSection = useCallback(
    (sectionId: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      setMobileOpen(false);
      if (pathname === '/') {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          window.history.pushState(null, '', `/#${sectionId}`);
        }
      } else {
        router.push(`/#${sectionId}`);
      }
    },
    [pathname, router],
  );

  /* ── Logo click: return to landing top ── */
  const goHome = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setMobileOpen(false);
      if (pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.pushState(null, '', '/');
      } else {
        router.push('/');
      }
    },
    [pathname, router],
  );

  /* ── Sign out ── */
  const handleSignOut = useCallback(async () => {
    setMobileOpen(false);
    try {
      await logout();
      router.push('/');
    } catch { /* non-fatal */ }
  }, [logout, router]);

  /* ── Active-state helpers ── */
  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const linkStyle = (active: boolean) => ({
    color: 'var(--color-on-surface)',
    opacity: active ? 1 : 0.65,
    textDecoration: 'none',
    fontWeight: active ? 600 : 500,
  });

  /* ── Auth control — three states ── */
  function AuthControl({ mobile = false }: { mobile?: boolean }) {
    if (loading) {
      // Reserve space so layout doesn't shift when auth resolves
      return <div className={mobile ? 'h-10' : 'w-24 h-9'} aria-hidden />;
    }

    if (user) {
      if (mobile) {
        return (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center w-full px-4 py-3 rounded-xl text-[14px] font-medium transition-colors duration-150"
            style={{
              color: 'var(--color-on-surface)',
              border: '1px solid color-mix(in srgb, var(--color-on-background) 12%, transparent)',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        );
      }
      return (
        <button
          type="button"
          onClick={handleSignOut}
          className="hidden md:inline-flex text-[13.5px] font-medium transition-opacity duration-150"
          style={{ color: 'var(--color-on-surface)', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.7')}
        >
          Sign Out
        </button>
      );
    }

    // Logged out
    if (mobile) {
      return (
        <>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center px-4 py-3 rounded-xl text-[14px] font-medium transition-colors duration-150"
            style={{
              color: 'var(--color-on-surface)',
              border: '1px solid color-mix(in srgb, var(--color-on-background) 12%, transparent)',
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[14px] font-semibold transition-opacity duration-150 active:scale-[0.98]"
            style={{
              background: 'var(--color-on-surface)',
              color: 'var(--color-surface)',
              textDecoration: 'none',
              borderRadius: '9999px',
            }}
          >
            Sign Up
          </Link>
        </>
      );
    }

    return (
      <>
        <Link
          href="/login"
          className="hidden md:inline-flex text-[13.5px] font-medium transition-opacity duration-150"
          style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="hidden md:inline-flex items-center gap-1.5 text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap"
          style={{
            background: 'var(--color-on-surface)',
            color: 'var(--color-surface)',
            borderRadius: '9999px',
            padding: '9px 20px',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Sign Up
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
            arrow_forward
          </span>
        </Link>
      </>
    );
  }

  const navLinkClass = 'text-[13.5px] transition-all duration-150 cursor-pointer bg-none border-none';

  return (
    <>
      {/* ──────────────────────── HEADER ──────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'shadow-[0_1px_12px_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_12px_0_rgba(0,0,0,0.4)]' : ''
        }`}
        style={{
          backgroundColor: scrolled
            ? 'color-mix(in srgb, var(--color-background) 96%, transparent)'
            : 'color-mix(in srgb, var(--color-background) 90%, transparent)',
          backdropFilter: `blur(${scrolled ? '20px' : '16px'})`,
          WebkitBackdropFilter: `blur(${scrolled ? '20px' : '16px'})`,
          borderBottom: '1px solid color-mix(in srgb, var(--color-on-background) 7%, transparent)',
        }}
      >
        <nav
          className="flex items-center justify-between h-16 md:h-[72px] px-5 md:px-10 max-w-[1280px] mx-auto"
          aria-label="Main navigation"
        >

          {/* ── Logo ── */}
          <a
            href="/"
            onClick={goHome}
            className="inline-flex transition-opacity duration-150 hover:opacity-70 focus-visible:opacity-80"
            aria-label="PaperWorking — Return to homepage"
          >
            <Logo size="sm" />
          </a>

          {/* ── Desktop center links ── */}
          <div className="hidden md:flex items-center gap-7">

            {/* How It Works — scroll to landing section */}
            <a
              href="/#how-it-works"
              onClick={goToSection('how-it-works')}
              className={navLinkClass}
              style={linkStyle(false)}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.65')}
            >
              How It Works
            </a>

            {/* Marketplaces — page route */}
            <Link
              href="/marketplaces"
              className={navLinkClass}
              style={linkStyle(isActive('/marketplaces'))}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = isActive('/marketplaces') ? '1' : '0.65')}
            >
              Marketplaces
            </Link>

            {/* Pricing — scroll to landing section */}
            <a
              href="/#pricing"
              onClick={goToSection('pricing')}
              className={navLinkClass}
              style={linkStyle(false)}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.65')}
            >
              Pricing
            </a>

            {/* Support — page route */}
            <Link
              href="/support"
              className={navLinkClass}
              style={linkStyle(isActive('/support'))}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = isActive('/support') ? '1' : '0.65')}
            >
              Support
            </Link>

          </div>

          {/* ── Right: theme + auth + hamburger ── */}
          <div className="flex items-center gap-3">

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${mounted && isDark ? 'light' : 'dark'} mode`}
              className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 group"
              style={{ background: 'transparent', color: 'var(--color-on-surface)', border: 'none', cursor: 'pointer' }}
            >
              <span
                className="material-symbols-outlined text-[20px] transition-transform duration-300"
                style={{
                  fontVariationSettings: (mounted && isDark) ? "'FILL' 1" : "'FILL' 0",
                  transform: (mounted && isDark) ? 'rotate(0deg)' : 'rotate(180deg)',
                  opacity: 0.7,
                }}
              >
                {!mounted || isDark ? 'light_mode' : 'dark_mode'}
              </span>
              <span
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                style={{ background: mounted && isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
              />
            </button>

            {/* Auth control (desktop) */}
            <AuthControl />

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-150"
              style={{ color: 'var(--color-on-surface)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--color-on-background) 6%, transparent)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* ──────────────────────── MOBILE DRAWER ──────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] md:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Slide-in panel */}
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              className="absolute top-0 left-0 bottom-0 w-4/5 max-w-[320px] flex flex-col"
              style={{
                background: 'var(--color-surface)',
                borderRight: '1px solid color-mix(in srgb, var(--color-on-background) 7%, transparent)',
              }}
            >
              {/* Drawer header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-on-background) 7%, transparent)' }}
              >
                <a href="/" onClick={goHome} aria-label="PaperWorking — Return to homepage">
                  <Logo size="sm" />
                </a>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-9 h-9 rounded-lg"
                  style={{ color: 'var(--color-on-surface)', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Links */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {/* How It Works */}
                <a
                  href="/#how-it-works"
                  onClick={goToSection('how-it-works')}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-colors duration-150 no-underline"
                  style={{ color: 'var(--color-on-surface)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
                >
                  How It Works
                </a>

                {/* Marketplaces */}
                <Link
                  href="/marketplaces"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-colors duration-150"
                  style={{ color: 'var(--color-on-surface)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Marketplaces
                </Link>

                {/* Pricing */}
                <a
                  href="/#pricing"
                  onClick={goToSection('pricing')}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-colors duration-150 no-underline"
                  style={{ color: 'var(--color-on-surface)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
                >
                  Pricing
                </a>

                {/* Support */}
                <Link
                  href="/support"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-colors duration-150"
                  style={{ color: 'var(--color-on-surface)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Support
                </Link>

                {/* Theme toggle row */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl text-[14px] font-medium mt-3"
                  style={{ color: 'var(--color-on-surface)' }}
                >
                  <span>Theme</span>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
                    style={{
                      color: 'var(--color-on-surface)',
                      background: 'color-mix(in srgb, var(--color-on-background) 6%, transparent)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    aria-label={`Switch to ${mounted && isDark ? 'light' : 'dark'} mode`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {!mounted || isDark ? 'light_mode' : 'dark_mode'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Auth CTA area */}
              <div
                className="px-4 pb-6 pt-4 space-y-3"
                style={{ borderTop: '1px solid color-mix(in srgb, var(--color-on-background) 7%, transparent)' }}
              >
                <AuthControl mobile />
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
