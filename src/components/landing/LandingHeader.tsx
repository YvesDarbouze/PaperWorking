'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { AnimatePresence, motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════
   LandingHeader — Stitch-synchronized Public Navigation.
   
   Enforces Hanken Grotesk (font-sans) typography,
   sharp corners (rounded-none), container padding (px-6 md:px-10),
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
        <nav className="flex justify-between items-center h-20 px-gutter-desktop max-w-container-max mx-auto">
          {/* Logo Lockup */}
          <Link href="/" className="flex items-center gap-stack-md group cursor-pointer">
            <img
              alt="PaperWorking Logo"
              className="h-8 w-8 rounded-md object-contain"
              src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVQodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
            />
            <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary tracking-tight">
              PaperWorking
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-stack-lg">
            <Link
              href="/#how-it-works"
              className="text-primary font-bold border-b-2 border-primary pb-1 font-label-md text-label-md active:scale-95 transition-transform"
            >
              How It Works
            </Link>
            <Link
              href="/#pricing"
              className="text-on-surface/70 hover:text-on-surface transition-colors font-label-md text-label-md hover:bg-white/5 duration-300 px-3 py-2 rounded-DEFAULT active:scale-95"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="text-on-surface/70 hover:text-on-surface transition-colors font-label-md text-label-md hover:bg-white/5 duration-300 px-3 py-2 rounded-DEFAULT active:scale-95"
            >
              Dashboard
            </Link>
            <Link
              href="/#news"
              className="text-on-surface/70 hover:text-on-surface transition-colors font-label-md text-label-md hover:bg-white/5 duration-300 px-3 py-2 rounded-DEFAULT active:scale-95"
            >
              News
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
              href="/register"
              className="luminous-button px-6 py-3 rounded-DEFAULT font-label-md text-label-md tracking-wide"
            >
              Start Your 14-Day Trial
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-none hover:bg-white/5 transition-colors text-on-surface"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                    src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVQodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
                  />
                  <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary tracking-tight">
                    PaperWorking
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-none hover:bg-white/5 transition-colors text-on-surface"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-6 overflow-y-auto flex-grow">
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileOpen(false)}
                  className="text-primary font-bold border-b border-primary pb-1 font-label-md text-label-md"
                >
                  How It Works
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setMobileOpen(false)}
                  className="text-on-surface/70 hover:text-on-surface transition-colors font-label-md text-label-md py-1"
                >
                  Pricing
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="text-on-surface/70 hover:text-on-surface transition-colors font-label-md text-label-md py-1"
                >
                  Dashboard
                </Link>
                <Link
                  href="/#news"
                  onClick={() => setMobileOpen(false)}
                  className="text-on-surface/70 hover:text-on-surface transition-colors font-label-md text-label-md py-1"
                >
                  News
                </Link>

                <div className="border-t border-white/10 my-4" />

                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="font-label-md text-label-md text-center border border-white/10 py-3 rounded-DEFAULT text-on-surface hover:bg-white/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="luminous-button py-3 rounded-DEFAULT font-label-md text-label-md text-center tracking-wide"
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
