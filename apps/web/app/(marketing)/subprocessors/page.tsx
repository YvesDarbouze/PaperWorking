import type { Metadata } from 'next';
import {
  SUBPROCESSORS,
  SUBPROCESSORS_LAST_UPDATED,
  type Subprocessor,
} from '@/lib/marketing/subprocessors-data';

export const metadata: Metadata = {
  title: 'Subprocessors Registry — PaperWorking',
  description:
    'Registry of third-party subprocessors used by PaperWorking to process customer data, in compliance with GDPR Article 28.',
};

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
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function SubprocessorsPage() {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: SUBPROCESSORS.filter((sp) => sp.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-5 py-16 md:px-10">
      <p className="pw-section-eyebrow mb-3">Data Privacy</p>
      <h1 className="mb-3 text-4xl font-semibold tracking-[-0.02em]">Third-Party Subprocessors</h1>
      <p
        className="mb-4 max-w-2xl text-sm leading-relaxed"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        To deliver our services, PaperWorking engages third-party service providers
        (&ldquo;subprocessors&rdquo;) that may access or process customer data on our behalf. Each
        subprocessor has been reviewed for security and privacy compliance in accordance with GDPR
        Article&nbsp;28.
      </p>
      <p className="mb-10 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
        Last updated: {formatDate(SUBPROCESSORS_LAST_UPDATED)} · {SUBPROCESSORS.length} subprocessors
      </p>

      {grouped.map((group) => (
        <section key={group.category} className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">{group.label}</h2>
          <div className="pw-card overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Entity Name</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                  <th className="px-4 py-3 font-semibold">Data Region</th>
                  <th className="px-4 py-3 font-semibold">Privacy Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {group.items.map((sp) => (
                  <tr key={sp.name}>
                    <td className="px-4 py-4 align-top font-medium">{sp.name}</td>
                    <td
                      className="max-w-sm px-4 py-4 align-top leading-relaxed"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                    >
                      {sp.purpose}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-4 align-top"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                    >
                      {sp.location}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <a
                        href={sp.privacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:underline"
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

      <p className="border-t border-white/10 pt-8 text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
        This list is maintained in version control and updated whenever a vendor is added or removed.
        Questions? Contact{' '}
        <a href="mailto:privacy@paperworking.co" className="underline-offset-2 hover:underline">
          privacy@paperworking.co
        </a>
        .
      </p>
    </div>
  );
}
