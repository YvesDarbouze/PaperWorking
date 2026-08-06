import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { SUPPORT_ARTICLES, SUPPORT_CATEGORIES } from '@/lib/cms/supportData';
import { Metadata } from 'next';

interface SupportCategoryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return SUPPORT_CATEGORIES.map((cat) => ({
    id: cat.id,
  }));
}

export async function generateMetadata({ params }: SupportCategoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const category = SUPPORT_CATEGORIES.find((c) => c.id === id);
  if (!category) {
    return { title: 'Category Not Found' };
  }
  return {
    title: `${category.title} | PaperWorking Support`,
    description: category.description,
  };
}

export default async function SupportCategoryPage({ params }: SupportCategoryPageProps) {
  const { id } = await params;
  const category = SUPPORT_CATEGORIES.find((c) => c.id === id);

  if (!category) {
    notFound();
  }

  const articles = SUPPORT_ARTICLES.filter((a) => a.categoryId === id);

  return (
    <div className="pt-16 pb-24 sm:pt-24 sm:pb-32 max-w-4xl mx-auto px-6">
      {/* Back Link */}
      <Link
        href="/support"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors mb-10 text-decoration-none"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Support Hub
      </Link>

      {/* Category Header */}
      <header className="mb-12 border-b border-white/10 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-primary">
              {category.icon}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
            {category.title}
          </h1>
        </div>
        <p className="text-base text-on-surface-variant leading-relaxed">
          {category.description}
        </p>
      </header>

      {/* Articles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/support/${article.id}`}
            className="p-6 rounded-2xl glass-panel border border-white/8 hover:border-primary/30 transition-all duration-200 group text-decoration-none block"
          >
            <h2 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors mb-2 leading-snug">
              {article.title}
            </h2>
            <p className="text-xs text-on-surface-variant/70 leading-relaxed mb-4">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary/70">
              <Clock className="w-3.5 h-3.5" />
              {article.readTime}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
