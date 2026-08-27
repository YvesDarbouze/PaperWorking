import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Changelog | PaperWorking',
  description: 'Product updates and release notes for PaperWorking.',
};

const ENTRIES = [
  {
    date: '2026-08-27',
    title: 'Dashboard shell + API wiring',
    body: 'Inbox, settings, billing, and auth extras connected through seed-backed Next adapters.',
  },
  {
    date: '2026-08',
    title: 'Marketing & deals marketplace refresh',
    body: 'Landing, pricing, and deal broadcast surfaces aligned with the current investor UI.',
  },
] as const;

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10">
      <section className="mb-12 text-center">
        <p className="pw-section-eyebrow mb-3">Product</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">Changelog</h1>
        <p
          className="mx-auto max-w-[52ch] text-base leading-relaxed"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Recent product updates — lightweight release notes while the full CMS lands.
        </p>
      </section>

      <ul className="mx-auto max-w-3xl space-y-4">
        {ENTRIES.map((entry) => (
          <li key={entry.date + entry.title} className="pw-card p-5">
            <p className="pw-section-eyebrow mb-2">{entry.date}</p>
            <h2 className="mb-2 text-lg font-semibold">{entry.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              {entry.body}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
        Questions?{' '}
        <Link href="/support" className="underline-offset-2 hover:underline">
          Visit Support
        </Link>
        .
      </p>
    </div>
  );
}
