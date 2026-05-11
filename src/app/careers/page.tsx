import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /careers — Careers placeholder
   
   Lean page that communicates culture and directs
   interested candidates to email. No open roles listed
   until the hiring pipeline is live.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Careers | PaperWorking',
  description:
    'Join the team building the deal-intelligence platform for modern real estate investors.',
};

export default function CareersPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <MarketingNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* ── Header ── */}
        <section className="mb-20">
          <p
            className="text-[10px] font-black uppercase tracking-[0.35em] mb-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            Careers
          </p>
          <h1
            className="text-5xl sm:text-6xl font-black tracking-tighter leading-none mb-8"
            style={{ color: 'var(--text-primary)' }}
          >
            Build something <br className="hidden sm:block" />
            investors rely on.
          </h1>
          <p
            className="text-lg leading-relaxed max-w-2xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            PaperWorking is a small, focused team solving a real problem: the
            operational chaos that costs real estate investors time and money on
            every deal. We&apos;re looking for people who ship fast, care about
            craft, and want their work to matter.
          </p>
        </section>

        {/* ── Culture values ── */}
        <section
          className="rounded-xl p-10 sm:p-14 mb-20"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-ui)',
          }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-[0.35em] mb-6"
            style={{ color: 'var(--text-secondary)' }}
          >
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
                <h3
                  className="text-sm font-bold tracking-tight mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {v.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {v.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Open roles CTA ── */}
        <section
          className="rounded-xl p-10 sm:p-14 text-center"
          style={{ background: '#0d0d0d', color: '#FFFFFF' }}
        >
          <h2 className="text-2xl font-bold tracking-tight mb-3">
            No open roles right now — but we&apos;re always listening.
          </h2>
          <p className="text-sm text-white/60 mb-8 max-w-md mx-auto">
            If you&apos;re an engineer, designer, or domain expert in real estate
            finance and think you can contribute, reach out directly.
          </p>
          <a
            href="mailto:careers@paperworking.co"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-[#0d0d0d] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors"
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
