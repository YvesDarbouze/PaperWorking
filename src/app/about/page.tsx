import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Shield, Target, Zap, Users } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /about — Company page
   
   Communicates why PaperWorking exists and who it serves.
   Follows Antigravity grayscale design system.
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
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <MarketingNavbar />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        {/* ── Hero ── */}
        <section className="mb-28">
          <p
            className="text-[10px] font-black uppercase tracking-[0.35em] mb-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            About PaperWorking
          </p>
          <h1
            className="text-5xl sm:text-6xl font-black tracking-tighter leading-none mb-8"
            style={{ color: 'var(--text-primary)' }}
          >
            The paperwork was <br className="hidden sm:block" />
            always the problem.
          </h1>
          <p
            className="text-lg leading-relaxed max-w-2xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            Real estate investors don&apos;t lose deals because they lack ambition.
            They lose deals because critical information lives in fourteen different
            places — spreadsheets, email threads, shared drives, and the back of a
            napkin. PaperWorking was built to fix that.
          </p>
        </section>

        {/* ── Mission ── */}
        <section className="mb-28">
          <div
            className="rounded-xl p-10 sm:p-14"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-ui)',
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-[0.35em] mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Our Mission
            </p>
            <p
              className="text-2xl sm:text-3xl font-medium tracking-tight leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              Give every investor — from first flip to a 50-door portfolio —
              the same deal-intelligence infrastructure that used to require a
              back-office team and six-figure software budgets.
            </p>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="mb-28">
          <p
            className="text-[10px] font-black uppercase tracking-[0.35em] mb-10"
            style={{ color: 'var(--text-secondary)' }}
          >
            What We Stand For
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-xl p-8"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-ui)',
                }}
              >
                <v.icon
                  className="w-6 h-6 mb-5"
                  style={{ color: 'var(--text-primary)' }}
                  aria-hidden="true"
                />
                <h3
                  className="text-sm font-bold tracking-tight mb-2"
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
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="text-center">
          <h2
            className="text-3xl font-bold tracking-tight mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Ready to stop losing money to bad data?
          </h2>
          <p
            className="text-sm mb-8 max-w-md mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Join thousands of investors who track every dollar from acquisition
            through exit — in one workspace.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-colors"
            style={{ background: '#0d0d0d', color: '#FFFFFF' }}
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
