import { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy (AUP) — PaperWorking',
  description: 'Guidelines governing correct and authorized usage of the PaperWorking platform.',
};

const RULES = [
  {
    category: 'System Integrity & Security',
    items: [
      'No automated probing, scanning, or security penetration testing of PaperWorking routes or GCP/Firebase backend without explicit written authorization.',
      'No reverse engineering, decompiling, or attempting to extract the underlying formulas, algorithms, or schemas of the real estate analysis engine.',
      'No injection of malicious code, worms, Trojan horses, or logic bombs designed to compromise database stability or user sessions.',
    ],
  },
  {
    category: 'Fair Usage & API Limits',
    items: [
      'No scripting, web scraping, or crawling of property listings, vendor requests, or user profiles that bypass default API client interfaces.',
      'Do not attempt to exceed rate limits, trigger API lockouts, or deliberately exhaust Bridge OData quotas.',
      'Sharing accounts or credentials between multiple individuals is strictly prohibited. Each user must have their own registered seat.',
    ],
  },
  {
    category: 'Document Uploads & Content Standards',
    items: [
      'All uploaded files must be legitimate transaction documents, purchase agreements, appraisals, leases, or expense receipts directly relating to a project.',
      'Do not upload any files containing illicit material, copyrighted data without a license, or intentionally corrupted byte streams.',
    ],
  },
];

export default function AupPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* Hero */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Legal
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Acceptable Use Policy
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-16">
          Last updated May 2026
        </p>

        {/* Content sections */}
        <div className="space-y-10">
          {RULES.map((section) => (
            <section
              key={section.category}
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
                {section.category}
              </h2>
              <ul className="space-y-4 list-disc pl-5 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {section.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
