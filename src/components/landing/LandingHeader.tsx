'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '@/components/brand/Logo';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════
   LandingHeader — Antigravity-style sticky nav.

   Desktop nav (L → R):
     Logo  |  Home  How It Works▾  Pricing  Support  |  Sign In  [Start 14-Day Free Trial]

   Scroll behaviour:
     default  → bg/92 + blur(16px) + border-b
     scrolled → bg/96 + blur(20px) + border-b + subtle shadow
   ═══════════════════════════════════════════════════════ */

const HOW_IT_WORKS_ITEMS = [
  { icon: 'search_home', title: 'Acquisition', subtitle: 'Source deals and secure capital.' },
  { icon: 'verified_user', title: 'Fund', subtitle: 'Contracts, title and compliance.' },
  { icon: 'construction', title: 'Hold', subtitle: 'Budgets, bids and contractor tracking.' },
  { icon: 'account_balance', title: 'Exit', subtitle: 'NOI tracking and ROI reporting.' },
];

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [howOpen, setHowOpen]       = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === 'dark';
  const { user, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onOut = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setHowOpen(false);
      }
    };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  const enterDrop = () => { if (timerRef.current) clearTimeout(timerRef.current); setHowOpen(true); };
  const leaveDrop = () => { timerRef.current = setTimeout(() => setHowOpen(false), 100); };

  return (
    <>
      {/* ──────────────────────── HEADER ──────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'shadow-[0_1px_12px_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_12px_0_rgba(0,0,0,0.4)]'
            : ''
        }`}
        style={{
          /* Light mode: warm white / Dark mode: warm black — both with blur */
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
          <Logo href="/" surface="marketing-nav" size="sm" />

          {/* ── Desktop center links ── */}
          <div className="hidden md:flex items-center gap-7">

            <Link
              href="/how-it-works"
              className="text-[13.5px] font-medium transition-opacity duration-150"
              style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              How It Works
            </Link>

            <Link
              href="/marketplaces"
              className="text-[13.5px] font-medium transition-opacity duration-150"
              style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              Marketplaces
            </Link>

            <Link
              href="/pricing"
              className="text-[13.5px] font-medium transition-opacity duration-150"
              style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              Pricing
            </Link>

            <Link
              href="/support/metrics"
              className="text-[13.5px] font-medium transition-opacity duration-150"
              style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              Playbook
            </Link>

            <Link
              href="/support"
              className="text-[13.5px] font-medium transition-opacity duration-150"
              style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              Support
            </Link>
          </div>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-3">

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${mounted && isDark ? 'light' : 'dark'} mode`}
              className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 group"
              style={{
                background: 'transparent',
                color: 'var(--color-on-surface)',
                border: 'none',
                cursor: 'pointer',
              }}
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
                style={{
                  background: mounted && isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.06)',
                }}
              />
            </button>

            {/* Sign In / Sign Up / Sign Out */}
            {user ? (
              <>
                <button
                  onClick={() => logout()}
                  className="hidden md:inline-flex text-[13.5px] font-medium transition-opacity duration-150"
                  style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                >
                  Sign Out
                </button>
                <Link
                  href="/dashboard"
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
                  Dashboard
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
                    arrow_forward
                  </span>
                </Link>
              </>
            ) : (
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
                <span className="hidden md:inline-block text-[13.5px] opacity-30 select-none">/</span>
                <Link
                  href="/register"
                  className="hidden md:inline-flex text-[13.5px] font-medium transition-opacity duration-150"
                  style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                >
                  Sign Up
                </Link>
                <Link
                  href="/pricing"
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
                  Start 14 Day Trial
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
                    arrow_forward
                  </span>
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-150"
              style={{ color: 'var(--color-on-surface)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-on-background) 6%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
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
                <Logo href="/" surface="marketing-nav" size="sm" />
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
                <Link
                  href="/how-it-works"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-colors duration-150"
                  style={{ color: 'var(--color-on-surface)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  How It Works
                </Link>

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
                <Link
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-colors duration-150"
                  style={{ color: 'var(--color-on-surface)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Pricing
                </Link>

                {/* Playbook */}
                <Link
                  href="/support/metrics"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-colors duration-150"
                  style={{ color: 'var(--color-on-surface)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Playbook
                </Link>

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

                {/* Theme toggle row for mobile */}
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

              {/* CTA area */}
              <div
                className="px-4 pb-6 pt-4 space-y-3"
                style={{ borderTop: '1px solid color-mix(in srgb, var(--color-on-background) 7%, transparent)' }}
              >
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[14px] font-semibold transition-opacity duration-150 active:scale-[0.98]"
                      style={{
                        background: 'var(--color-on-surface)',
                        color: 'var(--color-surface)',
                        textDecoration: 'none',
                        borderRadius: '9999px',
                      }}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-[14px] font-medium transition-colors duration-150"
                      style={{
                        color: 'var(--color-on-surface)',
                        border: '1px solid color-mix(in srgb, var(--color-on-background) 12%, transparent)',
                        textDecoration: 'none',
                        background: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-[14px] font-medium transition-colors duration-150"
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
                        className="flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-[14px] font-medium transition-colors duration-150"
                        style={{
                          color: 'var(--color-on-surface)',
                          border: '1px solid color-mix(in srgb, var(--color-on-background) 12%, transparent)',
                          textDecoration: 'none',
                        }}
                      >
                        Sign Up
                      </Link>
                    </div>
                    <Link
                      href="/pricing"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[14px] font-semibold transition-opacity duration-150 active:scale-[0.98]"
                      style={{
                        background: 'var(--color-on-surface)',
                        color: 'var(--color-surface)',
                        textDecoration: 'none',
                        borderRadius: '9999px',
                      }}
                    >
                      Start 14 Day Trial
                    </Link>
                  </>
                )}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
