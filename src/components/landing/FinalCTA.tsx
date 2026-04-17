'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * FinalCTA
 *
 * Bottom-of-page "safety net" hero section — mirrors the top headline
 * but with more urgent subtext for users who scrolled all the way down.
 * Strict PaperWorking monochrome palette.
 */

export default function FinalCTA() {
  return (
    <section className="relative py-32 bg-dashboard border-b border-phase-1 overflow-hidden">
      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 lg:px-8 text-center">
        {/* Urgency tag */}
        <div className="inline-flex items-center space-x-2 mb-8">
          <span className="w-2 h-2 bg-black animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-phase-3">
            Limited Early Access
          </span>
        </div>

        {/* Same headline as hero */}
        <h2 className="text-4xl font-medium tracking-tight text-black sm:text-5xl lg:text-6xl mb-6">
          Stop Pushing Paper.
          <br />
          <span className="text-phase-2">Start Closing Deals.</span>
        </h2>

        {/* Urgent subtext */}
        <p className="mx-auto max-w-xl text-base text-phase-3 leading-relaxed mb-10">
          Every day without PaperWorking is another day of lost revenue.
          Your competitors are already automating. Will you be next?
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-0 border border-phase-1 mb-10 max-w-lg mx-auto">
          <div className="py-4 px-3 border-r border-phase-1">
            <p className="text-2xl font-medium text-black">12hrs</p>
            <p className="text-xs text-phase-2 mt-1">Saved per week</p>
          </div>
          <div className="py-4 px-3 border-r border-phase-1">
            <p className="text-2xl font-medium text-black">3.2×</p>
            <p className="text-xs text-phase-2 mt-1">Faster closings</p>
          </div>
          <div className="py-4 px-3">
            <p className="text-2xl font-medium text-black">$4.8K</p>
            <p className="text-xs text-phase-2 mt-1">Monthly savings</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/pricing"
            className="px-8 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest flex items-center space-x-2 hover:bg-phase-4 transition-colors"
          >
            <span>Automate My First Document</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-4 border border-phase-1 text-phase-4 text-xs font-bold uppercase tracking-widest hover:border-black hover:text-black transition-colors"
          >
            See It In Action
          </Link>
        </div>

        <p className="mt-6 text-xs text-phase-2">
          Free for 14 days · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
