import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_LAST_UPDATED, TERMS_SECTIONS } from '@/lib/marketing/legal-data';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'PaperWorking Terms of Service.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-10">
      <p className="pw-section-eyebrow mb-3">Legal</p>
      <h1 className="mb-2 text-4xl font-semibold tracking-[-0.02em]">Terms of Service</h1>
      <p className="mb-10 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
        Last updated {LEGAL_LAST_UPDATED}
      </p>
      <div className="space-y-8">
        {TERMS_SECTIONS.map((section) => (
          <section key={section.heading} className="pw-card p-6">
            <h2 className="mb-3 text-lg font-semibold">{section.heading}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              {section.body}
            </p>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
        See also our <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
