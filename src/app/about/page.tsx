import { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /about — Company page
   
   Verbatim approved copy — 2026-07-29
   Obsidian glass theme. Unified LandingHeader navigation.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'About PaperWorking | Built for Serious Real Estate Investors',
  description:
    'PaperWorking is the real estate investment operating system. One place for every deal, dollar, and deadline — Acquisition, Fund, Hold, Exit.',
};

const PRINCIPLES = [
  {
    n: 1,
    body: 'Built for investors, not adapted for them. The four-phase lifecycle is the product\'s spine, not a feature.',
  },
  {
    n: 2,
    body: 'Numbers over adjectives. We publish the 33 KPIs and their formulas. If a metric matters, you can check the math.',
  },
  {
    n: 3,
    body: 'Your data is yours. Export everything, anytime. Cancel from Settings. No hostage negotiations.',
  },
  {
    n: 4,
    // COMPLIANCE: verbatim — "it never moves money" and "not investment advice" are required compliance language. Do not alter.
    body: 'Honest about what we do. PaperWorking tracks interest; it never moves money. It produces reports for your CPA; it doesn\'t file your taxes. It\'s project management software, not investment advice.',
  },
  {
    n: 5,
    body: 'Community compounds. Tools bring investors here; the network of deals and professionals keeps them.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-5xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">

        {/* ── Hero ── */}
        <section className="mb-28">
          {/* Eyebrow pill */}
          <span className="inline-flex items-center gap-2 glass-panel px-4 py-1.5 rounded-full mb-8 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary type-eyebrow">
              About PaperWorking
            </span>
          </span>

          {/* Headline — only .type-display on this page */}
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight mb-8 type-display">
            Stock investors get dashboards. Real estate investors deserve the same.
          </h1>
        </section>

        {/* ── Why PaperWorking exists ── */}
        <section className="mb-28">
          <div
            className="rounded-2xl p-10 sm:p-14"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-6 type-eyebrow">
              Why PaperWorking exists
            </p>
            <div className="space-y-6">
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed type-body">
                A stock investor opens an app and sees, in seconds, what every position is worth and how it&apos;s performing. A real estate investor — carrying far larger positions — gets a spreadsheet from 2019 and a folder of PDFs.
              </p>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed type-body">
                We built PaperWorking to close that gap. Not with another calculator. Not with office task software relabeled for investors. A system built on the way a real estate deal actually works: Acquisition, Fund, Hold, Exit.
              </p>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed type-body">
                The idea is simple. You already do the work: the walkthroughs, the budgets, the contractor calls, the rent collection. That work produces data. PaperWorking captures it as you go and turns it into the 33 numbers investors, lenders, and appraisers use to judge a deal. The metrics are a byproduct of the work, not extra work.
              </p>
            </div>
          </div>
        </section>

        {/*
          TODO(FOUNDER): Founder story section — DO NOT PUBLISH until verified.
          Production note 11: do not publish invented history.
          Publish this section only after the founder provides verified background.
          
          [FOUNDER STORY PLACEHOLDER — supply biographical details.
          Production note 11: do not publish invented history.
          Publish this section only after the founder provides verified background.]
        */}

        {/* ── Mission ── */}
        <section className="mb-28">
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-6 type-h2">
            Mission
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-3xl type-body-lg">
            Give serious real estate investors the visibility stock and commodity investors take for granted: one place where every deal, dollar, and deadline adds up to a clear picture of performance.
          </p>
        </section>

        {/* ── Principles ── */}
        <section className="mb-28">
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-10 type-h2">
            Principles
          </h2>
          <ol className="space-y-6">
            {PRINCIPLES.map((p) => (
              <li
                key={p.n}
                className="rounded-2xl p-8 flex gap-6 items-start"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  borderLeft: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {/* Numeral */}
                <span className="font-jetbrains text-[11px] font-bold text-primary/60 uppercase tracking-widest flex-shrink-0 mt-1 type-caption">
                  {String(p.n).padStart(2, '0')}
                </span>
                {/* Body */}
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed type-body">
                  {p.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── CTAs ── */}
        <section className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link
              href="/pricing"
              className="luminous-button inline-flex items-center gap-2 px-8 py-3 rounded-lg font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150 type-cta"
            >
              Start 14-Day Trial
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border border-white/10 text-on-surface font-label-md text-label-md hover:border-primary/40 hover:text-primary transition-all duration-150 type-cta"
            >
              See how it works
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </section>

      </main>

      <LandingFooter />
    </div>
  );
}
