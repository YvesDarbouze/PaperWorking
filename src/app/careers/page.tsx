import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /careers — Careers placeholder
   
   Obsidian glass theme. Unified LandingHeader navigation.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Careers | PaperWorking',
  description:
    'Join the team building the deal-intelligence platform for modern real estate investors.',
};

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-4xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Header ── */}
        <section className="mb-20">
          <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-6">
            Careers
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-8">
            Build something <br className="hidden sm:block" />
            investors rely on.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-2xl">
            PaperWorking is a small, focused team solving a real problem: the
            operational chaos that costs real estate investors time and money on
            every deal. We&apos;re looking for people who ship fast, care about
            craft, and want their work to matter.
          </p>
        </section>

        {/* ── Culture values ── */}
        <section
          className="rounded-2xl p-10 sm:p-14 mb-20"
          style={{
            background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-6">
            How We Work
          </p>
          <ul className="space-y-6">
            {[
              {
                title: 'Outcome over output',
                body: 'We measure success by investor results — fewer missed deadlines, faster closings, less money leaked to holding costs.',
              },
              {
                title: 'Small team, full ownership',
                body: 'Everyone touches product, talks to users, and ships to production. No spectators.',
              },
              {
                title: 'Remote-first, async-default',
                body: 'We write things down, respect deep work, and keep meetings to the minimum required for alignment.',
              },
            ].map((v) => (
              <li key={v.title}>
                <h3 className="font-label-md text-label-md text-on-surface mb-1">
                  {v.title}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {v.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Open roles CTA ── */}
        <section
          className="rounded-2xl p-10 sm:p-14 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(34,43,50,0.6), rgba(20,29,35,0.95))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-3">
            No open roles right now — but we&apos;re always listening.
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-8 max-w-md mx-auto">
            If you&apos;re an engineer, designer, or domain expert in real estate
            finance and think you can contribute, reach out directly.
          </p>
          <a
            href="mailto:careers@paperworking.co"
            className="luminous-button inline-flex items-center gap-2 px-8 py-3 rounded-lg font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150"
          >
            careers@paperworking.co
            <ArrowRight className="w-4 h-4" />
          </a>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
