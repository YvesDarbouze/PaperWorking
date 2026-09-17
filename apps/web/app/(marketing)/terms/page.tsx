import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_DRAFT_NOTICE, LEGAL_LAST_UPDATED, TERMS_SECTIONS } from '@/lib/marketing/legal-data';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'PaperWorking Terms of Service.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-10">
      <div
        data-testid="legal-draft-notice"
        className="mb-8 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-200"
      >
        <span className="material-symbols-outlined text-amber-400 text-sm">gavel</span>
        <span>
          <strong>{LEGAL_DRAFT_NOTICE}:</strong> This document represents current platform operational
          terms and real data flows, subject to final legal counsel certification.
        </span>
      </div>

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
            {section.subsections && section.subsections.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                {section.subsections.map((sub) => (
                  <div key={sub.title} className="rounded-lg bg-white/[0.02] p-3 text-xs">
                    <h3 className="font-semibold text-white/90">{sub.title}</h3>
                    <p className="mt-1 text-white/70">{sub.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
        See also our <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
