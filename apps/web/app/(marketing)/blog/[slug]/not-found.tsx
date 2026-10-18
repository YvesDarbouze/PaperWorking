import Link from 'next/link';

export default function BlogArticleNotFound() {
  return (
    <section
      data-testid="blog-article-not-found"
      className="mx-auto flex min-h-[60vh] max-w-[1200px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6 md:px-8"
    >
      <div className="w-full max-w-md rounded-none border border-border bg-card p-8 text-center shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          PaperWorking Journal
        </p>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Article not found
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The article you requested could not be found or may have been archived.
        </p>
        <div className="pt-2">
          <Link
            href="/blog"
            data-testid="blog-not-found-back-link"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-none bg-foreground px-4 py-2.5 text-sm font-semibold text-background no-underline transition-opacity hover:opacity-90"
          >
            Back to all articles
          </Link>
        </div>
      </div>
    </section>
  );
}
