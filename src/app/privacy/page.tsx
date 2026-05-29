import { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /privacy — Privacy Policy
   
   Obsidian glass theme. LandingHeader + LandingFooter.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Privacy Policy — PaperWorking',
  description:
    'How PaperWorking handles, stores, and protects your data. We never sell your deal information.',
};

const SECTIONS = [
  {
    heading: '1. Information We Collect',
    body: 'We collect account information (name, email), deal and pipeline data you enter, and usage analytics to improve the platform.',
  },
  {
    heading: '2. How We Use Your Data',
    body: 'Your data is used solely to provide PaperWorking\'s features. We do not sell or share your deal data with third parties.',
  },
  {
    heading: '3. Data Storage',
    body: 'Data is stored securely using Firebase (Google Cloud) infrastructure with encryption at rest and in transit.',
  },
  {
    heading: '4. Your Rights',
    body: 'You may request deletion of your account and associated data at any time by contacting support.',
  },
  {
    heading: '5. Cookies',
    body: 'We use HttpOnly session cookies for authentication only. No third-party advertising cookies are set.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Hero ── */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Privacy Policy
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
              6. Contact
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              For privacy inquiries, contact{' '}
              <a
                href="mailto:privacy@paperworking.co"
                className="text-primary hover:underline decoration-primary/50 transition-colors"
              >
                privacy@paperworking.co
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
