'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_ARTICLES,
  SUPPORT_FAQS,
  POPULAR_SEARCHES,
  SYSTEM_STATUS,
} from '@/lib/cms/supportData';
import { searchSupportIndex, type SearchResult } from '@/lib/search/supportSearch';

/* ═══════════════════════════════════════════════════════
   Support Hub — /support
   ═══════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.19, 1, 0.22, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

/* ── Contact channels — tier-based routing ─────────────── */
const CONTACT_CHANNELS = [
  {
    icon: 'mail',
    label: 'Email Support',
    tier: 'All plans',
    tierStyle: 'text-on-surface-variant',
    headline: 'hi@paperworking.co',
    description: 'A real person answers every message. Send your deal details and we jump straight to the issue.',
    cta: 'Send an email',
    href: 'mailto:hi@paperworking.co',
    borderStyle: 'border-white/8',
  },
  {
    icon: 'chat',
    label: 'Live Chat',
    tier: 'Investor & Team',
    tierStyle: 'text-primary',
    headline: 'Talk to a real person',
    description: 'Investor and Investment Team accounts get live chat — response in under 30 minutes during business hours.',
    cta: 'Start chat',
    href: '#chat',
    borderStyle: 'border-primary/20',
  },
  {
    icon: 'star',
    label: 'Priority Support',
    tier: 'Investment Team only',
    tierStyle: 'text-tertiary',
    headline: "Dedicated line — deals don't wait",
    description: "Investment Team accounts get a direct line. If you're mid-closing and something breaks, we pick up.",
    cta: 'Access priority support',
    href: '/account/support',
    borderStyle: 'border-tertiary/20',
  },
];

/* ── Popular articles ───────────────────────────────────── */
const POPULAR_ARTICLES = SUPPORT_ARTICLES.filter((a) => a.popular).slice(0, 6);

/* ── Status badge ───────────────────────────────────────── */
function StatusBadge({ status }: { status: 'operational' | 'degraded' | 'outage' }) {
  if (status === 'degraded') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-tertiary" />
        <span className="font-jetbrains text-[10px] text-tertiary/70 uppercase tracking-[0.06em]">Degraded</span>
      </span>
    );
  }
  if (status === 'outage') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
        <span className="font-jetbrains text-[10px] text-on-surface-variant/50 uppercase tracking-[0.06em]">Outage</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="font-jetbrains text-[10px] text-primary/70 uppercase tracking-[0.06em]">Operational</span>
    </span>
  );
}

export default function SupportPage() {
  const router = useRouter();

  /* ── Client-side search engine ────────────────────────── */
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    const matches = searchSupportIndex(trimmed, 8);
    setSearchResults(matches);
    setSelectedIndex(-1);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setDropdownOpen(val.trim().length > 0);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (val.trim()) {
      setSearching(true);
      timerRef.current = setTimeout(() => {
        runSearch(val);
        setSearching(false);
      }, 200);
    } else {
      setSearching(false);
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    setDropdownOpen(true);
    setSearching(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runSearch(tag);
      setSearching(false);
    }, 200);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        e.preventDefault();
        const target = searchResults[selectedIndex];
        router.push(target.doc.route);
        setDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDropdownOpen(false);
      setSelectedIndex(-1);
    }
  };

  /* ── FAQ filtering ────────────────────────────────────── */
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [faqFilter, setFaqFilter] = useState('');

  const filteredFaqs = useMemo(() => {
    const lf = faqFilter.toLowerCase().trim();
    if (!lf) return SUPPORT_FAQS;
    return SUPPORT_FAQS.filter(
      (f) => f.question.toLowerCase().includes(lf) || f.answer.toLowerCase().includes(lf)
    );
  }, [faqFilter]);

  /* ── System status check ──────────────────────────────── */
  const allOk = SYSTEM_STATUS.every((s) => s.status === 'operational');

  return (
    <div className="min-h-screen bg-background text-on-surface pt-16 pb-16">

      {/* ══════════════════════════════════════════════════
          § 1. HERO — search as primary deflection layer
          ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-10 md:pb-14 text-center"
        >
          {/* Status pill */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel border border-primary/20 mb-9">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-jetbrains text-[10px] text-primary/80 tracking-[0.1em] uppercase">
              {allOk ? 'All systems operational' : 'Status: checking…'}
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="font-semibold leading-[1.05] tracking-[-0.025em] text-on-surface mb-5 type-display">
            What are you trying<br className="hidden md:block" /> to figure out?
          </motion.h1>

          <motion.p variants={fadeUp} className="text-[16px] md:text-[17px] leading-[27px] text-on-surface-variant mb-10 max-w-xl mx-auto">
            Search our knowledge base — most answers are already here. If not, a real person answers every message.
          </motion.p>

          {/* Search bar */}
          <motion.div variants={fadeUp} className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <span
                className="absolute left-4 material-symbols-outlined text-[20px] text-on-surface-variant/40 pointer-events-none z-10"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (query.trim()) setDropdownOpen(true); }}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                placeholder={`e.g. "contingency deadline", "CPA export", "approve a draw"`}
                aria-label="Search PaperWorking knowledge base"
                role="combobox"
                aria-expanded={dropdownOpen}
                aria-controls="support-search-listbox"
                aria-activedescendant={selectedIndex >= 0 ? `search-option-${selectedIndex}` : undefined}
                className="w-full h-14 pl-12 pr-12 rounded-xl glass-panel border border-white/12
                  text-[15px] text-on-surface placeholder:text-on-surface-variant/35
                  focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(69,73,85,0.10)]
                  transition-all duration-200 min-h-[44px]"
              />
              {searching && (
                <span
                  className="absolute right-4 material-symbols-outlined text-[18px] text-primary/40 animate-spin"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  progress_activity
                </span>
              )}
            </div>

            {/* Search dropdown */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.99 }}
                  transition={{ duration: 0.16, ease: [0.19, 1, 0.22, 1] }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 glass-panel rounded-xl border border-white/12 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                >
                  {searching ? (
                    <div className="flex items-center gap-3 px-5 py-6 text-on-surface-variant/50 text-[13px]">
                      <span className="material-symbols-outlined text-[18px] animate-spin text-primary/40">progress_activity</span>
                      Searching knowledge base…
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-5 py-6 text-left" data-testid="search-empty-state">
                      <p className="text-[13px] text-on-surface-variant/70 leading-relaxed">
                        No matches in the knowledge base. Email{' '}
                        <a href="mailto:hi@paperworking.co" className="text-primary hover:underline font-semibold">
                          hi@paperworking.co
                        </a>{' '}
                        — a real person answers every message.
                      </p>
                    </div>
                  ) : (
                    <ul id="support-search-listbox" role="listbox" className="p-2 space-y-1">
                      <li className="px-3 pb-1 pt-1 border-b border-white/5">
                        <span className="font-jetbrains text-[9px] uppercase tracking-[0.1em] text-on-surface-variant/40">
                          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                        </span>
                      </li>
                      {searchResults.map((res, idx) => (
                        <li key={res.doc.id} id={`search-option-${idx}`} role="option" aria-selected={selectedIndex === idx}>
                          <Link
                            href={res.doc.route}
                            onMouseDown={(e) => {
                              // Ensure click works before blur
                              e.preventDefault();
                              router.push(res.doc.route);
                              setDropdownOpen(false);
                            }}
                            className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-colors group/r ${
                              selectedIndex === idx ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5 ${
                                selectedIndex === idx ? 'text-primary' : 'text-on-surface-variant/30 group-hover/r:text-primary'
                              }`}
                              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                            >
                              {res.doc.type === 'metric' ? 'monitoring' : res.doc.type === 'glossary' ? 'book_2' : res.doc.type === 'faq' ? 'help' : 'article'}
                            </span>
                            <div className="text-left min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <p className="text-[13px] font-semibold text-on-surface group-hover/r:text-primary transition-colors leading-snug truncate">
                                  {res.doc.title}
                                </p>
                                <span className="font-jetbrains text-[9px] uppercase tracking-wider text-primary/60 px-2 py-0.5 rounded bg-primary/10 flex-shrink-0">
                                  {res.doc.category}
                                </span>
                              </div>
                              <p className="text-[12px] text-on-surface-variant/60 leading-normal line-clamp-2">
                                {res.snippet}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Popular search chips */}
          <motion.div variants={fadeUp} className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="font-jetbrains text-[10px] uppercase tracking-[0.08em] text-on-surface-variant/35 mr-1">
              Common searches:
            </span>
            {POPULAR_SEARCHES.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className="pw-interactive-custom px-3 py-1.5 rounded-full glass-panel border border-white/10
                  text-[12px] font-medium text-on-surface-variant hover:text-primary hover:border-primary/30
                  transition-all duration-200 min-h-[44px] cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Shortcut Resources Grid ── */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <motion.div variants={fadeUp}>
            <Link
              href="/support/glossary"
              className="flex items-center gap-5 p-5 glass-panel rounded-xl border border-white/8 hover:border-primary/20 transition-all duration-200 group text-decoration-none min-h-[44px]"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <span className="material-symbols-outlined text-[24px] text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                  book_2
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-on-surface leading-snug group-hover:text-primary transition-colors mb-1">
                  Real Estate Glossary
                </h3>
                <p className="text-[12px] text-on-surface-variant/60 leading-normal">
                  Demystify industry terminology from ARV to Cap Rate.
                </p>
              </div>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant/20 group-hover:text-primary transition-colors">
                arrow_forward
              </span>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link
              href="/support/metrics"
              className="flex items-center gap-5 p-5 glass-panel rounded-xl border border-white/8 hover:border-primary/20 transition-all duration-200 group text-decoration-none min-h-[44px]"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <span className="material-symbols-outlined text-[24px] text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                  monitoring
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-on-surface leading-snug group-hover:text-primary transition-colors mb-1">
                  The Playbook (33 Metrics)
                </h3>
                <p className="text-[12px] text-on-surface-variant/60 leading-normal">
                  Executive guide to the 33 metrics tracked automatically by PaperWorking.
                </p>
              </div>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant/20 group-hover:text-primary transition-colors">
                arrow_forward
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 2. POPULAR ARTICLES — zero-scroll quick wins
          ══════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-16 md:pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-7">
            <div>
              <p className="font-jetbrains text-[10px] uppercase tracking-[0.1em] text-primary/50 mb-1.5">Most searched</p>
              <h2 className="text-[20px] md:text-[22px] font-bold tracking-[-0.02em] text-on-surface">Popular articles</h2>
            </div>
            <Link
              href="/support/all"
              className="pw-interactive-custom text-[13px] font-semibold text-primary/60 hover:text-primary flex items-center gap-1.5 transition-colors min-h-[44px]"
            >
              Browse all
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </motion.div>

          <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {POPULAR_ARTICLES.map((article) => {
              const cat = SUPPORT_CATEGORIES.find((c) => c.id === article.categoryId);
              return (
                <motion.div key={article.id} variants={fadeUp}>
                  <Link
                    href={`/support/${article.id}`}
                    className="flex items-start gap-4 p-5 glass-panel rounded-xl border border-white/8
                      hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group min-h-[44px]"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5 ${cat?.color ?? 'text-on-surface-variant'} group-hover:scale-110 transition-transform`}
                      style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                    >
                      {cat?.icon ?? 'article'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug mb-1">
                        {article.title}
                      </p>
                      <p className="font-jetbrains text-[10px] text-on-surface-variant/35 tracking-wide uppercase">
                        {article.readTime}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 3. CATEGORY GRID — problem-centric KB
          ══════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-16 md:pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-10">
            <p className="font-jetbrains text-[10px] uppercase tracking-[0.1em] text-primary/50 mb-1.5">Knowledge base</p>
            <h2 className="text-[20px] md:text-[22px] font-bold tracking-[-0.02em] text-on-surface">
              Find answers by what you&apos;re trying to do
            </h2>
          </motion.div>

          <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUPPORT_CATEGORIES.map((cat) => {
              const catArticles = SUPPORT_ARTICLES.filter((a) => a.categoryId === cat.id).slice(0, 4);
              return (
                <motion.div
                  key={cat.id}
                  variants={fadeUp}
                  className="glass-card rounded-xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
                >
                  {/* Category header */}
                  <div className="p-6 border-b border-white/8">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                        <span
                          className={`material-symbols-outlined text-[20px] ${cat.color} group-hover:scale-110 transition-transform duration-200`}
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                        >
                          {cat.icon}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-on-surface tracking-[-0.01em] leading-snug mb-1">
                          {cat.title}
                        </h3>
                        <p className="text-[12px] text-on-surface-variant/55 leading-snug">{cat.tagline}</p>
                      </div>
                    </div>
                  </div>

                  {/* Article list */}
                  <ul className="p-4 space-y-0.5">
                    {catArticles.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/support/${a.id}`}
                          className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/5
                            transition-colors text-[13px] text-on-surface-variant hover:text-on-surface group/a min-h-[44px]"
                        >
                          <span
                            className="material-symbols-outlined text-[14px] text-on-surface-variant/25 flex-shrink-0 mt-0.5 group-hover/a:text-primary transition-colors"
                            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                          >
                            chevron_right
                          </span>
                          <span className="leading-snug">{a.title}</span>
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        href={`/support/category/${cat.id}`}
                        className={`flex items-center gap-1.5 px-3 py-2.5 mt-1 text-[12px] font-semibold ${cat.color} hover:opacity-75 transition-opacity min-h-[44px]`}
                      >
                        See all {cat.articleCount} articles
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </li>
                  </ul>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 4. CONTACT CHANNELS — tier-based routing
          ══════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8 pb-16 md:pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-10">
            <p className="font-jetbrains text-[10px] uppercase tracking-[0.1em] text-primary/50 mb-1.5">Can&apos;t find the answer?</p>
            <h2 className="text-[20px] md:text-[22px] font-bold tracking-[-0.02em] text-on-surface">Talk to a person</h2>
          </motion.div>

          <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CONTACT_CHANNELS.map((ch) => (
              <motion.div
                key={ch.label}
                variants={fadeUp}
                className={`glass-panel rounded-xl p-7 flex flex-col gap-5 border ${ch.borderStyle} transition-all duration-200 hover:border-opacity-60`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[20px] text-primary"
                      style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                    >
                      {ch.icon}
                    </span>
                  </div>
                  <span className={`font-jetbrains text-[10px] uppercase tracking-[0.06em] ${ch.tierStyle}`}>
                    {ch.tier}
                  </span>
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-on-surface tracking-[-0.01em] mb-1.5">{ch.label}</h3>
                  <p className="font-jetbrains text-[11px] text-primary/55 mb-3">{ch.headline}</p>
                  <p className="text-[13px] leading-[21px] text-on-surface-variant">{ch.description}</p>
                </div>

                <Link
                  href={ch.href}
                  className="pw-interactive-custom mt-auto flex items-center gap-2 text-[13px] font-semibold text-primary hover:opacity-75 transition-opacity min-h-[44px]"
                >
                  {ch.cta}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust signals */}
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { icon: 'lock', text: 'SOC 2-ready infrastructure' },
              { icon: 'schedule', text: 'A real person answers every message' },
              { icon: 'person', text: 'Real people, not bots' },
            ].map((s) => (
              <span key={s.text} className="flex items-center gap-2 text-[12px] text-on-surface-variant/35">
                <span
                  className="material-symbols-outlined text-[14px] text-primary/35"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {s.icon}
                </span>
                {s.text}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 5. FAQ — investor-specific questions
          ══════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 pb-16 md:pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <p className="font-jetbrains text-[10px] uppercase tracking-[0.1em] text-primary/50 mb-1.5">Before you email us</p>
            <h2 className="text-[20px] md:text-[22px] font-bold tracking-[-0.02em] text-on-surface">
              Frequently asked questions
            </h2>
          </motion.div>

          {/* FAQ search / filter */}
          <motion.div variants={fadeUp} className="mb-6">
            <div className="relative">
              <span
                className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant/30 pointer-events-none"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Filter questions…"
                value={faqFilter}
                onChange={(e) => { setFaqFilter(e.target.value); setOpenFaq(null); }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-low/40 border border-white/8
                  text-[13px] text-on-surface placeholder:text-on-surface-variant/30
                  focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all duration-200 min-h-[44px]"
              />
            </div>
          </motion.div>

          {/* Accordion */}
          <motion.div variants={fadeUp} className="space-y-3">
            {filteredFaqs.length === 0 && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-[28px] text-on-surface-variant/20 mb-2 block">search_off</span>
                <p className="text-[13px] text-on-surface-variant/40">No questions match &ldquo;{faqFilter}&rdquo;</p>
              </div>
            )}
            {filteredFaqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <details
                  key={faq.id}
                  open={isOpen}
                  className="glass-panel rounded-xl border border-white/8 group overflow-hidden"
                >
                  <summary
                    onClick={(e) => { e.preventDefault(); setOpenFaq(isOpen ? null : faq.id); }}
                    className="pw-interactive-custom flex items-start justify-between gap-4 px-6 py-5
                      cursor-pointer list-none select-none text-[14px] font-semibold text-on-surface
                      tracking-[-0.01em] hover:text-primary transition-colors duration-200 min-h-[44px]"
                  >
                    <span className="leading-snug">{faq.question}</span>
                    <span
                      className={`material-symbols-outlined flex-shrink-0 text-[20px] text-primary/40 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
                      style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                    >
                      add
                    </span>
                  </summary>
                  {isOpen && (
                    <div className="px-6 pb-6">
                      <div className="border-t border-white/8 pt-5">
                        <p className="text-[14px] leading-[24px] text-on-surface-variant">{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </details>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 5b. DATA POINTS WE TRACK — 10 canonical KPIs
          ══════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 pb-16 md:pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-4 text-center">
            <p className="font-jetbrains text-[10px] uppercase tracking-[0.1em] text-primary/50 mb-1.5">Metrics that matter</p>
            <h2 className="text-[20px] md:text-[22px] font-bold tracking-[-0.02em] text-on-surface mb-4">
              Data Points We Track
            </h2>
            <p className="text-[14px] leading-[24px] text-on-surface-variant max-w-xl mx-auto">
              Do you know what your NOI, DSCR, or cash-on-cash return is right now? Your portfolio does. PaperWorking just makes it visible.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 space-y-2">
            {[
              { name: 'Net Operating Income (NOI)',            tagline: 'Instant NOI. Zero Formulas. Total Control.',              anchor: 'noi' },
              { name: 'Cash Flow',                            tagline: 'Your Cash Flow. Automated. Visualized. Certain.',         anchor: 'cash-flow' },
              { name: 'Cap Rate',                             tagline: 'See the Asset\u2019s Raw Muscle. No Financing Tricks.',    anchor: 'cap-rate' },
              { name: 'Cash-on-Cash Return',                  tagline: 'Your Real Cash Yield. Live. Visual. Certain.',            anchor: 'coc' },
              { name: 'Gross Rent Multiplier (GRM)',           tagline: 'Compare Properties Instantly.',                           anchor: 'grm' },
              { name: 'Debt Service Coverage Ratio (DSCR)',    tagline: 'Your DSCR. Automated. Fundable. Certain.',               anchor: 'dscr' },
              { name: 'Internal Rate of Return (IRR)',         tagline: 'Your True Return. Time-Weighted. Undeniable.',            anchor: 'irr' },
              { name: 'Occupancy Rate',                       tagline: 'Every Vacant Day Has a Price Tag.',                       anchor: 'occupancy' },
              { name: 'Expense Ratio',                        tagline: 'Find the Leak Before It Sinks the Margin.',              anchor: 'expense-ratio' },
              { name: 'Long-Term Appreciation',               tagline: 'The Return You Earn While Holding.',                      anchor: 'appreciation' },
            ].map((kpi, idx) => (
              <Link
                key={kpi.anchor}
                href={`/support/metrics#${kpi.anchor}`}
                className="flex items-center gap-4 px-5 py-4 rounded-xl glass-panel border border-white/8
                  hover:border-primary/20 hover:bg-primary/3 transition-all duration-200 group text-decoration-none min-h-[44px]"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 border border-primary/15
                  flex items-center justify-center text-[11px] font-bold text-primary tabular-nums">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-on-surface leading-tight group-hover:text-primary transition-colors duration-200">
                    {kpi.name}
                  </div>
                  <div className="text-[12px] text-on-surface-variant/60 mt-0.5 truncate">
                    {kpi.tagline}
                  </div>
                </div>
                <span
                  className="material-symbols-outlined flex-shrink-0 text-[16px] text-on-surface-variant/20 group-hover:text-primary/50 transition-colors duration-200"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                >
                  arrow_forward
                </span>
              </Link>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <Link
              href="/support/metrics"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20 transition-all duration-200 text-decoration-none min-h-[44px]"
            >
              Explore the Playbook (All 33 Metrics)
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
                arrow_forward
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 6. SYSTEM STATUS STRIP
          ══════════════════════════════════════════════════ */}
      <section className="max-w-container-max mx-auto px-5 md:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-20px' }}
          variants={fadeUp}
        >
          <div className="glass-panel rounded-xl border border-white/8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[18px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                >
                  monitor_heart
                </span>
                <span className="text-[13px] font-semibold text-on-surface">System Status</span>
              </div>
              <a
                href="https://status.paperworking.co"
                target="_blank"
                rel="noopener noreferrer"
                className="pw-interactive-custom font-jetbrains text-[10px] uppercase tracking-[0.06em] text-primary/40 hover:text-primary transition-colors flex items-center gap-1 min-h-[44px]"
              >
                Full status page
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
              {SYSTEM_STATUS.map((s) => (
                <div key={s.service} className="px-5 py-4 flex flex-col gap-2">
                  <span className="text-[12px] font-medium text-on-surface-variant/60">{s.service}</span>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>

          <p className="text-center mt-3 font-jetbrains text-[10px] text-on-surface-variant/25 tracking-[0.04em] uppercase">
            Status updated in real time · Incidents at{' '}
            <a href="https://status.paperworking.co" target="_blank" rel="noopener noreferrer" className="text-primary/35 hover:text-primary transition-colors">
              status.paperworking.co
            </a>
          </p>
        </motion.div>
      </section>

    </div>
  );
}
