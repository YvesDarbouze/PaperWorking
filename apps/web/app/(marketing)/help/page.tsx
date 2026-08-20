import type { Metadata } from 'next';
import Link from 'next/link';
import { HELP_ARTICLES } from '@/lib/marketing/help-data';

export const metadata: Metadata = {
  title: 'Knowledge Base',
  description: 'PaperWorking help articles for investors, vendors, and admins.',
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10">
      <section className="mb-12">
        <p className="pw-section-eyebrow mb-3">Knowledge base</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
          Help articles
        </h1>
        <p
          className="max-w-[52ch] text-base leading-relaxed"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Migration preview of the help center. Full search and CMS wiring lands post-cutover.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {HELP_ARTICLES.map((article) => (
          <Link
            key={article.slug}
            href={`/help/${article.slug}`}
            className="pw-card block p-5 no-underline transition hover:opacity-90"
          >
            <p className="pw-section-eyebrow mb-2">{article.category}</p>
            <h2 className="mb-2 text-lg font-semibold" style={{ color: 'var(--color-on-surface)' }}>
              {article.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              {article.summary}
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
        Need more? Visit the <Link href="/support" className="underline-offset-2 hover:underline">Support Center</Link>.
      </p>
    </div>
  );
}
