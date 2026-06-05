'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   LandingHeader — Stitch-synchronized Public Navigation.

   Nav contract (desktop, L→R):
     Logo | How It Works (dropdown) | Pricing | Dashboard | News | Sign In | CTA button

   Scrolled state: bg-surface/95 + shadow
   Default state: bg-surface/80 + backdrop-blur-xl
   ═══════════════════════════════════════════════════════ */

const HOW_IT_WORKS_ITEMS = [
  {
    icon: 'hub',
    title: 'Acquisition',
    subtitle: 'Source & secure capital.',
  },
  {
    icon: 'verified_user',
    title: 'Purchase',
    subtitle: 'Automated compliance.',
  },
  {
    icon: 'speed',
    title: 'Hold',
    subtitle: 'Real-time margin tracking.',
  },
  {
    icon: 'account_balance',
    title: 'Exit',
    subtitle: 'Instant ROI reporting.',
  },
];

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownEnter = () => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setDropdownOpen(true);
  };

  const handleDropdownLeave = () => {
    dropdownTimerRef.current = setTimeout(() => setDropdownOpen(false), 120);
  };

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-white/10 dark ${
          scrolled
            ? 'bg-surface/95 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]'
            : 'bg-surface/80 backdrop-blur-xl'
        }`}
      >
        <nav className="flex justify-between items-center h-16 md:h-20 px-6 md:px-10 max-w-[1280px] mx-auto">

          {/* ── Logo Lockup ── */}
          <Logo href="/" size="sm" className="drop-shadow-[0_0_10px_rgba(69,73,85,0.5)]" />

          {/* ── Desktop Center Nav ── */}
          <div className="hidden md:flex items-center gap-8">

            {/* How It Works — with dropdown */}
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={handleDropdownEnter}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className={`flex items-center gap-1 font-label-md text-label-md transition-colors duration-200 pb-0.5 ${
                  dropdownOpen
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface/70 hover:text-primary border-b-2 border-transparent'
                }`}
              >
                How It Works
                <span
                  className="material-symbols-outlined text-[16px] transition-transform duration-200"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
                >
                  {dropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Dropdown Panel */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: [0.19, 1, 0.22, 1] }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 glass-panel rounded-2xl p-2 z-[100] shadow-[0_16px_48px_0_rgba(0,0,0,0.45)]"
                  >
                    <div className="flex flex-col gap-1">
                      {HOW_IT_WORKS_ITEMS.map((item) => (
                        <Link
                          key={item.title}
                          href="/#how-it-works"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors duration-150 group/item"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span
                              className="material-symbols-outlined text-[18px] text-primary"
                              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
                            >
                              {item.icon}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-headline-md text-[13px] leading-none font-semibold text-on-surface group-hover/item:text-primary transition-colors">
                              {item.title}
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Footer link */}
                    <div className="border-t border-white/8 mt-2 pt-2 px-1">
                      <Link
                        href="/#how-it-works"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors font-label-md text-label-md text-primary"
                      >
                        View Full Process
                        <span
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
                        >
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/#pricing"
              className="font-label-md text-label-md text-on-surface/70 hover:text-primary transition-colors duration-200"
            >
              Pricing
            </Link>

            <Link
              href="/dashboard"
              className="font-label-md text-label-md text-on-surface/70 hover:text-primary transition-colors duration-200"
            >
              Dashboard
            </Link>

            <Link
              href="/#news"
              className="font-label-md text-label-md text-on-surface/70 hover:text-primary transition-colors duration-200"
            >
              News
            </Link>
          </div>

          {/* ── Right Side: Sign In + CTA + Hamburger ── */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden md:block font-label-md text-label-md text-on-surface hover:text-primary transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="hidden md:block luminous-button px-5 py-2.5 rounded-lg font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150 whitespace-nowrap"
            >
              Start Your 14-Day Trial
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 hover:bg-white/5 rounded-lg transition-colors text-primary"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] md:hidden dark"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer panel */}
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
              className="absolute top-0 left-0 bottom-0 w-4/5 max-w-sm bg-background/95 backdrop-blur-xl border-r border-white/10 flex flex-col p-6 text-on-surface"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div onClick={() => setMobileOpen(false)}>
                  <Logo href="/" size="sm" className="drop-shadow-[0_0_10px_rgba(69,73,85,0.5)]" />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-10 h-10 hover:bg-white/5 rounded-lg transition-colors text-on-surface"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {/* Drawer links */}
              <div className="flex flex-col gap-1 overflow-y-auto flex-grow">
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileOpen(false)}
                  className="font-label-md text-label-md text-primary border-b border-white/8 pb-3 mb-1 flex items-center justify-between"
                >
                  How It Works
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
                </Link>

                {/* Inline dropdown items for mobile */}
                <div className="flex flex-col gap-0.5 pl-3 mb-3">
                  {HOW_IT_WORKS_ITEMS.map((item) => (
                    <Link
                      key={item.title}
                      href="/#how-it-works"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                          {item.icon}
                        </span>
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface">{item.title}</p>
                        <p className="text-[12px] text-on-surface-variant">{item.subtitle}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                <Link
                  href="/#pricing"
                  onClick={() => setMobileOpen(false)}
                  className="font-label-md text-label-md text-on-surface/70 hover:text-primary transition-colors py-3 px-2 rounded-xl hover:bg-white/5"
                >
                  Pricing
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="font-label-md text-label-md text-on-surface/70 hover:text-primary transition-colors py-3 px-2 rounded-xl hover:bg-white/5"
                >
                  Dashboard
                </Link>
                <Link
                  href="/#news"
                  onClick={() => setMobileOpen(false)}
                  className="font-label-md text-label-md text-on-surface/70 hover:text-primary transition-colors py-3 px-2 rounded-xl hover:bg-white/5"
                >
                  News
                </Link>

                <div className="border-t border-white/10 my-4" />

                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="font-label-md text-label-md text-center border border-white/10 py-3 rounded-xl text-on-surface hover:bg-white/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="luminous-button py-3 rounded-xl font-label-md text-label-md text-center tracking-wide mt-2"
                >
                  Start Your 14-Day Trial
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
