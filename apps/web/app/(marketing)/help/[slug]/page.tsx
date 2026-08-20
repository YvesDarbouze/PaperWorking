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
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-10">
      <Link href="/help" className="mb-6 inline-block text-sm underline-offset-2 hover:underline">
        ← All articles
      </Link>
      <p className="pw-section-eyebrow mb-2">{article.category}</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-[-0.02em]">{article.title}</h1>
      <article className="pw-card p-6 text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
        {article.body}
      </article>
    </div>
  );
}
