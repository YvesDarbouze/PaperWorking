import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Shield, Target, Zap, Users } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /about — Company page
   
   Obsidian glass theme. Unified LandingHeader navigation.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'About PaperWorking | Built for Serious Real Estate Investors',
  description:
    'PaperWorking replaces spreadsheets, scattered docs, and guesswork with one deal-intelligence platform built for real estate investors who refuse to leave money on the table.',
};

const VALUES = [
  {
    icon: Target,
    title: 'Deal Clarity',
    body: 'Every dollar in, every dollar out — tracked from acquisition through exit. No more spreadsheet archaeology.',
  },
  {
    icon: Shield,
    title: 'Risk Visibility',
    body: 'Holding costs, burn rates, and CapEx variance update in real time so you catch problems before they become losses.',
  },
  {
    icon: Zap,
    title: 'Speed to Close',
    body: 'LOIs, contingency deadlines, and closing docs live in one workspace. Your team moves faster because the data is already there.',
  },
  {
    icon: Users,
    title: 'Team Alignment',
    body: 'Investors, contractors, and attorneys see exactly what they need — nothing more, nothing less. Role-based access keeps deals clean.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-5xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Hero ── */}
        <section className="mb-28">
          <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-6">
            About PaperWorking
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-8">
            The paperwork was <br className="hidden sm:block" />
            always the problem.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-2xl">
            Real estate investors don&apos;t lose deals because they lack ambition.
            They lose deals because critical information lives in fourteen different
            places — spreadsheets, email threads, shared drives, and the back of a
            napkin. PaperWorking was built to fix that.
          </p>
        </section>

        {/* ── Mission ── */}
        <section className="mb-28">
          <div
            className="rounded-2xl p-10 sm:p-14"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
              Our Mission
            </p>
            <p className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-snug">
              Give every investor — from first flip to a 50-door portfolio —
              the same deal-intelligence infrastructure that used to require a
              back-office team and six-figure software budgets.
            </p>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="mb-28">
          <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-10">
            What We Stand For
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  borderLeft: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <v.icon
                  className="w-6 h-6 mb-5 text-primary"
                  aria-hidden="true"
                />
                <h3 className="font-label-md text-label-md text-on-surface mb-2">
                  {v.title}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="text-center">
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-4">
            Ready to stop losing money to bad data?
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-8 max-w-md mx-auto">
            Join thousands of investors who track every dollar from acquisition
            through exit — in one workspace.
          </p>
          <Link
            href="/#pricing"
            className="luminous-button inline-flex items-center gap-2 px-8 py-3 rounded-lg font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
