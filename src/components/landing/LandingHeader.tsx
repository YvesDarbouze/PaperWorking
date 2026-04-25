'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/brand/Logo';

/* ═══════════════════════════════════════════════════════
   LandingHeader — Responsive with mobile hamburger menu
   
   Breakpoints:
     < md  → hamburger (mobile / small tablet)
     ≥ md  → full horizontal nav
   ═══════════════════════════════════════════════════════ */

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(242, 242, 242, 0)', 'rgba(242, 242, 242, 0.92)']
  );
  const backdropFilter = useTransform(
    scrollY,
    [0, 50],
    ['blur(0px)', 'blur(12px)']
  );

  return (
    <>
      <motion.header
        style={{ backgroundColor, backdropFilter }}
        className="fixed w-full top-0 z-50 border-b border-transparent"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            {/* ── Logo ── */}
            <div className="flex items-center gap-8 shrink-0">
              <Logo size="sm" />
            </div>

            {/* ── Desktop Nav (≥ md) ── */}
            <nav className="hidden md:flex gap-10 items-center" aria-label="Global">
              <Link
                href="/#how-it-works"
                className="text-sm font-medium text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/#pricing"
                className="text-sm font-medium text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/#news"
                className="text-sm font-medium text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors"
              >
                News
              </Link>
              <Link
                href="/support"
                className="text-sm font-medium text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors"
              >
                Help
              </Link>
            </nav>

            {/* ── Desktop Auth Buttons (≥ md) ── */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="ag-button !bg-transparent !text-[var(--pw-black)] !border !border-[var(--pw-border)] hover:!bg-black/5 text-sm"
              >
                Sign-in
              </Link>
              <Link
                href="/register"
                className="ag-button text-sm"
              >
                Sign-up
              </Link>
            </div>

            {/* ── Mobile Hamburger (< md) ── */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-black/5 transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <X className="w-5 h-5 text-[var(--pw-black)]" />
              ) : (
                <Menu className="w-5 h-5 text-[var(--pw-black)]" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile Drawer Overlay (< md) ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer panel */}
            <motion.nav
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
              className="absolute top-16 left-4 right-4 rounded-2xl bg-[var(--pw-surface)] shadow-2xl border border-[var(--pw-border)] p-6 flex flex-col gap-4"
            >
              <Link
                href="/#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-[var(--pw-fg)] hover:text-[var(--pw-black)] transition-colors py-2"
              >
                How It Works
              </Link>
              <Link
                href="/#pricing"
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-[var(--pw-fg)] hover:text-[var(--pw-black)] transition-colors py-2"
              >
                Pricing
              </Link>
              <Link
                href="/#news"
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-[var(--pw-fg)] hover:text-[var(--pw-black)] transition-colors py-2"
              >
                News
              </Link>
              <Link
                href="/support"
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-[var(--pw-fg)] hover:text-[var(--pw-black)] transition-colors py-2"
              >
                Help
              </Link>

              <div className="border-t border-[var(--pw-border)] my-2" />

              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="ag-button !bg-transparent !text-[var(--pw-black)] border border-[var(--pw-border)] text-center text-base"
              >
                Sign-in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="ag-button text-center text-base"
              >
                Sign-up
              </Link>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
