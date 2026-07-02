'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { SUPPORT_ARTICLES, SUPPORT_CATEGORIES, type SupportArticle } from '@/lib/cms/supportData';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } },
};

export default function SupportAllClient() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SUPPORT_ARTICLES;
    return SUPPORT_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Group filtered articles by category
  const articlesByCategory = useMemo(() => {
    const groups: Record<string, SupportArticle[]> = {};
    SUPPORT_CATEGORIES.forEach((cat) => {
      groups[cat.id] = [];
    });
    filteredArticles.forEach((article) => {
      if (groups[article.categoryId]) {
        groups[article.categoryId].push(article);
      }
    });
    return groups;
  }, [filteredArticles]);

  return (
    <div className="min-h-screen bg-background text-on-surface pt-10 pb-24">
      {/* Back to Support Hub */}
      <div className="max-w-container-max mx-auto px-5 md:px-8 mb-8">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Back to Support Hub
        </Link>
      </div>

      {/* Header section */}
      <section className="relative overflow-hidden mb-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-5 md:px-8 text-center">
          <h1 className="font-thin text-[36px] md:text-[56px] leading-tight tracking-[-0.035em] text-on-surface mb-5">
            All Support Articles
          </h1>
          <p className="text-[16px] md:text-[17px] leading-[27px] text-on-surface-variant mb-8 max-w-xl mx-auto">
            Browse our entire knowledge base of guides, tutorials, and deep-dives.
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant/40 pointer-events-none z-10"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter articles by title, description, or tags..."
              aria-label="Filter support articles"
              className="w-full h-14 pl-12 pr-12 rounded-xl glass-panel border border-white/12
                text-[15px] text-on-surface placeholder:text-on-surface-variant/35
                focus:outline-none focus:border-primary/45 focus:shadow-[0_0_0_3px_rgba(0,221,148,0.15)]
                transition-all duration-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant/40 hover:text-on-surface"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                close
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="max-w-container-max mx-auto px-5 md:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {SUPPORT_CATEGORIES.map((cat) => {
            const catArticles = articlesByCategory[cat.id] || [];
            if (catArticles.length === 0) return null;

            return (
              <motion.div
                key={cat.id}
                variants={fadeUp}
                className="glass-card rounded-xl border border-white/8 p-6 flex flex-col h-full hover:border-primary/25 transition-all duration-300"
              >
                {/* Category Header */}
                <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                      <span
                        className={`material-symbols-outlined text-[20px] ${cat.color}`}
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                      >
                        {cat.icon}
                      </span>
                    </div>
                    <div className="text-left">
                      <h2 className="text-[16px] font-bold text-on-surface tracking-[-0.01em] leading-snug">
                        {cat.title}
                      </h2>
                      <p className="text-[12px] text-on-surface-variant/60 leading-snug mt-0.5">
                        {cat.tagline}
                      </p>
                    </div>
                  </div>
                  <span className="font-jetbrains text-[10px] tracking-wide uppercase px-2.5 py-1 rounded bg-white/5 border border-white/8 text-on-surface-variant/70">
                    {catArticles.length} {catArticles.length === 1 ? 'article' : 'articles'}
                  </span>
                </div>

                {/* Articles list */}
                <ul className="space-y-1.5 flex-grow">
                  {catArticles.map((article) => (
                    <li key={article.id}>
                      <Link
                        href={`/support/${article.id}`}
                        className="flex flex-col gap-1 p-3 rounded-lg hover:bg-white/5 transition-all duration-200 group"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className="material-symbols-outlined text-[15px] text-on-surface-variant/30 mt-0.5 group-hover:text-primary transition-colors shrink-0"
                            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                          >
                            article
                          </span>
                          <span className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">
                            {article.title}
                          </span>
                        </div>
                        {article.excerpt && (
                          <p className="text-[12px] text-on-surface-variant/55 pl-6 line-clamp-2 leading-relaxed">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pl-6 mt-1">
                          <span className="font-jetbrains text-[9px] uppercase tracking-wider text-on-surface-variant/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.readTime}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty state */}
        <AnimatePresence>
          {filteredArticles.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20 mb-4 animate-bounce">
                search_off
              </span>
              <h3 className="text-[18px] font-bold text-on-surface mb-2">No articles matched your search</h3>
              <p className="text-[14px] text-on-surface-variant/60 max-w-sm mx-auto mb-6">
                Try searching with different terms or contact support directly if you are stuck.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="luminous-button px-5 py-2.5 rounded-lg text-xs font-semibold"
              >
                Clear Search
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
