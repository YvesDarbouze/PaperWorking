import { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Subprocessors Registry — PaperWorking',
  description: 'Registry of third-party subprocessors used by PaperWorking to process customer data.',
};

const SUBPROCESSORS = [
  {
    name: 'Google Cloud Platform',
    purpose: 'Cloud hosting, database services (Firestore, PostgreSQL), file storage, and Document AI OCR processing.',
    location: 'United States (us-central1)',
    securityUrl: 'https://cloud.google.com/security',
  },
  {
    name: 'Stripe, Inc.',
    purpose: 'Payment routing, card validation, customer portals, and billing ledger storage.',
    location: 'United States',
    securityUrl: 'https://stripe.com/security',
  },
  {
    name: 'Resend, Inc.',
    purpose: 'Transactional email infrastructure, metric alerts delivery, and onboarding messages.',
    location: 'United States',
    securityUrl: 'https://resend.com/security',
  },
  {
    name: 'PostHog, Inc.',
    purpose: 'Feature flagging, rollout overrides, client side preferences, and diagnostic metrics.',
    location: 'United States',
    securityUrl: 'https://posthog.com/security',
  },
  {
    name: 'Sentry (Functional Software, Inc.)',
    purpose: 'Application error capture, client-side diagnostics, and api route latency tracking.',
    location: 'United States',
    securityUrl: 'https://sentry.io/security',
  },
  {
    name: 'Better Stack, Inc. (BetterUptime)',
    purpose: 'Uptime monitoring, incident logs, status page feeds, and on-call paging.',
    location: 'United States / Europe',
    securityUrl: 'https://betterstack.com/security',
  },
  {
    name: 'Intercom, Inc. / Crisp IM SAS',
    purpose: 'Customer support chat widget, messaging system, and helpdesk integration.',
    location: 'United States / Europe',
    securityUrl: 'https://www.intercom.com/security',
  },
];

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-4xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* Hero Section */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Data Privacy
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Third-Party Subprocessors
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-12 leading-relaxed">
          To provide our services, we collaborate with third-party service providers who may access or process certain customer data. All subprocessors undergo review to ensure security and privacy compliance.
        </p>

        {/* Table of Subprocessors */}
        <div className="overflow-x-auto rounded-2xl border border-white/10" style={{ background: 'rgba(22,19,24,0.4)', backdropFilter: 'blur(16px)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 font-label-sm text-label-sm text-on-surface uppercase tracking-wider">
                <th className="py-4 px-6">Entity Name</th>
                <th className="py-4 px-6">Corporate Purpose</th>
                <th className="py-4 px-6">Data Location</th>
                <th className="py-4 px-6">Security Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-body-sm text-body-sm text-on-surface-variant">
              {SUBPROCESSORS.map((sp) => (
                <tr key={sp.name} className="hover:bg-white/2 transition-colors">
                  <td className="py-5 px-6 font-label-sm text-on-surface font-semibold">{sp.name}</td>
                  <td className="py-5 px-6 leading-relaxed max-w-xs">{sp.purpose}</td>
                  <td className="py-5 px-6">{sp.location}</td>
                  <td className="py-5 px-6">
                    <a
                      href={sp.securityUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline transition-colors font-medium"
                    >
                      View Policy →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
