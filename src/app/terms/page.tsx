import { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /terms — Terms of Service
   
   Obsidian glass theme. LandingHeader + LandingFooter.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Terms of Service — PaperWorking',
  description:
    'Terms of Service governing your use of the PaperWorking platform.',
};

const SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By accessing or using PaperWorking, you agree to be bound by these Terms of Service and all applicable laws and regulations.',
  },
  {
    heading: '2. Use of Service',
    body: 'PaperWorking is a real estate investment operations platform. You agree to use the service only for lawful purposes and in accordance with these terms.',
  },
  {
    heading: '3. Confidentiality',
    body: 'Deal data, financial projections, and pipeline information entered into PaperWorking are confidential to your organization. You are responsible for maintaining the security of your credentials.',
  },
  {
    heading: '4. Limitation of Liability',
    body: 'PaperWorking is provided "as is." We make no warranties regarding accuracy of financial calculations or market data. Always verify critical numbers with a licensed professional.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Hero ── */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Terms of Service
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-16">
          Last updated April 2026
        </p>

        {/* ── Content sections ── */}
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section
              key={s.heading}
              className="rounded-2xl p-8 sm:p-10"
              style={{
                background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <h2 className="font-label-md text-label-md text-on-surface mb-4">
                {s.heading}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {s.body}
              </p>
            </section>
          ))}

          {/* Contact section */}
          <section
            className="rounded-2xl p-8 sm:p-10"
            style={{
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              5. Contact
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              For questions about these terms, contact{' '}
              <a
                href="mailto:legal@paperworking.co"
                className="text-primary hover:underline decoration-primary/50 transition-colors"
              >
                legal@paperworking.co
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
