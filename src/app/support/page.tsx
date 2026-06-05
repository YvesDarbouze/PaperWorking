'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_ARTICLES,
  SUPPORT_FAQS,
  POPULAR_SEARCHES,
  SYSTEM_STATUS,
} from '@/lib/cms/supportData';

/* ═══════════════════════════════════════════════════════
   Support Hub — /support

   Architecture (docs-architect + customer-support skills):
   ─ Problem-centric KB organization (not feature-organized)
   ─ Search as primary deflection layer
   ─ Popular articles for zero-scroll quick wins
   ─ 6 categories named after investor goals
   ─ Tier-based contact channels (Starter / Pro / Portfolio)
   ─ Investor-specific FAQ accordion
   ─ System status strip
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
    headline: 'support@paperworking.co',
    description: 'Response within 4 business hours on weekdays. Send your deal details and we jump straight to the issue.',
    cta: 'Send an email',
    href: 'mailto:support@paperworking.co',
    borderStyle: 'border-white/8',
  },
  {
    icon: 'chat',
    label: 'Live Chat',
    tier: 'Pro & Portfolio',
    tierStyle: 'text-primary',
    headline: 'Talk to a real person',
    description: 'Pro and Portfolio investors get live chat — response in under 30 minutes during business hours.',
    cta: 'Start chat',
    href: '#chat',
    borderStyle: 'border-primary/20',
  },
  {
    icon: 'star',
    label: 'Priority Support',
    tier: 'Portfolio only',
    tierStyle: 'text-tertiary',
    headline: "Dedicated line — deals don't wait",
    description: "Portfolio investors get a direct line. If you're mid-closing and something breaks, we pick up.",
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

/* ═══════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════ */
export default function SupportPage() {

  /* ── Search ───────────────────────────────────────────── */
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(SUPPORT_ARTICLES);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback((q: string) => {
    const lq = q.toLowerCase().trim();
    if (!lq) { setResults(SUPPORT_ARTICLES); return; }
    const matchedCatIds = SUPPORT_CATEGORIES
      .filter((c) => c.title.toLowerCase().includes(lq) || c.description.toLowerCase().includes(lq))
      .map((c) => c.id);
    setResults(
      SUPPORT_ARTICLES.filter((a) =>
        a.title.toLowerCase().includes(lq) ||
        a.excerpt.toLowerCase().includes(lq) ||
        a.tags.some((t) => t.includes(lq)) ||
        matchedCatIds.includes(a.categoryId)
      )
    );
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setDropdownOpen(val.trim().length > 0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim()) {
      setSearching(true);
      timerRef.current = setTimeout(() => { runSearch(val); setSearching(false); }, 350);
    } else {
      setSearching(false);
      setResults(SUPPORT_ARTICLES);
    }
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    setDropdownOpen(true);
    setSearching(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { runSearch(tag); setSearching(false); }, 350);
    inputRef.current?.focus();
  };

  /* ── FAQ ──────────────────────────────────────────────── */
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  /* ── All systems check ────────────────────────────────── */
  const allOk = SYSTEM_STATUS.every((s) => s.status === 'operational');

  return (
    <div className="min-h-screen bg-background text-on-surface pt-20 pb-24">

      {/* ══════════════════════════════════════════════════
          § 1. HERO — search as primary deflection layer
          ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-14 md:pb-20 text-center"
        >
          {/* Status pill */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel border border-primary/20 mb-9">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-jetbrains text-[10px] text-primary/80 tracking-[0.1em] uppercase">
              {allOk ? 'All systems operational' : 'Status: checking…'}
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="font-extrabold text-[36px] md:text-[56px] leading-tight tracking-[-0.035em] text-on-surface mb-5">
            What are you trying<br className="hidden md:block" /> to figure out?
          </motion.h1>

          <motion.p variants={fadeUp} className="text-[16px] md:text-[17px] leading-[27px] text-on-surface-variant mb-10 max-w-xl mx-auto">
            Search our knowledge base — most answers are already here. If not, a real person responds within 4 hours.
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
                onFocus={() => { if (query.trim()) setDropdownOpen(true); }}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 180)}
                placeholder={`e.g. "contingency deadline", "CPA export", "approve a draw"`}
                aria-label="Search PaperWorking knowledge base"
                className="w-full h-14 pl-12 pr-12 rounded-xl glass-panel border border-white/12
                  text-[15px] text-on-surface placeholder:text-on-surface-variant/35
                  focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(87,241,219,0.10)]
                  transition-all duration-200"
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
                  ) : results.length === 0 ? (
                    <div className="px-5 py-6">
                      <p className="text-[13px] text-on-surface-variant/60 mb-2">No articles matched &ldquo;{query}&rdquo;</p>
                      <p className="text-[12px] text-on-surface-variant/40">
                        Try different keywords, or{' '}
                        <a href="mailto:support@paperworking.co" className="text-primary hover:underline">email us directly</a>.
                      </p>
                    </div>
                  ) : (
                    <ul className="p-2">
                      <li className="px-3 pb-2 pt-1">
                        <span className="font-jetbrains text-[9px] uppercase tracking-[0.1em] text-on-surface-variant/30">
                          {results.length} result{results.length !== 1 ? 's' : ''}
                        </span>
                      </li>
                      {results.slice(0, 6).map((article) => {
                        const cat = SUPPORT_CATEGORIES.find((c) => c.id === article.categoryId);
                        return (
                          <li key={article.id}>
                            <Link
                              href={`/support/${article.id}`}
                              className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group/r"
                            >
                              <span
                                className="material-symbols-outlined text-[15px] text-on-surface-variant/30 flex-shrink-0 mt-0.5 group-hover/r:text-primary transition-colors"
                                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                              >
                                article
                              </span>
                              <div className="text-left min-w-0">
                                <p className="text-[13px] font-semibold text-on-surface group-hover/r:text-primary transition-colors leading-snug">
                                  {article.title}
                                </p>
                                <p className="text-[11px] text-on-surface-variant/40 mt-0.5">
                                  {cat?.title} · {article.readTime}
                                </p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
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
                  transition-all duration-200"
              >
                {tag}
              </button>
            ))}
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
              className="pw-interactive-custom text-[13px] font-semibold text-primary/60 hover:text-primary flex items-center gap-1.5 transition-colors"
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
                      hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group"
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
                            transition-colors text-[13px] text-on-surface-variant hover:text-on-surface group/a"
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
                        className={`flex items-center gap-1.5 px-3 py-2.5 mt-1 text-[12px] font-semibold ${cat.color} hover:opacity-75 transition-opacity`}
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
                  className="pw-interactive-custom mt-auto flex items-center gap-2 text-[13px] font-semibold text-primary hover:opacity-75 transition-opacity"
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
              { icon: 'schedule', text: 'Response within 4 hours' },
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
          <motion.div variants={fadeUp} className="mb-10 text-center">
            <p className="font-jetbrains text-[10px] uppercase tracking-[0.1em] text-primary/50 mb-1.5">Before you email us</p>
            <h2 className="text-[20px] md:text-[22px] font-bold tracking-[-0.02em] text-on-surface">
              Frequently asked questions
            </h2>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-3">
            {SUPPORT_FAQS.map((faq) => {
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
                      tracking-[-0.01em] hover:text-primary transition-colors duration-200"
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
              <Link
                href="/status"
                className="pw-interactive-custom font-jetbrains text-[10px] uppercase tracking-[0.06em] text-primary/40 hover:text-primary transition-colors flex items-center gap-1"
              >
                Full status page
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </Link>
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
            <a href="https://status.paperworking.co" className="text-primary/35 hover:text-primary transition-colors">
              status.paperworking.co
            </a>
          </p>
        </motion.div>
      </section>

    </div>
  );
}
