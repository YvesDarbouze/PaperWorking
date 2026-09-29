import type { Metadata } from 'next';
import Link from 'next/link';
import { HELP_ARTICLES } from '@/lib/marketing/help-data';

export const metadata: Metadata = {
  title: 'Knowledge Base',
  description: 'PaperWorking help articles for investors, vendors, and admins.',
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20">
      <section className="mb-12">
        <p className="mb-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Knowledge Base
        </p>
        <h1 className="landing-display mb-4 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl md:text-5xl">
          Help articles
        </h1>
        <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Migration preview of the help center. Full search and CMS wiring lands post-cutover.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {HELP_ARTICLES.map((article) => (
          <Link
            key={article.slug}
            href={`/help/${article.slug}`}
            className="block rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10 no-underline transition hover:border-foreground/25"
          >
            <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {article.category}
            </p>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              {article.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {article.summary}
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Need more? Visit the <Link href="/support" className="underline underline-offset-4 text-foreground hover:text-muted-foreground">Support Center</Link>.
      </p>
    </div>
  );
}
