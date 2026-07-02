import { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Data Processing Addendum (DPA) — PaperWorking',
  description: 'Data Processing Addendum setting forth the data privacy and security terms for customers.',
};

const SECTIONS = [
  {
    heading: '1. Purpose & Scope',
    body: 'This Data Processing Addendum ("DPA") governs the processing of personal data by PaperWorking on behalf of the customer. It applies to processing under GDPR, CCPA, and other applicable global privacy regulations.',
  },
  {
    heading: '2. Roles of the Parties',
    body: 'The Customer acts as the Data Controller (the entity determining the purpose of processing), and PaperWorking acts as the Data Processor (the entity processing data on behalf of the Controller).',
  },
  {
    heading: '3. Processing Specifications',
    body: 'PaperWorking will process personal data solely for providing real estate transaction tools, valuations, accounting records, and other services requested by the Controller. We will never sell personal data or use it for profiling.',
  },
  {
    heading: '4. Security Measures',
    body: 'Processor maintains technical and organizational measures to safeguard customer data, including TLS 1.3 transit encryption, AES-256 rest encryption, subprocessor vetting, vulnerability scanning, and daily off-site backups.',
  },
  {
    heading: '5. Data Transfers & Subprocessors',
    body: 'Personal data is stored and processed within GCP us-central1 (Iowa, USA). Controller authorizes Processor to engage subprocessors (e.g. Google Cloud, Stripe) as detailed in our Subprocessors Registry.',
  },
  {
    heading: '6. Audits & Assessments',
    body: 'Upon request, Processor will provide Controller with relevant compliance documentation (such as SOC 2 Type I status audits) to demonstrate compliance with this DPA.',
  },
];

export default function DpaPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* Hero */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Data Processing Addendum
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
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
