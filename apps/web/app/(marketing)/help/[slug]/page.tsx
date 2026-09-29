import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHelpArticle, HELP_ARTICLES } from '@/lib/marketing/help-data';

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) return { title: 'Article not found' };
  return { title: article.title, description: article.summary };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20">
      <Link href="/help" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition no-underline">
        ← All articles
      </Link>
      <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {article.category}
      </p>
      <h1 className="landing-display mb-6 text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
        {article.title}
      </h1>
      <article className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10 text-sm leading-relaxed">
        {article.body}
      </article>
    </div>
  );
}
