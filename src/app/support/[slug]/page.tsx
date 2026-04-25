import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { SUPPORT_ARTICLES, SUPPORT_CATEGORIES } from '@/lib/cms/supportData';
import { Metadata } from 'next';
import { FeedbackWidget } from '@/components/support/FeedbackWidget';

interface SupportArticlePageProps {
  params: {
    slug: string;
  };
}

// Optionally, generate static params for all articles
export async function generateStaticParams() {
  return SUPPORT_ARTICLES.map((article) => ({
    slug: article.id,
  }));
}

export async function generateMetadata({ params }: SupportArticlePageProps): Promise<Metadata> {
  const article = SUPPORT_ARTICLES.find((a) => a.id === params.slug);
  if (!article) {
    return { title: 'Article Not Found' };
  }
  return {
    title: `${article.title} | PaperWorking Support`,
    description: article.excerpt,
  };
}

export default function SupportArticlePage({ params }: SupportArticlePageProps) {
  const article = SUPPORT_ARTICLES.find((a) => a.id === params.slug);

  if (!article) {
    notFound();
  }

  const category = SUPPORT_CATEGORIES.find((c) => c.id === article.categoryId);

  return (
    <article className="pt-16 pb-24 sm:pt-24 sm:pb-32">
      <div className="mx-auto max-w-3xl px-6">
        {/* Back Link */}
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] hover:text-[var(--pw-black)] transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Support Hub
        </Link>

        {/* Article Header */}
        <header className="mb-12">
          {category && (
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[var(--pw-bg)] flex items-center justify-center shrink-0">
                <category.icon className="w-4 h-4 text-[var(--pw-black)]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--pw-subtle)]">
                {category.title}
              </span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tighter text-[var(--pw-black)] mb-6 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-[var(--pw-muted)]">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {article.readTime} read
            </span>
          </div>
        </header>

        {/* Article Content */}
        <div 
          className="prose prose-lg prose-neutral max-w-none text-[var(--pw-subtle)] 
                     prose-headings:text-[var(--pw-black)] prose-headings:font-medium prose-headings:tracking-tight
                     prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:text-emerald-700
                     prose-strong:text-[var(--pw-black)] prose-strong:font-semibold
                     prose-li:marker:text-[var(--pw-muted)]"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Feedback Widget */}
        <FeedbackWidget />
        
        {/* Article Footer */}
        <footer className="mt-20 pt-10 border-t border-[var(--pw-border)] flex items-center justify-between">
          <p className="text-sm text-[var(--pw-muted)]">
            Still need help? <Link href="/support#contact" className="text-[var(--pw-black)] font-medium hover:underline">Contact our support team.</Link>
          </p>
        </footer>
      </div>
    </article>
  );
}
