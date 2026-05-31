import { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Trust & Security — PaperWorking',
  description: 'Learn about PaperWorking\'s enterprise-grade security, data residency, encryption standards, and compliance status.',
};

const PRACTICE_SECTIONS = [
  {
    title: 'Encryption Standards',
    details: [
      { label: 'In Transit', value: 'TLS 1.3 encryption for all data moving between your browser and our servers, with strict HSTS enforcement.' },
      { label: 'At Rest', value: 'All database fields, uploaded document PDFs, and system backups are encrypted using AES-256.' },
    ],
  },
  {
    title: 'Data Infrastructure',
    details: [
      { label: 'Data Residency', value: 'Primary database hosts and file storage systems are strictly located in the GCP us-central1 (Iowa, USA) region.' },
      { label: 'Backup Cadence', value: 'Automated daily snapshots are taken of all systems, with a 30-day immutable retention window for disaster recovery.' },
    ],
  },
  {
    title: 'Compliance & Audits',
    details: [
      { label: 'SOC 2 Status', value: 'SOC 2 Type I audit is currently in progress, with audit readiness expected in Q3 2026.' },
      { label: 'GDPR / CCPA Rights', value: 'We support full data portability (ZIP exports) and account deletion requests with a 24-hour verification window.' },
    ],
  },
  {
    title: 'Incident Response Policy',
    details: [
      { label: 'Notification Guarantee', value: 'In the event of a verified data breach, affected users and compliance teams will be notified within 24 hours of confirmation.' },
      { label: 'Disaster Recovery', value: 'Active-passive failover and automated monitoring verify service availability and point-in-time recovery health daily.' },
    ],
  },
];

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-4xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* Hero Section */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Security & Compliance
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Trust & Security
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-16 leading-relaxed">
          At PaperWorking, security is not a checkbox. We implement robust, defense-in-depth engineering practices to protect your real estate transactions, asset valuations, and financials.
        </p>

        {/* Practice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {PRACTICE_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl p-8 sm:p-10"
              style={{
                background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <h2 className="font-label-md text-label-md text-on-surface mb-6 border-b border-white/10 pb-2">
                {section.title}
              </h2>
              <div className="space-y-6">
                {section.details.map((detail) => (
                  <div key={detail.label}>
                    <h3 className="font-label-sm text-label-sm text-primary mb-1">
                      {detail.label}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Subprocessors Callout */}
        <div
          className="rounded-2xl p-8 sm:p-10 border border-white/10 text-center max-w-2xl mx-auto"
          style={{
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <h2 className="font-label-md text-label-md text-on-surface mb-3">
            Third-Party Subprocessors
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 leading-relaxed">
            We partner with best-in-class infrastructure and service providers. For a full list of subprocessors and links to their security practices, visit our subprocessors registry.
          </p>
          <Link
            href="/subprocessors"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-6 font-label-sm text-label-sm text-black hover:bg-white/90 transition-colors"
          >
            View Subprocessors
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
