import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, getBlogPost } from '@/lib/marketing/blog-data';

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Article not found' };
  return { title: `${post.title} | PaperWorking Blog`, description: post.summary };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <div
      data-testid="blog-article-page"
      className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20"
    >
      <Link
        href="/blog"
        data-testid="blog-back-to-all-link"
        className="mb-6 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition no-underline"
      >
        ← All blog articles
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          REIL Phase: {post.category}
        </span>
        <span className="text-xs text-muted-foreground">
          {post.publishedAt} · {post.readingTime}
        </span>
      </div>

      <h1 className="landing-display mb-4 text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl md:text-4xl">
        {post.title}
      </h1>

      <p className="mb-8 text-base leading-relaxed text-muted-foreground">
        {post.summary}
      </p>

      <div className="space-y-6">
        {post.sections.map((section) => (
          <section
            key={section.heading}
            className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {section.heading}
            </h2>
            <p className="text-base md:text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Link
          href="/blog"
          className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground no-underline hover:bg-muted transition"
        >
          Back to Blog
        </Link>
        {post.relatedLinks.map((rel) => (
          <Link
            key={rel.href}
            href={rel.href}
            className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground no-underline hover:bg-muted transition"
          >
            {rel.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
