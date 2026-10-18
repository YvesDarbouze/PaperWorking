import type { Metadata } from 'next';
import Link from 'next/link';
import BlogIndexClient from '@/components/marketing/BlogIndexClient';

export const metadata: Metadata = {
  title: 'Blog | PaperWorking',
  description:
    'Field notes, underwriting methodology, and operational guides across the Real Estate Investment Lifecycle (Acquisition, Fund, Hold, and Exit).',
};

export default function BlogPage() {
  return (
    <div
      data-testid="blog-index-page"
      className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20"
    >
      <section className="mb-10">
        <p className="mb-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          PaperWorking Blog
        </p>
        <h1 className="landing-display mb-4 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl md:text-5xl">
          Real Estate Investment Lifecycle Insights
        </h1>
        <p className="max-w-[60ch] text-base leading-relaxed text-muted-foreground">
          Practical guides on deal underwriting, contingency management, renovation budget variance, and disposition records across Acquisition, Fund, Hold, and Exit.
        </p>
      </section>

      <BlogIndexClient />

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
        <p className="text-sm text-muted-foreground">
          Looking for formula definitions or platform documentation?
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/support/metrics"
            data-testid="blog-playbook-link"
            className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground no-underline hover:bg-muted transition-colors"
          >
            The Playbook (33 Metrics)
          </Link>
          <Link
            href="/help"
            data-testid="blog-knowledge-base-link"
            className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground no-underline hover:bg-muted transition-colors"
          >
            Knowledge Base
          </Link>
        </div>
      </div>
    </div>
  );
}
