'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, BookOpen, Hash, ExternalLink } from 'lucide-react';
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORIES,
  type GlossaryCategory,
} from '@/lib/cms/glossaryData';

/* ═══════════════════════════════════════════════════════
   /support/glossary — Real Estate Investing Glossary
   
   Features:
   • Alphabetical anchor navigation (A-Z rail)
   • Category filter tabs
   • Search bar with instant filtering
   • Platform feature badges linking terms to app features
   ═══════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export default function GlossaryPage() {
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTerms = useMemo(() => {
    let items = GLOSSARY_TERMS;
    if (activeCategory !== 'all') {
      items = items.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activeCategory, searchQuery]);

  // Group terms by first letter
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredTerms>();
    filteredTerms.forEach((t) => {
      const letter = /^[0-9]/.test(t.term) ? '#' : t.term[0].toUpperCase();
      const arr = map.get(letter) || [];
      arr.push(t);
      map.set(letter, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === '#') return -1;
      if (b === '#') return 1;
      return a.localeCompare(b);
    });
  }, [filteredTerms]);

  const activeLetters = new Set(grouped.map(([l]) => l));
  const alphabet = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const scrollToLetter = (letter: string) => {
    const el = document.getElementById(`glossary-${letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* ── Hero ── */}
      <section className="pt-12 pb-8 sm:pt-16 sm:pb-10">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto max-w-3xl text-center">
          <motion.div variants={fadeUp}>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] hover:text-[var(--pw-fg)] transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Support
            </Link>
          </motion.div>

          <motion.h1 variants={fadeUp} className="tracking-tighter text-[var(--pw-fg)] mb-4 type-display font-semibold">
            Real Estate Glossary
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base sm:text-lg text-[var(--pw-subtle)] max-w-xl mx-auto leading-relaxed mb-10">
            Industry terminology and PaperWorking platform definitions — from ARV to Zoning Scan.
          </motion.p>

          {/* Search */}
          <motion.div variants={fadeUp} className="relative max-w-md mx-auto mb-8">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--pw-subtle)]" />
            </div>
            <input
              type="text"
              aria-label="Search glossary"
              placeholder="Search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-[var(--radius-sm)] bg-[var(--pw-surface)] border border-[var(--pw-border)] text-sm text-[var(--pw-fg)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-fg)] focus:ring-1 focus:ring-[var(--pw-fg)] transition-all shadow-sm"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Category Tabs ── */}
      <section className="pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveCategory('all')}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                activeCategory === 'all'
                  ? 'border-[var(--pw-fg)] text-[var(--pw-fg)]'
                  : 'border-[var(--pw-border)] text-[var(--pw-muted)] hover:border-[var(--pw-subtle)] hover:text-[var(--pw-subtle)]'
              }`}
              style={activeCategory === 'all' ? { backgroundColor: 'var(--pw-fg)', color: 'var(--pw-bg)' } : {}}
            >
              All ({GLOSSARY_TERMS.length})
            </button>
            {GLOSSARY_CATEGORIES.map((cat) => {
              const count = GLOSSARY_TERMS.filter((t) => t.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                    activeCategory === cat.id
                      ? 'border-[var(--pw-fg)] text-[var(--pw-fg)]'
                      : 'border-[var(--pw-border)] text-[var(--pw-muted)] hover:border-[var(--pw-subtle)] hover:text-[var(--pw-subtle)]'
                  }`}
                  style={activeCategory === cat.id ? { backgroundColor: 'var(--pw-fg)', color: 'var(--pw-bg)' } : {}}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── A-Z Rail + Terms ── */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto flex gap-6" ref={containerRef}>
          {/* A-Z Rail (desktop) */}
          <nav className="hidden lg:flex flex-col gap-1 sticky top-24 self-start pt-2">
            {alphabet.map((letter) => (
              <button
                key={letter}
                disabled={!activeLetters.has(letter)}
                onClick={() => scrollToLetter(letter)}
                className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
                  activeLetters.has(letter)
                    ? 'text-[var(--pw-fg)] hover:bg-[var(--pw-border)]'
                    : 'text-[var(--pw-muted)]/30 cursor-default'
                }`}
              >
                {letter}
              </button>
            ))}
          </nav>

          {/* Terms List */}
          <div className="flex-1 min-w-0">
            {grouped.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[var(--pw-muted)] text-sm">No matching terms found.</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                  className="mt-4 text-xs font-bold uppercase tracking-widest text-[var(--pw-subtle)] hover:text-[var(--pw-fg)] transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={stagger}>
                {grouped.map(([letter, terms]) => (
                  <div key={letter} id={`glossary-${letter}`} className="mb-10 scroll-mt-24">
                    {/* Letter Header */}
                    <div className="flex items-center gap-3 mb-4 border-b border-[var(--pw-border)] pb-2">
                      <span className="text-2xl font-bold text-[var(--pw-fg)]">{letter}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--pw-muted)]">
                        {terms.length} {terms.length === 1 ? 'term' : 'terms'}
                      </span>
                    </div>

                    {/* Term Cards */}
                    <div className="space-y-3">
                      {terms.map((term) => {
                        const catLabel = GLOSSARY_CATEGORIES.find((c) => c.id === term.category)?.label;
                        return (
                          <motion.div
                            key={term.term}
                            variants={fadeUp}
                            className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <h3 className="text-sm font-semibold text-[var(--pw-fg)]">
                                {term.term}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                {catLabel && (
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--pw-muted)] bg-[var(--pw-bg)] px-2 py-0.5 rounded-full">
                                    {catLabel}
                                  </span>
                                )}
                                {term.platformFeature && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-[var(--pw-accent)]/30 text-[var(--pw-accent)]">
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    {term.platformFeature}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-[var(--pw-subtle)] leading-relaxed">
                              {term.definition}
                            </p>
                            {term.relatedTerms && term.relatedTerms.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--pw-muted)] self-center mr-1">
                                  Related:
                                </span>
                                {term.relatedTerms.map((rt) => (
                                  <span
                                    key={rt}
                                    className="text-[10px] text-[var(--pw-subtle)] bg-[var(--pw-bg)] px-2 py-0.5 rounded-full"
                                  >
                                    {rt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-[var(--radius-lg)] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{ backgroundColor: '#0d0d0d', color: '#ffffff' }}
          >
            <div>
              <h3 className="text-lg font-semibold mb-1">Have a question?</h3>
              <p className="text-sm text-white/70">
                Check our FAQ or reach out to our team.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/support/faq"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                <Hash className="w-3.5 h-3.5" />
                FAQ
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/90 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Support Hub
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
