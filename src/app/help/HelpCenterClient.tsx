'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Compass, ChevronRight, HelpCircle, ArrowRight } from 'lucide-react';
import type { HelpArticle } from '@/lib/help/loader';

interface HelpCenterClientProps {
  initialArticles: HelpArticle[];
}

export default function HelpCenterClient({ initialArticles }: HelpCenterClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side search filtering
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return initialArticles;
    const query = searchQuery.toLowerCase().trim();
    return initialArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.excerpt.toLowerCase().includes(query) ||
        a.slug.toLowerCase().includes(query) ||
        a.rawContent.toLowerCase().includes(query)
    );
  }, [searchQuery, initialArticles]);

  const screensArticles = useMemo(() => {
    return filteredArticles.filter((a) => a.category === 'screens');
  }, [filteredArticles]);

  const metricsArticles = useMemo(() => {
    return filteredArticles.filter((a) => a.category === 'metrics');
  }, [filteredArticles]);

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      {/* Hero Header */}
      <div className="text-center mb-16">
        <span className="uppercase tracking-widest text-xs font-black text-emerald-400 mb-3 block">
          Support & Knowledge Base
        </span>
        <h1 className="text-4xl md:text-5xl font-light tracking-tighter text-[var(--pw-black)] mb-6">
          How can we help you build?
        </h1>
        <p className="text-sm text-[var(--pw-muted)] max-w-xl mx-auto mb-8">
          Detailed screen guides, walkthroughs, and clear metrics explainers with formulas to help you manage your real estate portfolio.
        </p>

        {/* Big Search Input */}
        <div className="max-w-2xl mx-auto relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--pw-muted)] group-focus-within:text-emerald-400 transition-colors" />
          <input
            id="help-center-search"
            type="search"
            placeholder="Search NOI, Cash Flow, first project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white/5 backdrop-blur-xl border border-[var(--pw-border)] rounded-2xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all text-[var(--pw-black)] placeholder:text-[var(--pw-muted)]"
          />
        </div>
      </div>

      {/* Grid of Results */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--pw-border)] rounded-2xl bg-white/5">
          <HelpCircle className="w-12 h-12 text-[var(--pw-muted)] mx-auto mb-4" />
          <p className="text-sm font-medium text-[var(--pw-black)]">No articles found matching "{searchQuery}"</p>
          <p className="text-xs text-[var(--pw-muted)] mt-1">Try checking your spelling or searching for metrics like "Cap Rate"</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Screens Section */}
          {screensArticles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6 border-b border-[var(--pw-border)] pb-3">
                <Compass className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xs uppercase tracking-widest font-black text-[var(--pw-black)]">
                  Platform Screen Guides ({screensArticles.length})
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {screensArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help/${article.slug}`}
                    className="p-5 rounded-xl border border-[var(--pw-border)] bg-white/5 hover:bg-white/10 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <h3 className="text-base font-bold text-[var(--pw-black)] mb-2 group-hover:text-emerald-400 transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-xs text-[var(--pw-muted)] leading-relaxed line-clamp-2">
                        {article.excerpt}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-emerald-400">
                      Read Guide <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Metrics Section */}
          {metricsArticles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6 border-b border-[var(--pw-border)] pb-3">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xs uppercase tracking-widest font-black text-[var(--pw-black)]">
                  Metric Explainers ({metricsArticles.length})
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {metricsArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help/${article.slug}`}
                    className="p-5 rounded-xl border border-[var(--pw-border)] bg-white/5 hover:bg-white/10 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <h3 className="text-base font-bold text-[var(--pw-black)] mb-2 group-hover:text-emerald-400 transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-xs text-[var(--pw-muted)] leading-relaxed line-clamp-2">
                        {article.excerpt}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-emerald-400">
                      View Formula <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
