'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Loader2, Menu, X } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Logo from '@/components/brand/Logo';
import FeatureGrid from '@/components/landing/FeatureGrid';
import ProcessTimeline from '@/components/landing/ProcessTimeline';

/* ═══════════════════════════════════════════════════════════════
   PaperWorking — Landing Page (B2B SaaS)
   
   Clerky-inspired: #f2f2f2 base, monochrome, high-trust.
   ═══════════════════════════════════════════════════════════════ */

export default function Home() {
  /* ─── Mobile nav state ─── */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ─── Waitlist form state ─── */
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /* ─── Sticky nav scroll shadow ─── */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ─── Submit to Firestore waitlist collection ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setErrorMsg('Please enter a valid work email.');
      return;
    }

    setStatus('loading');
    try {
      await addDoc(collection(db, 'waitlist'), {
        email: trimmed,
        source: 'hero',
        createdAt: serverTimestamp(),
      });
      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error('Waitlist write failed:', err);
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ═══════════════════════════════════════════════════════
          GLOBAL NAVIGATION — Sticky
          ═══════════════════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-pw-bg/90 backdrop-blur-md border-b border-pw-border shadow-sm'
            : 'bg-pw-bg border-b border-transparent'
        }`}
      >
        <nav className="mx-auto max-w-6xl px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Logo href="/" size="sm" className="text-pw-fg" />

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-pw-muted hover:text-pw-fg transition-colors"
            >
              Log In
            </Link>
            <Link
              href="#waitlist"
              className="px-5 py-2.5 text-sm font-medium bg-pw-black text-pw-white hover:bg-pw-fg transition-colors"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -mr-2 text-pw-fg hover:text-pw-black"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-pw-border bg-pw-bg px-6 py-6 space-y-4">
            <Link
              href="/dashboard"
              className="block w-full text-center py-3 text-sm font-medium text-pw-muted hover:text-pw-fg border border-pw-border transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Log In
            </Link>
            <Link
              href="#waitlist"
              className="block w-full text-center py-3 text-sm font-medium bg-pw-black text-pw-white hover:bg-pw-fg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Start Free Trial
            </Link>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════ */}
      <main className="flex-1">
        <section className="relative py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="max-w-2xl">
              {/* Eyebrow */}
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-pw-muted mb-6">
                Built for real estate teams
              </p>

              {/* H1 */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-pw-fg leading-[1.08] text-balance">
                The Operational Engine for Real Estate Investors.
              </h1>

              {/* Supporting copy */}
              <p className="mt-6 text-lg sm:text-xl text-pw-muted leading-relaxed max-w-xl">
                Replace spreadsheets, shared drives, and email chains with one
                secure platform. PaperWorking automates document workflows,
                enforces role-based access, and gives every team member exactly
                what they need to close deals faster.
              </p>

              {/* ─── Waitlist Form ─── */}
              <div id="waitlist" className="mt-10 max-w-md scroll-mt-24">
                {status === 'success' ? (
                  <div className="flex items-center space-x-3 py-4 px-5 bg-pw-surface border border-pw-border">
                    <CheckCircle className="w-5 h-5 text-pw-fg shrink-0" />
                    <p className="text-sm font-medium text-pw-fg">
                      You&apos;re on the list. We&apos;ll reach out soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <input
                          ref={inputRef}
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (status === 'error') setStatus('idle');
                          }}
                          placeholder="Enter your work email"
                          className={`w-full px-4 py-3 text-sm bg-pw-surface border focus:outline-none transition-colors ${
                            status === 'error'
                              ? 'border-red-400 focus:border-red-500'
                              : 'border-pw-border focus:border-pw-fg'
                          }`}
                          disabled={status === 'loading'}
                          aria-label="Work email address"
                        />
                        {status === 'error' && (
                          <p className="absolute -bottom-5 left-0 text-xs text-red-500">
                            {errorMsg}
                          </p>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="px-6 py-3 text-sm font-medium bg-pw-black text-pw-white hover:bg-pw-fg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer shrink-0"
                      >
                        {status === 'loading' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Start Your First Deal Free</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-pw-subtle">
                      14-day free trial · No credit card required · SOC 2 compliant
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════
          'AHA' SECTION BREAK
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 border-t border-pw-border">
        <div className="mx-auto max-w-6xl px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-pw-fg leading-tight text-balance">
            Stop tracking half-million dollar deals on spreadsheets.
          </h2>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURE GRID — 2x2 Scannable Blocks
          ═══════════════════════════════════════════════════════ */}
      <FeatureGrid />

      {/* ═══════════════════════════════════════════════════════
          PROCESS TIMELINE — Find → Acquire → Renovate → Exit
          ═══════════════════════════════════════════════════════ */}
      <ProcessTimeline />

      {/* ═══════════════════════════════════════════════════════
          FOOTER — Minimal
          ═══════════════════════════════════════════════════════ */}
      <footer className="py-8 border-t border-pw-border">
        <div className="mx-auto max-w-6xl px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-pw-muted space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <Logo size="sm" className="text-pw-fg" />
            <span className="ml-2 text-pw-muted">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex space-x-6">
            <Link href="#" className="hover:text-pw-fg transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-pw-fg transition-colors">Terms</Link>
            <Link href="#" className="hover:text-pw-fg transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
