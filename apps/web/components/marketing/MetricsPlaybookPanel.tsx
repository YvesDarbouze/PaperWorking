'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  MagnifyingGlass,
  TrendUp,
  Gear,
  ChartBar,
  CheckCircle,
  ShieldCheck,
} from '@phosphor-icons/react';
import {
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_METRICS,
  type MetricCategory,
} from '@/lib/marketing/playbook-metrics-data';

function renderCategoryIcon(categoryId: MetricCategory) {
  switch (categoryId) {
    case 'financial':
      return <TrendUp className="h-3.5 w-3.5" />;
    case 'operational':
      return <Gear className="h-3.5 w-3.5" />;
    case 'portfolio':
      return <ChartBar className="h-3.5 w-3.5" />;
    case 'marketing':
      return <CheckCircle className="h-3.5 w-3.5" />;
    case 'risk':
      return <ShieldCheck className="h-3.5 w-3.5" />;
  }
}

/** Ported from PaperWorking `/support/metrics`: The Playbook (33 metrics). */
export default function MetricsPlaybookPanel() {
  const [activeCategory, setActiveCategory] = useState<MetricCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 pt-2 pb-16 md:pt-3">
      <div className="mb-8">
        <Link
          href="/support"
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-400 no-underline hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </Link>
        <h1 className="landing-display mb-4 font-semibold tracking-[-0.025em] text-neutral-100">
          The PaperWorking Playbook
        </h1>
        <p className="max-w-[700px] text-base leading-relaxed text-neutral-400 sm:text-lg">
          Real estate is document-heavy. PaperWorking transforms raw closing statements, property tax
          assessments, leases, and receipts into 33 real-time performance metrics automatically.
        </p>
      </div>

      <div className="mb-10 space-y-6">
        <div className="relative max-w-md">
          <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search metrics, formulas, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-none border border-neutral-800 bg-neutral-900 pl-10 pr-4 text-base md:text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 min-h-[44px]"
          />
        </div>

        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-neutral-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`cursor-pointer whitespace-nowrap rounded-none px-4 py-2 text-xs font-semibold transition-all min-h-[44px] flex items-center ${
              activeCategory === 'all'
                ? 'border border-neutral-700 bg-neutral-800 text-neutral-100'
                : 'border border-transparent bg-transparent text-neutral-400 hover:text-neutral-100'
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
                className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-none px-4 py-2 text-xs font-semibold transition-all min-h-[44px] ${
                  activeCategory === cat.id
                    ? 'border border-neutral-700 bg-neutral-800 text-neutral-100'
                    : 'border border-transparent bg-transparent text-neutral-400 hover:text-neutral-100'
                }`}
              >
                {renderCategoryIcon(cat.id)}
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
            className="relative scroll-mt-24 overflow-hidden rounded-none border border-neutral-800 bg-neutral-950 p-6 shadow-sm transition-all duration-200"
          >
            {m.id === 'oer' ? <span id="expense-ratio" className="sr-only" /> : null}
            {m.id === 'portfolio-growth' ? <span id="appreciation" className="sr-only" /> : null}

            <div className="absolute right-4 top-4 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold tracking-wider text-neutral-500">
              #{String(idx + 1).padStart(2, '0')}
            </div>

            <div className="mb-4">
              <span className="mb-2 inline-flex rounded-none border border-neutral-800 bg-neutral-900 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-300">
                {PLAYBOOK_CATEGORIES.find((c) => c.id === m.category)?.label}
              </span>
              <h3 className="text-lg font-bold text-neutral-100">{m.name}</h3>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 border-t border-neutral-800 pt-4 md:grid-cols-12">
              <div className="space-y-1 md:col-span-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Formula
                </span>
                <div className="overflow-x-auto rounded-none border border-neutral-800 bg-neutral-900/60 p-2.5 font-[family-name:var(--font-jetbrains-mono)] text-xs text-neutral-300">
                  {m.formula}
                </div>
              </div>

              <div className="space-y-1 md:col-span-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  What It Measures
                </span>
                <p className="text-[13px] font-normal leading-relaxed text-neutral-300">{m.measures}</p>
              </div>

              <div className="space-y-1 md:col-span-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  How PaperWorking Tracks It
                </span>
                <p className="text-[13px] font-normal leading-relaxed text-neutral-400">{m.whyTracks}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredMetrics.length === 0 ? (
        <div className="rounded-none border border-dashed border-neutral-800 py-16 text-center">
          <p className="text-sm text-neutral-500">No metrics match your search query.</p>
        </div>
      ) : null}
    </div>
  );
}
