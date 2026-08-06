'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Minus, Search, BookOpen, ChevronRight,
} from 'lucide-react';
import { FAQ_ITEMS, FAQ_CATEGORIES, type FAQCategory } from '@/lib/cms/faqData';

/* ═══════════════════════════════════════════════════════
   /support/faq — Dedicated FAQ Page
   
   Features:
   • Category filter tabs (reads ?category= from URL)
   • Search bar with instant filtering
   • Collapsible accordion sections
   • FAQPage JSON-LD structured data
   ═══════════════════════════════════════════════════════ */

const VALID_CATEGORIES = new Set<string>(FAQ_CATEGORIES.map((c) => c.id));

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export default function FAQPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams?.get('category');
  const defaultCategory: FAQCategory | 'all' =
    initialCategory && VALID_CATEGORIES.has(initialCategory)
      ? (initialCategory as FAQCategory)
      : 'all';

  const [activeCategory, setActiveCategory] = useState<FAQCategory | 'all'>(defaultCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0); // first FAQ open by default

  const filteredFAQs = useMemo(() => {
    let items = FAQ_ITEMS;
    if (activeCategory !== 'all') {
      items = items.filter((f) => f.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activeCategory, searchQuery]);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  // FAQPage JSON-LD structured data for SEO
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

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

          <motion.h1 variants={fadeUp} className="tracking-tighter text-[var(--pw-fg)] mb-4 type-display font-semibold" style={{ color: 'var(--pw-fg)' }}>
            Frequently Asked Questions
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base sm:text-lg text-[var(--pw-subtle)] max-w-xl mx-auto leading-relaxed mb-10">
            Everything you need to know about PaperWorking — from getting started to advanced financial reporting.
          </motion.p>

          {/* Search */}
          <motion.div variants={fadeUp} className="relative max-w-md mx-auto mb-8">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--pw-subtle)]" />
            </div>
            <input
              type="text"
              aria-label="Search FAQs"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null); }}
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
              onClick={() => { setActiveCategory('all'); setOpenIndex(null); }}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                activeCategory === 'all'
                  ? 'border-[var(--pw-fg)] text-[var(--pw-fg)]'
                  : 'border-[var(--pw-border)] text-[var(--pw-muted)] hover:border-[var(--pw-subtle)] hover:text-[var(--pw-subtle)]'
              }`}
              style={activeCategory === 'all' ? { backgroundColor: 'var(--pw-fg)', color: 'var(--pw-bg)' } : {}}
            >
              All ({FAQ_ITEMS.length})
            </button>
            {FAQ_CATEGORIES.map((cat) => {
              const count = FAQ_ITEMS.filter((f) => f.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
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

      {/* ── FAQ Accordion ── */}
      <section className="pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={stagger}
          className="max-w-3xl mx-auto"
        >
          {filteredFAQs.length === 0 ? (
            <motion.div variants={fadeUp} className="text-center py-16">
              <p className="text-[var(--pw-muted)] text-sm">No matching questions found.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="mt-4 text-xs font-bold uppercase tracking-widest text-[var(--pw-subtle)] hover:text-[var(--pw-fg)] transition-colors"
              >
                Clear filters
              </button>
            </motion.div>
          ) : (
            <motion.div variants={stagger} className="space-y-3">
              {filteredFAQs.map((faq, i) => {
                const catLabel = FAQ_CATEGORIES.find((c) => c.id === faq.category)?.label;
                return (
                  <motion.div
                    key={`${faq.category}-${i}`}
                    variants={fadeUp}
                    className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] overflow-hidden"
                  >
                    <button
                      onClick={() => toggle(i)}
                      className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-[var(--pw-bg)] transition-colors cursor-pointer"
                      aria-expanded={openIndex === i}
                    >
                      <div className="flex-1 pr-4">
                        <h3 className="text-sm font-semibold text-[var(--pw-fg)]">
                          {faq.question}
                        </h3>
                        {activeCategory === 'all' && catLabel && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--pw-muted)] mt-1 block">
                            {catLabel}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0">
                        {openIndex === i ? (
                          <Minus className="w-4 h-4 text-[var(--pw-fg)]" />
                        ) : (
                          <Plus className="w-4 h-4 text-[var(--pw-muted)]" />
                        )}
                      </span>
                    </button>
                    <AnimatePresence>
                      {openIndex === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                        >
                          <div className="px-5 pb-5 text-sm text-[var(--pw-subtle)] leading-relaxed border-t border-[var(--pw-border)] pt-4">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ── Still need help? ── */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-[var(--radius-lg)] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{ backgroundColor: '#0d0d0d', color: '#ffffff' }}
          >
            <div>
              <h3 className="text-lg font-semibold mb-1">Still have questions?</h3>
              <p className="text-sm text-white/70">
                Our support team responds within 4 hours.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/support/glossary"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Glossary
              </Link>
              <Link
                href="mailto:support@paperworking.co"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/90 transition-colors"
              >
                Contact Us
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
