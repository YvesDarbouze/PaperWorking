import type { Metadata } from 'next';
import Link from 'next/link';
import { ABOUT_PRINCIPLES } from '@/lib/marketing/legal-data';

export const metadata: Metadata = {
  title: 'About PaperWorking | Built for Serious Real Estate Investors',
  description:
    'PaperWorking is the real estate investment operating system. One place for every deal, dollar, and deadline — Acquisition, Fund, Hold, Exit.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-10">
      <p className="pw-section-eyebrow mb-3">About PaperWorking</p>
      <h1 className="mb-10 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
        Stock investors get dashboards. Real estate investors deserve the same.
      </h1>

      <section className="pw-card mb-8 p-6 md:p-8">
        <h2 className="pw-section-eyebrow mb-4">Why PaperWorking Exists</h2>
        <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
          <p>
            A stock investor can open an app and see, in seconds, what every position is worth and how
            it&apos;s performing. A real estate investor, carrying far larger positions, gets a spreadsheet
            from 2019 and a folder of PDFs.
          </p>
          <p>
            We built PaperWorking to close that gap — not with another calculator, not with office task
            software relabeled for investors, but with a system built on the way a real estate deal works:
            Acquisition, Fund, Hold, Exit.
          </p>
          <p>
            The idea is simple. You already do the work: the walkthroughs, the budgets, the contractor
            calls, the rent collection. That work produces data. PaperWorking captures it as you go and
            turns it into the 33 numbers investors, lenders, and appraisers use to judge a deal. The metrics
            are a byproduct of the work, not extra work.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold tracking-[-0.02em]">Mission</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
          Give serious real estate investors the visibility stock and commodity investors take for granted:
          one place where every deal, dollar, and deadline adds up to a clear picture of performance.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-[-0.02em]">Principles</h2>
        <ol className="space-y-4">
          {ABOUT_PRINCIPLES.map((principle, index) => (
            <li key={principle} className="pw-card flex gap-4 p-5">
              <span
                className="flex-shrink-0 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                {principle}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link href="/pricing" className="pw-pill-cta inline-flex">
          Start Free 14-Day Trial
        </Link>
        <Link
          href="/how-it-works"
          className="inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-medium transition-colors hover:border-white/30"
        >
          See how it works
        </Link>
      </div>
    </div>
  );
}
