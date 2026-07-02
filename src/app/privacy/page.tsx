import { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy — PaperWorking',
  description: 'How PaperWorking handles, stores, and protects your data. We never sell your deal information.',
};

const SECTIONS = [
  {
    heading: '1. Information We Collect',
    body: 'We collect account details (name, email), project details (financial parameters, transaction properties, ledger transactions), uploaded documents (PDFs, images), and connection metadata (client IP address, accepted legal versions). We do not collect or log payment cards or SSNs directly; these are routed directly to PCI-compliant subprocessors.',
  },
  {
    heading: '2. How We Use Your Data',
    body: 'Your data is used solely to provide PaperWorking\'s features: metrics dashboard calculations, OCR automation pipelines, vendor communications, and team collaterals. We never sell your data or share it for marketing.',
  },
  {
    heading: '3. Data Storage & Transfers',
    body: 'All database fields and files are securely stored on Google Cloud Platform in the us-central1 region, using TLS 1.3 in transit and AES-256 at rest.',
  },
  {
    heading: '4. GDPR & CCPA Rights',
    body: 'Under GDPR and CCPA, you have the right to access, rectify, or port your data. We provide self-service utilities inside the dashboard settings to download all platform data in a structured ZIP pack, or to request a full account deletion.',
  },
  {
    heading: '5. Account Deletion Policy',
    body: 'Upon requesting account deletion, a 24-hour verification window is initiated. During this grace period, you can cancel the request. After 24 hours, all database documents, organization invites, and uploaded PDFs are permanently deleted from our live environments. Activity logs are moved to cold archive stores and kept for a maximum of 7 years as required for auditing.',
  },
  {
    heading: '6. Cookie Preferences',
    body: 'We use secure cookies for user sessions. Essential cookies are required to remain signed in. Optional analytics and performance cookies are disabled by default and can be configured through our consent banner.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* Hero */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Privacy Policy
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-16">
          Last updated May 2026
        </p>

        {/* Content sections */}
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section
              key={s.heading}
              className="rounded-2xl p-8 sm:p-10"
              style={{
                background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
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
              background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 className="font-label-md text-label-md text-on-surface mb-4">
              7. Contact
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              For privacy-related questions, contact{' '}
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
