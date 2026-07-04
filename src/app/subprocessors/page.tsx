import { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import {
  SUBPROCESSORS,
  SUBPROCESSORS_LAST_UPDATED,
  type Subprocessor,
} from '@/lib/compliance/subprocessors';

export const metadata: Metadata = {
  title: 'Subprocessors Registry — PaperWorking',
  description:
    'Registry of third-party subprocessors used by PaperWorking to process customer data, in compliance with GDPR Article 28.',
};

/* ═══════════════════════════════════════════════════════
   Category display helpers
   ═══════════════════════════════════════════════════════ */
const CATEGORY_LABELS: Record<Subprocessor['category'], string> = {
  infrastructure: 'Infrastructure & Platform',
  payments: 'Payments & Billing',
  communications: 'Communications & Signatures',
  'data-providers': 'Property Data Providers',
  observability: 'Observability & Monitoring',
};

const CATEGORY_ORDER: Subprocessor['category'][] = [
  'infrastructure',
  'payments',
  'communications',
  'data-providers',
  'observability',
];

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function SubprocessorsPage() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: SUBPROCESSORS.filter((sp) => sp.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-5xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Hero ── */}
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">
          Data Privacy
        </p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-3">
          Third-Party Subprocessors
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-4 leading-relaxed">
          To deliver our services, PaperWorking engages third-party service
          providers (&ldquo;subprocessors&rdquo;) that may access or process
          customer data on our behalf. Each subprocessor has been reviewed
          for security and privacy compliance in accordance with GDPR
          Article&nbsp;28.
        </p>
        <p className="font-label-sm text-label-sm text-on-surface-variant/60 mb-12">
          Last updated: {formatDate(SUBPROCESSORS_LAST_UPDATED)} &middot;{' '}
          {SUBPROCESSORS.length} subprocessors
        </p>

        {/* ── Grouped Tables ── */}
        {grouped.map((group) => (
          <section key={group.category} className="mb-12">
            <h2 className="font-title-md text-title-md text-on-surface mb-4">
              {group.label}
            </h2>
            <div
              className="overflow-x-auto rounded-2xl border border-white/10"
              style={{
                background: 'rgba(22,19,24,0.4)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 font-label-sm text-label-sm text-on-surface uppercase tracking-wider">
                    <th className="py-4 px-6">Entity Name</th>
                    <th className="py-4 px-6">Purpose</th>
                    <th className="py-4 px-6">Data Region</th>
                    <th className="py-4 px-6">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-body-sm text-body-sm text-on-surface-variant">
                  {group.items.map((sp) => (
                    <tr
                      key={sp.name}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-5 px-6 font-label-sm text-on-surface font-semibold whitespace-nowrap">
                        {sp.name}
                      </td>
                      <td className="py-5 px-6 leading-relaxed max-w-sm">
                        {sp.purpose}
                      </td>
                      <td className="py-5 px-6 whitespace-nowrap">
                        {sp.location}
                      </td>
                      <td className="py-5 px-6">
                        <a
                          href={sp.privacyUrl}
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
          </section>
        ))}

        {/* ── Footer note ── */}
        <div className="border-t border-white/10 pt-8 mt-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant/60 leading-relaxed max-w-2xl">
            This list is maintained at{' '}
            <code className="text-on-surface-variant/80 bg-white/5 px-1.5 py-0.5 rounded text-xs">
              src/lib/compliance/subprocessors.ts
            </code>{' '}
            and updated whenever a vendor is added or removed. Changes are
            tracked in version control for audit purposes. If you have
            questions about our subprocessors, contact us at{' '}
            <a
              href="mailto:privacy@paperworking.co"
              className="text-primary hover:underline"
            >
              privacy@paperworking.co
            </a>
            .
          </p>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
