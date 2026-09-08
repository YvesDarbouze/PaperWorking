'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_TERMS,
  type GlossaryCategory,
} from '@/lib/marketing/glossary-data';

/** Ported from PaperWorking `/support/glossary`. */
export default function GlossaryPanel() {
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTerms = useMemo(() => {
    let items = GLOSSARY_TERMS;
    if (activeCategory !== 'all') {
      items = items.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q),
      );
    }
    return items;
  }, [activeCategory, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredTerms>();
    filteredTerms.forEach((t) => {
      const letter = /^[0-9]/.test(t.term) ? '#' : t.term[0]!.toUpperCase();
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

  function scrollToLetter(letter: string) {
    const el = document.getElementById(`glossary-${letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="pb-16">
      <section className="pb-8 pt-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <Link
            href="/support"
            className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 no-underline hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Support
          </Link>

          <h1 className="landing-display mb-4 font-semibold tracking-tighter text-white">
            Real Estate Glossary
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            Industry terminology and PaperWorking platform definitions — from ARV to Zoning Scan.
          </p>

          <div className="relative mx-auto mb-8 max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-white/40">
              search
            </span>
            <input
              type="text"
              aria-label="Search glossary"
              placeholder="Search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-[color:var(--color-primary)]/40 focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section className="pb-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                activeCategory === 'all'
                  ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-[#0d0a0b] shadow-md'
                  : 'border-[color:var(--color-primary)]/25 text-[color:var(--color-primary)]/70 hover:border-[color:var(--color-primary)]/50 hover:text-[color:var(--color-primary)]'
              }`}
            >
              All ({GLOSSARY_TERMS.length})
            </button>
            {GLOSSARY_CATEGORIES.map((cat) => {
              const count = GLOSSARY_TERMS.filter((t) => t.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                    activeCategory === cat.id
                      ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-[#0d0a0b] shadow-md'
                      : 'border-[color:var(--color-primary)]/25 text-[color:var(--color-primary)]/70 hover:border-[color:var(--color-primary)]/50 hover:text-[color:var(--color-primary)]'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto flex max-w-4xl gap-6">
          <nav
            className="sticky top-24 hidden flex-col gap-0.5 self-start pt-2 lg:flex"
            aria-label="Jump to letter"
          >
            {alphabet.map((letter) => {
              const hasTerms = activeLetters.has(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasTerms}
                  onClick={() => scrollToLetter(letter)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    hasTerms
                      ? 'text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/15'
                      : 'cursor-default text-[color:var(--color-primary)]/30'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1">
            {grouped.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-white/50">No matching terms found.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              grouped.map(([letter, terms]) => (
                <div key={letter} id={`glossary-${letter}`} className="mb-10 scroll-mt-24">
                  <div className="mb-4 flex items-center gap-3 border-b border-[color:var(--color-primary)]/20 pb-2">
                    <span className="text-2xl font-bold text-[color:var(--color-primary)]">
                      {letter}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-primary)]/50">
                      {terms.length} {terms.length === 1 ? 'term' : 'terms'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {terms.map((term) => {
                      const catLabel = GLOSSARY_CATEGORIES.find((c) => c.id === term.category)?.label;
                      return (
                        <div
                          key={term.term}
                          className="glass-card rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
                        >
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-white">{term.term}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              {catLabel ? (
                                <span className="rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/50">
                                  {catLabel}
                                </span>
                              ) : null}
                              {term.platformFeature ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-primary)]/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-primary)]">
                                  <span className="material-symbols-outlined text-[12px]">
                                    open_in_new
                                  </span>
                                  {term.platformFeature}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-white/60">{term.definition}</p>
                          {term.relatedTerms && term.relatedTerms.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <span className="mr-1 self-center text-[9px] font-bold uppercase tracking-widest text-white/40">
                                Related:
                              </span>
                              {term.relatedTerms.map((rt) => (
                                <span
                                  key={rt}
                                  className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-white/55"
                                >
                                  {rt}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col items-center justify-between gap-6 rounded-[28px] bg-[#0d0d0d] p-8 text-white sm:flex-row sm:p-10">
            <div>
              <h3 className="mb-1 text-lg font-semibold">Have a question?</h3>
              <p className="text-sm text-white/70">Check our FAQ or reach out to our team.</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/support#faq-faq-1"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white no-underline hover:bg-white/10"
              >
                FAQ
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-primary)] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#0d0a0b] no-underline hover:opacity-90"
              >
                Support Hub
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
