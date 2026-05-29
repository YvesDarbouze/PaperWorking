'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════
   LandingHeader — Stitch-synchronized Public Navigation.
   
   Enforces Hanken Grotesk (font-sans) typography,
   glass radii (CSS cascade), container padding (px-6 md:px-10),
   and high contrast interactive buttons. Fixed header uses
   backdrop blur and sticky scroll styling.
   ═══════════════════════════════════════════════════════ */

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-white/10 dark ${
          scrolled
            ? 'bg-surface/95 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]'
            : 'bg-surface/80 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]'
        }`}
      >
        <nav className="flex justify-between items-center h-16 md:h-20 px-6 md:px-gutter-desktop max-w-container-max mx-auto">
          {/* Logo Lockup */}
          <Link href="/" className="flex items-center gap-stack-md group cursor-pointer">
            <img
              alt="PaperWorking Logo"
              className="h-8 w-8 rounded-md object-contain"
              src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVQodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
            />
            <span className="font-headline-md text-headline-md text-primary dark:text-primary tracking-tight drop-shadow-[0_0_10px_rgba(87,241,219,0.5)]">
              <span className="font-semibold">Paper</span><span className="font-light">Working</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/how-it-works"
              className="text-on-surface/70 hover:text-primary transition-colors duration-300 font-label-md text-label-md"
            >
              How It Works
            </Link>
            <Link
              href="/#pricing"
              className="text-on-surface/70 hover:text-primary transition-colors duration-300 font-label-md text-label-md"
            >
              Pricing
            </Link>
            <Link
              href="/#news"
              className="text-on-surface/70 hover:text-primary transition-colors duration-300 font-label-md text-label-md"
            >
              News
            </Link>
            <Link
              href="/support"
              className="text-on-surface/70 hover:text-primary transition-colors duration-300 font-label-md text-label-md"
            >
              Help
            </Link>
          </div>

          {/* Auth & CTAs */}
          <div className="flex items-center gap-stack-md">
            <Link
              href="/login"
              className="hidden md:block font-label-md text-label-md text-on-surface hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/#pricing"
              className="luminous-button px-6 py-3 rounded-lg font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150"
            >
              Start Your 14-Day Trial
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 hover:bg-white/5 transition-colors text-primary"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <span className="material-symbols-outlined text-2xl">close</span>
              ) : (
                <span className="material-symbols-outlined text-2xl">menu</span>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Overlay */}
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
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-stack-md"
                >
                  <img
                    alt="PaperWorking Logo"
                    className="h-8 w-8 rounded-md object-contain"
                    src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
                  />
                  <span className="font-headline-md text-headline-md text-primary dark:text-primary tracking-tight drop-shadow-[0_0_10px_rgba(87,241,219,0.5)]">
                    <span className="font-semibold">Paper</span><span className="font-light">Working</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-10 h-10 hover:bg-white/5 transition-colors text-on-surface"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-6 overflow-y-auto flex-grow">
                <Link
                  href="/how-it-works"
                  onClick={() => setMobileOpen(false)}
                  className="text-on-surface/70 hover:text-primary transition-colors font-label-md text-label-md py-1"
                >
                  How It Works
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setMobileOpen(false)}
                  className="text-on-surface/70 hover:text-primary transition-colors font-label-md text-label-md py-1"
                >
                  Pricing
                </Link>
                <Link
                  href="/#news"
                  onClick={() => setMobileOpen(false)}
                  className="text-on-surface/70 hover:text-primary transition-colors font-label-md text-label-md py-1"
                >
                  News
                </Link>
                <Link
                  href="/support"
                  onClick={() => setMobileOpen(false)}
                  className="text-on-surface/70 hover:text-primary transition-colors font-label-md text-label-md py-1"
                >
                  Help
                </Link>

                <div className="border-t border-white/10 my-4" />

                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="font-label-md text-label-md text-center border border-white/10 py-3 rounded-lg text-on-surface hover:bg-white/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setMobileOpen(false)}
                  className="luminous-button py-3 rounded-lg font-label-md text-label-md text-center tracking-wide"
                >
                  Start Your 14-Day Trial
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-background/90 backdrop-blur-xl border-t border-white/10 px-8 py-3 flex justify-between items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="text-[9px] font-bold uppercase tracking-tighter">Home</span>
        </Link>
        <Link href="/how-it-works" className="flex flex-col items-center gap-1 text-on-surface-variant/50">
          <span className="material-symbols-outlined text-[20px]">account_tree</span>
          <span className="text-[9px] uppercase tracking-tighter">How It Works</span>
        </Link>
        <Link href="/#pricing" className="flex flex-col items-center gap-1 text-on-surface-variant/50">
          <span className="material-symbols-outlined text-[20px]">payments</span>
          <span className="text-[9px] uppercase tracking-tighter">Pricing</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center gap-1 text-on-surface-variant/50">
          <span className="material-symbols-outlined text-[20px]">login</span>
          <span className="text-[9px] uppercase tracking-tighter">Sign In</span>
        </Link>
      </nav>
    </>
  );
}
