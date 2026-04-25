'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Plus,
  Minus,
  BookOpen,
  Mail,
  Activity,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle2,
  ChevronRight,
  Search,
  Loader2,
  Briefcase,
  Calculator,
  FileSearch,
  Landmark,
  Wrench,
  TrendingUp,
  Play,
} from 'lucide-react';
import { SUPPORT_CATEGORIES, SUPPORT_ARTICLES, SUPPORT_FAQS } from '@/lib/cms/supportData';
import { submitSupportMessage } from '@/app/actions/support';

/* ═══════════════════════════════════════════════════════
   Support Page — /support  (content only)

   This component is mounted INSIDE <SupportLayout> which
   provides the header, footer, and max-w-7xl container.
   Every section here flows in a single-column vertical
   scroll architecture.

   Sections:
   1. Hero banner
   2. Quick-help resource cards
   3. Contact form
   4. FAQ accordion
   5. System status strip
   ═══════════════════════════════════════════════════════ */

/* ── Quick-help cards ── */
const RESOURCES = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Guides, tutorials, and API reference for every feature.',
    href: '/how-it-works',
    cta: 'Browse docs',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Talk to our AI assistant or a human agent in real time.',
    href: '#contact',
    cta: 'Start chat',
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Reach us at support@paperworking.co — response within 4 hrs.',
    href: 'mailto:support@paperworking.co',
    cta: 'Send email',
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    description: 'Learn how we protect your data and comply with regulations.',
    href: '/privacy',
    cta: 'Read policy',
  },
];

/* ── Entrance animation variants ── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] },
  },
};

/* ═══════════════════════════════════════════════════════ */

export default function SupportPage() {
  /* ── Search state ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(SUPPORT_ARTICLES);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const filterResults = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const results = SUPPORT_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(lowerQuery) ||
        a.excerpt.toLowerCase().includes(lowerQuery) ||
        SUPPORT_CATEGORIES.find((c) => c.id === a.categoryId)?.title.toLowerCase().includes(lowerQuery)
    );
    setSearchResults(results);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (val.trim().length > 0) {
      setIsSearching(true);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        filterResults(val);
        setIsSearching(false);
      }, 400); // small delay to simulate typing/search
    } else {
      setIsSearching(false);
      setSearchResults(SUPPORT_ARTICLES);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    setIsSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      filterResults(tag);
      setIsSearching(false);
    }, 400);
  };

  /* ── FAQ accordion state ── */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  /* ── Category cards accordion state ── */
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  /* ── Direct Engineering Support form state ── */
  const [directForm, setDirectForm] = useState({
    subject: '',
    dealId: '',
    message: '',
  });
  const [directSubmitted, setDirectSubmitted] = useState(false);
  const [directSending, setDirectSending] = useState(false);

  const handleDirectChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setDirectForm({ ...directForm, [e.target.name]: e.target.value });
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectSending(true);
    const formData = new FormData();
    formData.append('name', 'Direct Engineering Support');
    formData.append('email', 'support-ticket@paperworking.co'); // Placeholder for user email if authenticated
    formData.append('subject', `[ENG TICKET] ${directForm.subject}`);
    formData.append('message', `Deal ID/URL: ${directForm.dealId || 'N/A'}\n\n${directForm.message}`);

    try {
      await submitSupportMessage(formData);
      setDirectSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('There was an error sending your ticket. Please try again.');
    } finally {
      setDirectSending(false);
    }
  };

  /* ── Contact form state ── */
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('subject', form.subject);
    formData.append('message', form.message);

    try {
      await submitSupportMessage(formData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('There was an error sending your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════
          § 1 — Hero
          Single-column, centred, inherits max-w from layout
         ══════════════════════════════════════════════════ */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={fadeUp}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] hover:text-[var(--pw-black)] transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl tracking-tighter text-[var(--pw-black)] mb-6"
          >
            How can we help?
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-[var(--pw-subtle)] max-w-xl mx-auto leading-relaxed mb-10"
          >
            Search our knowledge base, reach out to our team, or explore common
            questions below.
          </motion.p>

          <motion.div variants={fadeUp} className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-[var(--pw-muted)]" />
            </div>
            <input
              type="text"
              aria-label="Search support documentation"
              placeholder="Search guides, SOPs, and technical documentation..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full h-16 sm:h-20 pl-14 pr-6 rounded-2xl bg-[var(--pw-surface)] border border-[var(--pw-border)] text-base sm:text-lg text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] focus:ring-1 focus:ring-[var(--pw-black)] transition-all shadow-sm"
            />
            
            {/* Search Dropdown / Loading State */}
            <AnimatePresence>
              {searchQuery.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 w-full mt-2 bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-xl shadow-lg z-50 overflow-hidden"
                >
                  {isSearching ? (
                    <div className="p-8 flex flex-col items-center justify-center text-[var(--pw-muted)]">
                      <Loader2 className="h-6 w-6 animate-spin mb-3" />
                      <span className="text-sm">Searching knowledge base...</span>
                    </div>
                  ) : (
                    <div className="p-4 text-left">
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-3 px-2">
                        Suggested Results
                      </p>
                        {searchResults.length > 0 ? (
                          searchResults.slice(0, 5).map((article) => {
                            const category = SUPPORT_CATEGORIES.find((c) => c.id === article.categoryId);
                            return (
                              <li key={article.id}>
                                <Link
                                  href={`/support/${article.id}`}
                                  className="px-2 py-3 hover:bg-[var(--pw-bg)] rounded-md cursor-pointer transition-colors flex items-center gap-3"
                                >
                                  <BookOpen className="h-4 w-4 text-[var(--pw-subtle)] shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--pw-black)]">
                                      {article.title}
                                    </p>
                                    <p className="text-xs text-[var(--pw-muted)]">
                                      {category?.title} • {article.readTime}
                                    </p>
                                  </div>
                                </Link>
                              </li>
                            );
                          })
                        ) : (
                          <li className="px-2 py-3 text-sm text-[var(--pw-muted)]">
                            No matching articles found.
                          </li>
                        )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="text-xs text-[var(--pw-muted)] uppercase tracking-wider font-semibold mr-1">
              Popular searches:
            </span>
            {['Generate LOI', 'Capital Gains Tax', 'Invite Vendor', '70% Rule Tracker'].map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="text-xs font-medium text-[var(--pw-subtle)] bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-full px-3 py-1.5 hover:bg-[var(--pw-bg)] hover:text-[var(--pw-black)] hover:border-[var(--pw-black)] transition-all"
              >
                {tag}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 1.5 — Featured Article Banner
         ══════════════════════════════════════════════════ */}
      <section className="pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
        >
          <Link
            href={`/support/${SUPPORT_ARTICLES[0].id}`}
            className="group relative block w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--pw-black)] text-white p-8 sm:p-10 lg:p-12 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            {/* Subtle background glow/texture to make it distinct */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-surface/10 border border-white/20 mb-6">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                    Featured SOP
                  </span>
                </div>
                
                <h2 className="text-3xl sm:text-4xl lg:text-5xl tracking-tighter font-medium mb-4">
                  {SUPPORT_ARTICLES[0].title}
                </h2>
                <p className="text-white/70 text-base sm:text-lg">
                  {SUPPORT_ARTICLES[0].excerpt}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Read Documentation
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </div>
            </div>
          </Link>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 1.75 — Getting Started / Platform Basics
         ══════════════════════════════════════════════════ */}
      <section className="pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-10 text-left">
            <h2 className="text-2xl sm:text-3xl tracking-tight font-semibold text-[var(--pw-black)]">
              Platform Basics
            </h2>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <Link
              href="/support/basics/account-setup"
              className="group flex flex-col justify-center p-8 bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] transition-all duration-300 hover:bg-[var(--pw-bg)] hover:border-[var(--pw-black)] hover:-translate-y-0.5"
            >
              <h3 className="text-lg font-semibold text-[var(--pw-black)] mb-3">
                Account Setup &amp; Team Invites
              </h3>
              <p className="text-sm text-[var(--pw-muted)] leading-relaxed">
                Managing admin roles, deal leaders, and security permissions.
              </p>
            </Link>

            <Link
              href="/support/basics/wiring-first-deal"
              className="group flex flex-col justify-center p-8 bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] transition-all duration-300 hover:bg-[var(--pw-bg)] hover:border-[var(--pw-black)] hover:-translate-y-0.5"
            >
              <h3 className="text-lg font-semibold text-[var(--pw-black)] mb-3">
                Wiring Your First Deal
              </h3>
              <p className="text-sm text-[var(--pw-muted)] leading-relaxed">
                How to initialize Phase 1: Acquisition and structure your capital stack.
              </p>
            </Link>

            <Link
              href="/support/basics/digital-document-vault"
              className="group flex flex-col justify-center p-8 bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] transition-all duration-300 hover:bg-[var(--pw-bg)] hover:border-[var(--pw-black)] hover:-translate-y-0.5"
            >
              <h3 className="text-lg font-semibold text-[var(--pw-black)] mb-3">
                The Digital Document Vault
              </h3>
              <p className="text-sm text-[var(--pw-muted)] leading-relaxed">
                How to securely upload files and assign strict vendor access.
              </p>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 1.85 — Browse by Deal Phase
         ══════════════════════════════════════════════════ */}
      <section className="pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-10 text-left">
            <h2 className="text-2xl sm:text-3xl tracking-tight font-semibold text-[var(--pw-black)]">
              Browse by Deal Phase
            </h2>
            <p className="text-sm text-[var(--pw-muted)] mt-2">
              Find technical documentation organized by the lifecycle of your investment.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {SUPPORT_CATEGORIES.map((phase) => {
              const isExpanded = expandedCategory === phase.id;
              const categoryArticles = SUPPORT_ARTICLES.filter((a) => a.categoryId === phase.id);

              return (
                <div
                  key={phase.id}
                  className="group flex flex-col p-6 bg-[var(--pw-surface)] shadow-sm hover:shadow-md border border-[var(--pw-border)] border-l-4 border-l-[var(--pw-black)] rounded-xl transition-all duration-300"
                >
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : phase.id)}
                    className="flex items-start gap-5 w-full text-left focus:outline-none"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[var(--pw-bg)] flex items-center justify-center shrink-0 group-hover:bg-[var(--pw-black)] transition-colors duration-300">
                      <phase.icon className="w-5 h-5 text-[var(--pw-black)] group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[var(--pw-black)] mb-1 group-hover:text-emerald-600 transition-colors">
                        {phase.title}
                      </h3>
                      <p className="text-sm text-[var(--pw-muted)] leading-snug">
                        {phase.description}
                      </p>
                    </div>
                    <div className="shrink-0 mt-1">
                      {isExpanded ? (
                        <Minus className="w-4 h-4 text-[var(--pw-muted)]" />
                      ) : (
                        <Plus className="w-4 h-4 text-[var(--pw-muted)]" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pt-6 mt-4 border-t border-[var(--pw-border)] flex flex-col gap-3">
                          {categoryArticles.length > 0 ? (
                            categoryArticles.map((article) => (
                              <Link
                                key={article.id}
                                href={`/support/${article.id}`}
                                className="flex items-center gap-3 text-sm text-[var(--pw-subtle)] hover:text-[var(--pw-black)] group/link py-1"
                              >
                                <BookOpen className="w-4 h-4 text-[var(--pw-muted)] group-hover/link:text-emerald-500 transition-colors shrink-0" />
                                <span className="flex-1">{article.title}</span>
                                <ChevronRight className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                              </Link>
                            ))
                          ) : (
                            <p className="text-sm text-[var(--pw-muted)] italic">
                              New articles coming soon.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 1.90 — Technical & API Documentation
         ══════════════════════════════════════════════════ */}
      <section className="pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-6 text-left border-b border-[var(--pw-border)] pb-4">
            <h2 className="text-xl sm:text-2xl tracking-tight font-semibold text-[var(--pw-black)]">
              Technical & API Documentation
            </h2>
            <p className="text-sm text-[var(--pw-muted)] mt-1">
              For engineers and advanced users.
            </p>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col gap-3 pl-1">
            {[
              "Stripe API Integration for Capital",
              "Supported File Types for Vault",
              "Tax Algorithm Methodology",
              "Data Export Schemas"
            ].map((doc, idx) => (
              <Link
                key={idx}
                href="#"
                className="group flex items-center gap-3 text-sm text-[var(--pw-subtle)] hover:text-[var(--pw-black)] font-medium"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--pw-muted)] group-hover:bg-emerald-500 transition-colors" />
                <span className="flex-1 underline underline-offset-4 decoration-[var(--pw-border)] group-hover:decoration-[var(--pw-black)] transition-colors">
                  {doc}
                </span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-[var(--pw-muted)]" />
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 2 — Quick-Help Resource Cards
         ══════════════════════════════════════════════════ */}
      <section className="pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {RESOURCES.map((r) => (
            <motion.div key={r.title} variants={fadeUp}>
              <Link
                href={r.href}
                className="group block bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-7 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-full bg-[var(--pw-bg)] flex items-center justify-center mb-5 group-hover:bg-[var(--pw-black)] transition-colors duration-300">
                  <r.icon className="w-5 h-5 text-[var(--pw-subtle)] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-base font-semibold text-[var(--pw-black)] mb-2">
                  {r.title}
                </h3>
                <p className="text-sm text-[var(--pw-muted)] leading-relaxed mb-4">
                  {r.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--pw-subtle)] group-hover:text-[var(--pw-black)] transition-colors">
                  {r.cta}
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 3 + § 4 — Contact Form + FAQ (side-by-side on desktop)
          Still single-column in the DOM flow; the two-col
          grid is an INTERNAL layout within this section.
         ══════════════════════════════════════════════════ */}
      <section id="contact" className="pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* ── Left: Contact Form ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--pw-muted)] mb-3"
            >
              Get in Touch
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl tracking-tighter text-[var(--pw-black)] mb-8"
            >
              Send us a message
            </motion.h2>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-10 text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-[var(--pw-black)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--pw-black)] mb-2">
                    Message received
                  </h3>
                  <p className="text-sm text-[var(--pw-muted)] mb-6">
                    We&apos;ll get back to you within 4 business hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="ag-button-secondary ag-button text-sm"
                  >
                    Send another
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  ref={formRef}
                  onSubmit={handleSubmit}
                  variants={stagger}
                  className="space-y-5"
                >
                  {/* Name */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="support-name"
                      className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2"
                    >
                      Full Name
                    </label>
                    <input
                      id="support-name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors"
                    />
                  </motion.div>

                  {/* Email */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="support-email"
                      className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2"
                    >
                      Email
                    </label>
                    <input
                      id="support-email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="jane@company.co"
                      className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors"
                    />
                  </motion.div>

                  {/* Subject */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="support-subject"
                      className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2"
                    >
                      Subject
                    </label>
                    <select
                      id="support-subject"
                      name="subject"
                      required
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] focus:outline-none focus:border-[var(--pw-black)] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled>
                        Select a topic…
                      </option>
                      <option value="billing">Billing &amp; Subscriptions</option>
                      <option value="technical">Technical Issue</option>
                      <option value="account">Account &amp; Access</option>
                      <option value="feature">Feature Request</option>
                      <option value="partnership">Partnership Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </motion.div>

                  {/* Message */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="support-message"
                      className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="support-message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Describe your issue or question…"
                      className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors resize-none"
                    />
                  </motion.div>

                  {/* Submit */}
                  <motion.div variants={fadeUp}>
                    <button
                      type="submit"
                      disabled={sending}
                      className="ag-button w-full sm:w-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending…
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send Message
                        </span>
                      )}
                    </button>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Right: FAQ Accordion ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--pw-muted)] mb-3"
            >
              Common Questions
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl tracking-tighter text-[var(--pw-black)] mb-8"
            >
              FAQ
            </motion.h2>

            <motion.div variants={stagger} className="space-y-3">
              {SUPPORT_FAQS.map((faq, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] overflow-hidden"
                >
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-[var(--pw-bg)] transition-colors cursor-pointer"
                    aria-expanded={openIndex === i}
                  >
                    <span className="text-sm font-semibold text-[var(--pw-black)] pr-4">
                      {faq.question}
                    </span>
                    <span className="shrink-0">
                      {openIndex === i ? (
                        <Minus className="w-4 h-4 text-[var(--pw-black)]" />
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
                        transition={{
                          duration: 0.3,
                          ease: [0.19, 1, 0.22, 1],
                        }}
                      >
                        <div className="px-5 pb-5 text-sm text-[var(--pw-subtle)] leading-relaxed border-t border-[var(--pw-border)] pt-4">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 4.5 — Support Fallback / Demo
         ══════════════════════════════════════════════════ */}
      <section className="pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
          className="bg-[var(--pw-bg)] rounded-3xl p-8 sm:p-12 lg:p-16 border border-[var(--pw-border)] overflow-hidden relative"
        >
          {/* Subtle background element */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-[var(--pw-surface)] border border-[var(--pw-border)] opacity-50 blur-3xl" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl sm:text-4xl tracking-tighter font-semibold text-[var(--pw-black)] mb-6">
                Direct Engineering Support
              </h2>
              <p className="text-base sm:text-lg text-[var(--pw-subtle)] leading-relaxed mb-8 max-w-md">
                Still need help? Our support team is on standby.
              </p>
              
              <AnimatePresence mode="wait">
                {directSubmitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-8 text-center"
                  >
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--pw-black)] mb-2">
                      Ticket Submitted
                    </h3>
                    <p className="text-sm text-[var(--pw-muted)] mb-6">
                      Our engineering team will review your request shortly.
                    </p>
                    <button
                      onClick={() => {
                        setDirectSubmitted(false);
                        setDirectForm({ subject: '', dealId: '', message: '' });
                      }}
                      className="ag-button-secondary text-sm"
                    >
                      Submit another ticket
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleDirectSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="direct-subject" className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2">
                        Subject
                      </label>
                      <input
                        id="direct-subject"
                        name="subject"
                        type="text"
                        required
                        value={directForm.subject}
                        onChange={handleDirectChange}
                        placeholder="E.g., Cannot access Deal #1244"
                        className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="direct-dealId" className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2">
                        Deal ID or URL <span className="text-[var(--pw-muted)] font-normal">(Optional)</span>
                      </label>
                      <input
                        id="direct-dealId"
                        name="dealId"
                        type="text"
                        value={directForm.dealId}
                        onChange={handleDirectChange}
                        placeholder="https://... or #DEAL-123"
                        className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="direct-message" className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2">
                        Message
                      </label>
                      <textarea
                        id="direct-message"
                        name="message"
                        required
                        rows={4}
                        value={directForm.message}
                        onChange={handleDirectChange}
                        placeholder="Please provide details about the issue..."
                        className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors resize-none"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={directSending}
                        className="ag-button w-full sm:w-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {directSending ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            Submit Support Ticket
                          </span>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={fadeUp} className="relative flex flex-col gap-6">
              <div>
                <h3 className="text-xl font-medium tracking-tight text-[var(--pw-black)] mb-2">Platform Walkthrough</h3>
                <p className="text-[var(--pw-muted)] text-sm">
                  Watch the full technical walkthrough. See exactly how to execute a deal from start to finish.
                </p>
              </div>

              <div 
                className="aspect-[16/9] w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-2xl overflow-hidden shadow-sm flex items-center justify-center group cursor-pointer relative"
                role="button"
                tabIndex={0}
                aria-label="Play platform walkthrough video"
              >
                {/* Play button overlay */}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors z-10 flex items-center justify-center">
                  <button 
                    className="w-16 h-16 rounded-full bg-bg-surface shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--pw-primary)] focus:ring-offset-2"
                    aria-label="Play platform walkthrough video"
                  >
                    <Play className="w-8 h-8 ml-1 text-[var(--pw-black)] fill-[var(--pw-black)]" />
                  </button>
                </div>
                
                {/* Placeholder UI pattern */}
                <div className="absolute inset-0 p-4 flex flex-col pointer-events-none">
                  <div className="h-6 w-1/3 bg-[var(--pw-border)]/50 rounded-md mb-4" />
                  <div className="flex-1 flex gap-4">
                    <div className="w-1/4 h-full bg-[var(--pw-border)]/30 rounded-md" />
                    <div className="flex-1 h-full bg-[var(--pw-border)]/20 rounded-md" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 5 — System Status Strip
         ══════════════════════════════════════════════════ */}
      <section className="pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
          className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--pw-black)]">
                All Systems Operational
              </h3>
              <p className="text-xs text-[var(--pw-muted)] mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Last checked: just now
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--pw-muted)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              API
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Dashboard
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Auth
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Storage
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
