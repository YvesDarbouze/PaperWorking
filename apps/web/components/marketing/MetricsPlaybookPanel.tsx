'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import SupportResourceSelects from '@/components/marketing/SupportResourceSelects';
import {
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_METRICS,
  type MetricCategory,
} from '@/lib/marketing/playbook-metrics-data';

/** Ported from PaperWorking `/support/metrics` — The Playbook (33 metrics). */
export default function MetricsPlaybookPanel() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<MetricCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const category = searchParams.get('category');
    if (!category) return;
    const valid = PLAYBOOK_CATEGORIES.some((cat) => cat.id === category);
    if (valid) setActiveCategory(category as MetricCategory);
  }, [searchParams]);

  const filteredMetrics = useMemo(() => {
    let items = PLAYBOOK_METRICS;
    if (activeCategory !== 'all') {
      items = items.filter((m) => m.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.formula.toLowerCase().includes(q) ||
          m.measures.toLowerCase().includes(q) ||
          m.whyTracks.toLowerCase().includes(q),
      );
    }
    return items;
  }, [activeCategory, searchQuery]);

  return (
    <div className="mx-auto max-w-[1000px] px-5 pb-16 pt-8 md:px-8">
      <div className="mb-8">
        <Link
          href="/support"
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 no-underline hover:text-[color:var(--color-primary)]"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Support
        </Link>
        <h1 className="landing-display mb-4 font-semibold tracking-[-0.025em] text-white">
          The PaperWorking Playbook
        </h1>
        <p className="max-w-[700px] text-base leading-relaxed text-white/65 sm:text-lg">
          Real estate is document-heavy. PaperWorking transforms raw closing statements, property tax
          assessments, leases, and receipts into 33 real-time performance metrics automatically.
        </p>
      </div>

      <div className="mb-10 max-w-2xl">
        <SupportResourceSelects />
      </div>

      <div className="mb-10 space-y-6">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-white/40">
            search
          </span>
          <input
            type="text"
            placeholder="Search metrics, formulas, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-full border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)]"
          />
        </div>

        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-white/5 pb-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeCategory === 'all'
                ? 'border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]'
                : 'border border-transparent bg-transparent text-white/55 hover:text-white'
            }`}
          >
            All Metrics ({PLAYBOOK_METRICS.length})
          </button>
          {PLAYBOOK_CATEGORIES.map((cat) => {
            const count = PLAYBOOK_METRICS.filter((m) => m.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]'
                    : 'border border-transparent bg-transparent text-white/55 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredMetrics.map((m, idx) => (
          <article
            key={m.id}
            id={m.id}
            className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-white/5 p-6 backdrop-blur-xl transition-all duration-200"
            style={{
              background:
                'linear-gradient(135deg, rgba(24, 33, 39, 0.7) 0%, rgba(11, 20, 26, 0.8) 100%)',
            }}
          >
            {m.id === 'oer' ? <span id="expense-ratio" className="sr-only" /> : null}
            {m.id === 'portfolio-growth' ? <span id="appreciation" className="sr-only" /> : null}

            <div className="absolute right-4 top-4 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold tracking-wider text-white/20">
              #{String(idx + 1).padStart(2, '0')}
            </div>

            <div className="mb-4">
              <span className="mb-2 inline-flex rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
                {PLAYBOOK_CATEGORIES.find((c) => c.id === m.category)?.label}
              </span>
              <h3 className="text-lg font-bold text-white">{m.name}</h3>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 border-t border-white/5 pt-4 md:grid-cols-12">
              <div className="space-y-1 md:col-span-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Formula
                </span>
                <div className="overflow-x-auto rounded-lg border border-[color:var(--color-primary)]/10 bg-[color:var(--color-primary)]/5 p-2.5 font-[family-name:var(--font-jetbrains-mono)] text-xs text-[color:var(--color-primary)]">
                  {m.formula}
                </div>
              </div>

              <div className="space-y-1 md:col-span-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  What It Measures
                </span>
                <p className="text-[13px] font-normal leading-relaxed text-white/85">{m.measures}</p>
              </div>

              <div className="space-y-1 md:col-span-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  How PaperWorking Tracks It
                </span>
                <p className="text-[13px] font-normal leading-relaxed text-white/60">{m.whyTracks}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredMetrics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-white/50">No metrics match your search query.</p>
        </div>
      ) : null}
    </div>
  );
}
