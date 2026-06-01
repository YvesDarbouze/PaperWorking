'use client';

import Link from 'next/link';
import TrustBar from '@/components/landing/TrustBar';
import { useFeatureFlagVariantKey } from 'posthog-js/react';

/* ═══════════════════════════════════════════════════════
   LandingHero — Stitch Obsidian Edition.

   Centered hero with:
   • Glass-pill badge ("The Real Estate Investment Operating System")
   • Headline with text-glow
   • Outcome-focused A/B copy
   • Luminous CTA → /register
   • Trust stats bento grid
   ═══════════════════════════════════════════════════════ */

export default function LandingHero() {
  const variant = useFeatureFlagVariantKey('landing-page-hero-copy');
  const isVariantB = variant === 'test' || variant === 'variant-b';

  return (
    <section className="relative flex flex-col items-center justify-center pt-28 md:pt-40 pb-16 md:pb-24 overflow-hidden w-full">
      {/* Abstract background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/10 blur-[120px] rounded-full z-0 pointer-events-none" />

      {/* Content — centered single column */}
      <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-6 w-full flex flex-col items-center text-center">
        {/* Badge */}
        <span className="hidden md:inline-block text-xs font-semibold uppercase tracking-[0.05em] text-primary glass-card px-3 py-1 rounded-full mb-6">
          Real-Estate-Native Project Management OS
        </span>

        {/* Headline */}
        <h1 className="text-[28px] md:text-[48px] leading-[36px] md:leading-[56px] font-bold tracking-tight text-on-surface mb-4 max-w-4xl">
          {/* Desktop Headline */}
          <span className="hidden md:inline">
            {isVariantB ? (
              <>
                Real-estate-native{' '}
                <span className="text-primary text-glow">project management.</span>
              </>
            ) : (
              <>
                The project management OS for{' '}
                <span className="text-primary text-glow">serious investors.</span>
              </>
            )}
          </span>
          {/* Mobile Headline */}
          <span className="inline md:hidden">
            {isVariantB ? (
              <>
                Real-estate-native{' '}
                <span className="text-primary text-glow">project management.</span>
              </>
            ) : (
              <>Real-Estate-Native Project Management. Built for Serious Investors.</>
            )}
          </span>
        </h1>

        {/* Sub-copy */}
        <div className="text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto mb-8 leading-relaxed">
          {/* Desktop Sub-copy */}
          <p className="hidden md:block">
            {isVariantB
              ? "The only project management workspace built around how real estate deals actually work. Model returns, track rehab tasks, and auto-generate tax packs—all in one place."
              : "Every day a deal is delayed, holding costs eat your profits. PaperWorking centralizes your deal pipeline, tracks milestones, and automates closing documents so you can scale without the chaos."}
          </p>
          {/* Mobile Sub-copy */}
          <p className="block md:hidden">
            {isVariantB
              ? "The project management workspace built around how real estate deals actually work. Model returns, track rehab tasks, and auto-generate tax packs."
              : "Centralize your deal pipeline, automate documentation, and track milestones in real-time."}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto mb-4">
          <Link
            href="/register"
            className="w-full sm:w-auto luminous-button px-8 py-4 rounded-full text-sm font-semibold flex items-center justify-center gap-2 group"
          >
            Start Your 14-Day Trial
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>
        <p className="text-sm text-on-surface-variant/70">
          14-day trial · Credit card required · No charge until day 15
        </p>
      </div>

      {/* Trust stats bento */}
      <div className="relative z-10 max-w-container-max mx-auto px-5 md:px-6 w-full mt-16 md:mt-20">
        <TrustBar />
      </div>
    </section>
  );
}
