import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, BookOpen, Compass, ChevronRight } from 'lucide-react';
import { getHelpArticles, getHelpArticleBySlug } from '@/lib/help/loader';
import type { Metadata } from 'next';

interface HelpArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = getHelpArticles();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: HelpArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticleBySlug(slug);
  if (!article) {
    return { title: 'Article Not Found | PaperWorking' };
  }
  return {
    title: `${article.title} | PaperWorking Help`,
    description: article.excerpt,
  };
}

export default async function HelpArticlePage({ params }: HelpArticlePageProps) {
  const { slug } = await params;
  const article = getHelpArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const allArticles = getHelpArticles();
  const relatedArticles = allArticles.filter((a) => a.category === article.category && a.slug !== article.slug);

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-6">
      {/* Back to Help Center Link */}
      <Link
        href="/help"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] hover:text-[var(--pw-black)] transition-colors mb-10 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Help Center
      </Link>

      <div className="grid lg:grid-cols-4 gap-12">
        {/* Main Content (3 columns) */}
        <div className="lg:col-span-3">
          <article>
            <header className="mb-10 pb-8 border-b border-[var(--pw-border)]">
              <span className="uppercase tracking-widest text-[10px] font-black text-emerald-400 mb-3 block">
                {article.category === 'screens' ? 'Screen Guide' : 'Metric Explainer'}
              </span>
              <h1 className="text-3xl md:text-5xl font-light tracking-tighter text-[var(--pw-black)] mb-4">
                {article.title}
              </h1>
              <p className="text-sm text-[var(--pw-muted)] leading-relaxed italic">
                {article.excerpt}
              </p>
            </header>

            {/* Compiled Markdown Body */}
            <div
              className="prose prose-neutral max-w-none text-[var(--pw-black)]
                         prose-headings:font-light prose-headings:tracking-tight prose-headings:text-[var(--pw-black)]
                         prose-p:my-4 prose-p:leading-relaxed prose-p:text-sm prose-p:text-[var(--pw-muted)]
                         prose-strong:font-bold prose-strong:text-[var(--pw-black)]
                         prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-xs prose-code:text-teal-300"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </article>
        </div>

        {/* Sidebar (1 column) */}
        <div className="lg:col-span-1 space-y-8">
          <div className="p-6 rounded-2xl border border-[var(--pw-border)] bg-white/5 backdrop-blur-xl">
            <h3 className="text-xs uppercase tracking-widest font-black text-[var(--pw-black)] mb-4 pb-2 border-b border-[var(--pw-border)] flex items-center gap-1.5">
              {article.category === 'screens' ? (
                <>
                  <Compass className="w-4 h-4 text-emerald-400" /> Related Screens
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 text-emerald-400" /> Related Metrics
                </>
              )}
            </h3>
            {relatedArticles.length === 0 ? (
              <p className="text-xs text-[var(--pw-muted)]">No other articles in this section.</p>
            ) : (
              <ul className="space-y-3">
                {relatedArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/help/${a.slug}`}
                      className="text-xs text-[var(--pw-muted)] hover:text-emerald-400 font-medium transition-colors flex items-center gap-1 group"
                    >
                      <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-[var(--pw-border)] bg-white/5 backdrop-blur-xl text-center">
            <h4 className="text-xs font-bold text-[var(--pw-black)] mb-2">Need more assistance?</h4>
            <p className="text-[11px] text-[var(--pw-muted)] mb-4 leading-relaxed">
              Our support team is available mon-fri to answer technical questions and deal setup inquiries.
            </p>
            <Link
              href="/help"
              className="inline-block w-full py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-medium text-xs rounded-lg transition-all"
            >
              Open Support Widget
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
