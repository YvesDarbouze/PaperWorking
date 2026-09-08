'use client';

import Link from 'next/link';
import {
  heroHeadline,
  heroSubheadline,
  heroBody,
  heroInsurance,
  heroKicker,
} from '@/lib/marketing/copy';

function BrowserMockup() {
  return (
    <div className="relative w-full aspect-[16/10] min-w-[280px] max-w-[600px] rounded-2xl overflow-hidden border border-white/10 bg-[#161622] shadow-[0_24px_50px_rgba(0,0,0,0.5)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-[#12121a] px-4 py-3 border-b border-white/[0.06]">
        {/* Window controls */}
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        </div>
        {/* Address bar */}
        <div className="mx-auto flex h-6 w-3/5 items-center justify-center rounded-lg bg-white/[0.04] px-3 border border-white/[0.06] text-[10px] text-white/40 font-medium tracking-wide">
          paperworking.co/dashboard
        </div>
        {/* Right spacer to balance window controls */}
        <div className="w-12" />
      </div>
      
      {/* Inner Screen - Gradient placeholder */}
      <div className="relative h-[calc(100%-48px)] w-full bg-gradient-to-br from-[#121420] via-[#1b1c30] to-[#0c0d15] flex flex-col items-center justify-center">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:16px_16px]" />
        {/* Soft center glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/10 blur-[45px]" aria-hidden />
        
        <span className="relative z-10 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-widest text-white/40">
          Dashboard preview
        </span>
      </div>
    </div>
  );
}

export default function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden bg-[#0a0a0f] py-16 md:py-24 lg:py-28">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-[600px] w-[700px] rounded-full bg-[color:var(--color-primary)]/[0.06] blur-[160px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          
          {/* Left Text Column */}
          <div className="flex flex-col items-start text-left space-y-6">
            {/* Kicker bar */}
            <span className="inline-block text-[14px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-primary)]">
              {heroKicker}
            </span>

            {/* Headline */}
            <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.05]">
              {heroHeadline}
            </h1>

            {/* Subheadline */}
            <h2 className="text-[20px] leading-relaxed text-white/70">
              {heroSubheadline}
            </h2>

            {/* Body and Insurance paragraphs */}
            <div className="space-y-4">
              <p className="text-[16px] leading-[1.65] text-white/50">
                {heroBody}
              </p>
              <p className="text-[16px] leading-[1.65] text-white/50">
                {heroInsurance}
              </p>
            </div>

            {/* CTA row */}
            <div className="flex w-full flex-col gap-3.5 sm:flex-row sm:w-auto">
              <Link
                href="/pricing"
                className="inline-flex min-h-[44px] items-center justify-center bg-[color:var(--color-primary)] text-[#0a0a0f] px-6 py-3 text-[14px] font-semibold rounded-[10px] hover:brightness-110 transition shadow-[0_0_24px_-4px_rgba(0,221,148,0.35)]"
              >
                Get started
              </Link>
              <Link
                href="#deal-calculator"
                className="inline-flex min-h-[44px] items-center justify-center border border-white/15 hover:border-white/30 text-white px-6 py-3 text-[14px] font-semibold rounded-[10px] transition"
              >
                See how it works
              </Link>
            </div>
          </div>

          {/* Right Visual Column */}
          <div className="relative flex justify-center lg:justify-end">
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl bg-[color:var(--color-primary)]/[0.04] blur-[50px]"
              aria-hidden
            />
            <BrowserMockup />
          </div>

        </div>
      </div>
    </section>
  );
}
