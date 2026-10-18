'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { MagnifyingGlass, X, ArrowRight } from '@/components/icons/PhosphorIcons';
import {
  BLOG_CATEGORIES,
  BLOG_POSTS,
  type BlogPhaseCategory,
} from '@/lib/marketing/blog-data';

export default function BlogIndexClient() {
  const [selectedCategory, setSelectedCategory] = useState<'All' | BlogPhaseCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    return BLOG_POSTS.filter((post) => {
      const matchesCategory =
        selectedCategory === 'All' || post.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!trimmed) return true;
      return (
        post.title.toLowerCase().includes(trimmed) ||
        post.summary.toLowerCase().includes(trimmed) ||
        post.category.toLowerCase().includes(trimmed)
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div
          role="group"
          aria-label="Filter articles by REIL phase"
          className="flex flex-wrap items-center gap-2"
        >
          {(['All', ...BLOG_CATEGORIES] as const).map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={active}
                data-testid={`blog-filter-${cat.toLowerCase()}`}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-none border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {cat === 'All' ? 'All Phases' : cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:max-w-xs">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            aria-label="Search blog articles"
            data-testid="blog-search-input"
            className="w-full min-h-[44px] rounded-none border border-border bg-card pl-10 pr-10 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear blog search"
              data-testid="blog-search-clear"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-none text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div
          data-testid="blog-empty-state"
          className="rounded-none border border-border bg-card p-8 text-center"
        >
          <p className="mb-2 text-base font-semibold text-foreground">
            No articles match your current filter
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            Try clearing the search query or selecting a different Real Estate Investment Lifecycle phase.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            data-testid="blog-reset-filters"
            className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              data-testid={`blog-post-card-${post.slug}`}
              className="group flex flex-col justify-between rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10 no-underline transition hover:border-foreground/30"
            >
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    REIL Phase: {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.publishedAt} · {post.readingTime}
                  </span>
                </div>
                <h2 className="mb-2.5 text-lg font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                  {post.title}
                </h2>
                <p className="text-base md:text-sm leading-relaxed text-muted-foreground">
                  {post.summary}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 pt-4 border-t border-border/60 text-xs font-semibold text-foreground">
                <span>Read article</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
