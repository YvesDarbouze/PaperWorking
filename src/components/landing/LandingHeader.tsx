'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '@/components/brand/Logo';

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
  { icon: 'verified_user', title: 'Transaction', subtitle: 'Contracts, title and compliance.' },
  { icon: 'construction', title: 'Rehab', subtitle: 'Budgets, bids and contractor tracking.' },
  { icon: 'account_balance', title: 'Hold & Exit', subtitle: 'NOI tracking and ROI reporting.' },
];

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [howOpen, setHowOpen]       = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
          <Logo href="/" size="sm" />

          {/* ── Desktop center links ── */}
          <div className="hidden md:flex items-center gap-7">

            <Link
              href="/"
              className="nav-link text-[13.5px] font-medium text-[var(--color-on-surface)] opacity-70 hover:opacity-100 transition-opacity duration-150"
            >
              Home
            </Link>

            {/* How It Works dropdown */}
            <div
              ref={dropRef}
              className="relative"
              onMouseEnter={enterDrop}
              onMouseLeave={leaveDrop}
            >
              <button
                type="button"
                onClick={() => setHowOpen(v => !v)}
                className="flex items-center gap-0.5 text-[13.5px] font-medium transition-opacity duration-150"
                style={{
                  color: 'var(--color-on-surface)',
                  opacity: howOpen ? 1 : 0.7,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
                aria-expanded={howOpen}
                aria-haspopup="true"
              >
                How It Works
                <span
                  className="material-symbols-outlined text-[15px] ml-0.5 transition-transform duration-200"
                  style={{
                    fontVariationSettings: "'FILL' 0, 'wght' 400",
                    transform: howOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    opacity: 0.6,
                  }}
                >
                  keyboard_arrow_down
                </span>
              </button>

              <AnimatePresence>
                {howOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{   opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.19, 1, 0.22, 1] }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[260px] z-[100] rounded-2xl p-1.5 overflow-hidden"
                    style={{
                      background: 'var(--color-surface-container-low, var(--color-surface))',
                      border: '1px solid color-mix(in srgb, var(--color-on-background) 8%, transparent)',
                      boxShadow: '0 12px 40px -4px rgba(0,0,0,0.12), 0 4px 12px -2px rgba(0,0,0,0.06)',
                    }}
                  >
                    {HOW_IT_WORKS_ITEMS.map((item) => (
                      <Link
                        key={item.title}
                        href="/how-it-works"
                        onClick={() => setHowOpen(false)}
                        className="group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors duration-100"
                        style={{ textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div
                          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                          style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
                        >
                          <span
                            className="material-symbols-outlined text-[15px]"
                            style={{ color: 'var(--color-primary)', fontVariationSettings: "'FILL' 0" }}
                          >
                            {item.icon}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--color-on-surface)' }}>
                            {item.title}
                          </p>
                          <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
                            {item.subtitle}
                          </p>
                        </div>
                      </Link>
                    ))}

                    <div
                      className="mt-1 pt-1 px-1"
                      style={{ borderTop: '1px solid color-mix(in srgb, var(--color-on-background) 6%, transparent)' }}
                    >
                      <Link
                        href="/how-it-works"
                        onClick={() => setHowOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors duration-100"
                        style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 8%, transparent)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        View full process overview
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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

            {/* Sign In — text link */}
            <Link
              href="/login"
              className="hidden md:inline-flex text-[13.5px] font-medium transition-opacity duration-150"
              style={{ color: 'var(--color-on-surface)', opacity: 0.7, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              Sign In
            </Link>

            {/* Primary CTA — pill button */}
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
              Start 14-Day Free Trial
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
                arrow_forward
              </span>
            </Link>

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
                <Logo href="/" size="sm" />
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
                {[
                  { label: 'Home', href: '/' },
                  { label: 'How It Works', href: '/how-it-works' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Support', href: '/support' },
                ].map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-colors duration-150"
                    style={{ color: 'var(--color-on-surface)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-on-background) 5%, transparent)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {/* CTA area */}
              <div
                className="px-4 pb-6 pt-4 space-y-3"
                style={{ borderTop: '1px solid color-mix(in srgb, var(--color-on-background) 7%, transparent)' }}
              >
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
                  Start 14-Day Free Trial
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
