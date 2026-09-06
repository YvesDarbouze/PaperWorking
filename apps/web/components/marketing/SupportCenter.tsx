'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import SupportResourceSelects from '@/components/marketing/SupportResourceSelects';
import {
  POPULAR_SEARCHES,
  SUPPORT_ARTICLES,
  SUPPORT_CATEGORIES,
  SUPPORT_FAQS,
  SYSTEM_STATUS,
} from '@/lib/marketing/support-cms-data';

const CONTACT_CHANNELS = [
  {
    icon: 'mail',
    label: 'Email Support',
    tier: 'All plans',
    headline: 'hi@paperworking.co',
    description:
      'A real person answers every message. Send your deal details and we jump straight to the issue.',
    cta: 'Send an email',
    href: 'mailto:hi@paperworking.co',
  },
  {
    icon: 'chat',
    label: 'Live Chat',
    tier: 'Investor & Team',
    headline: 'Talk to a real person',
    description:
      'Investor and Investment Team accounts get live chat — response in under 30 minutes during business hours.',
    cta: 'Start chat',
    href: '#chat',
  },
  {
    icon: 'star',
    label: 'Priority Support',
    tier: 'Investment Team only',
    headline: "Dedicated line — deals don't wait",
    description:
      "Investment Team accounts get a direct line. If you're mid-closing and something breaks, we pick up.",
    cta: 'Access priority support',
    href: '/contact',
  },
] as const;

function categoryColor(color: string): string {
  if (color.includes('secondary')) return 'text-sky-400';
  if (color.includes('tertiary')) return 'text-amber-400';
  return 'text-[color:var(--color-primary)]';
}

const POPULAR_ARTICLES = SUPPORT_ARTICLES.filter((a) => a.popular).slice(0, 6);

/** Ported from PaperWorking `/support` Support Hub (without framer-motion). */
export default function SupportCenter() {
  const [query, setQuery] = useState('');
  const [faqFilter, setFaqFilter] = useState('');

  const allOk = SYSTEM_STATUS.every((s) => s.status === 'operational');

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const articleHits = SUPPORT_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)),
    ).map((a) => ({
      id: a.id,
      title: a.title,
      snippet: a.excerpt,
      href: `/help`,
      kind: 'article' as const,
    }));
    const faqHits = SUPPORT_FAQS.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    ).map((f) => ({
      id: f.id,
      title: f.question,
      snippet: f.answer,
      href: `#faq-${f.id}`,
      kind: 'faq' as const,
    }));
    return [...articleHits, ...faqHits].slice(0, 8);
  }, [query]);

  const filteredFaqs = useMemo(() => {
    const lf = faqFilter.trim().toLowerCase();
    if (!lf) return SUPPORT_FAQS;
    return SUPPORT_FAQS.filter(
      (f) => f.question.toLowerCase().includes(lf) || f.answer.toLowerCase().includes(lf),
    );
  }, [faqFilter]);

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[color:var(--color-primary)]/5 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-3xl px-5 pb-10 pt-10 text-center md:px-8 md:pb-14 md:pt-14">
          <div className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-[color:var(--color-primary)]/20 bg-white/[0.04] px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-primary)]/80">
              {allOk ? 'All systems operational' : 'Status: checking…'}
            </span>
          </div>

          <h1 className="landing-display mb-5 font-semibold leading-[1.05] tracking-[-0.025em] text-white">
            What are you trying
            <br className="hidden md:block" /> to figure out?
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-[16px] leading-[27px] text-white/65 md:text-[17px]">
            Search our knowledge base — most answers are already here. If not, a real person answers
            every message.
          </p>

          <div className="relative mx-auto max-w-2xl">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 z-10 text-[20px] text-white/40">
                search
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`e.g. "contingency deadline", "CPA export", "approve a draw"`}
                aria-label="Search PaperWorking knowledge base"
                className="glass-card h-14 min-h-[44px] w-full rounded-xl border border-white/12 bg-white/[0.04] pl-12 pr-4 text-[15px] text-white placeholder:text-white/35 focus:border-[color:var(--color-primary)]/40 focus:outline-none"
              />
            </div>

            {query.trim() ? (
              <div className="glass-card absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/12 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                {searchHits.length === 0 ? (
                  <div className="px-5 py-6 text-left text-[13px] leading-relaxed text-white/60">
                    No matches in the knowledge base. Email{' '}
                    <a
                      href="mailto:hi@paperworking.co"
                      className="font-semibold text-[color:var(--color-primary)] hover:underline"
                    >
                      hi@paperworking.co
                    </a>{' '}
                    — a real person answers every message.
                  </div>
                ) : (
                  <ul className="space-y-1 p-2">
                    {searchHits.map((hit) => (
                      <li key={hit.id}>
                        <Link
                          href={hit.href}
                          className="flex items-start gap-3 rounded-lg px-3 py-3 no-underline transition-colors hover:bg-white/5"
                        >
                          <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-[color:var(--color-primary)]">
                            {hit.kind === 'faq' ? 'help' : 'article'}
                          </span>
                          <div className="min-w-0 text-left">
                            <p className="mb-0.5 truncate text-[13px] font-semibold text-white">
                              {hit.title}
                            </p>
                            <p className="line-clamp-2 text-[12px] leading-normal text-white/50">
                              {hit.snippet}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.08em] text-white/35">
              Common searches:
            </span>
            {POPULAR_SEARCHES.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="min-h-[44px] cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/60 transition-all hover:border-[color:var(--color-primary)]/30 hover:text-[color:var(--color-primary)]"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pb-12 md:px-8">
        <div className="mb-6">
          <p className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-primary)]/50">
            Reference libraries
          </p>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-white md:text-[22px]">
            Glossary &amp; metrics playbook
          </h2>
        </div>
        <SupportResourceSelects />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/support/glossary"
            className="glass-card group flex min-h-[44px] items-center gap-5 rounded-xl border border-white/[0.08] p-5 no-underline transition-all hover:border-[color:var(--color-primary)]/20"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[24px] text-[color:var(--color-primary)]">
                book_2
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-[15px] font-bold leading-snug text-white group-hover:text-[color:var(--color-primary)]">
                Real Estate Glossary
              </h3>
              <p className="text-[12px] leading-normal text-white/50">
                Demystify industry terminology from ARV to Cap Rate.
              </p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-white/20 group-hover:text-[color:var(--color-primary)]">
              arrow_forward
            </span>
          </Link>

          <Link
            href="/support/metrics"
            className="glass-card group flex min-h-[44px] items-center gap-5 rounded-xl border border-white/[0.08] p-5 no-underline transition-all hover:border-[color:var(--color-primary)]/20"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[24px] text-[color:var(--color-primary)]">
                monitoring
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-[15px] font-bold leading-snug text-white group-hover:text-[color:var(--color-primary)]">
                The Playbook (33 Metrics)
              </h3>
              <p className="text-[12px] leading-normal text-white/50">
                Executive guide to the 33 metrics tracked automatically by PaperWorking.
              </p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-white/20 group-hover:text-[color:var(--color-primary)]">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pb-16 md:px-8 md:pb-20">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-primary)]/50">
              Most searched
            </p>
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-white md:text-[22px]">
              Popular articles
            </h2>
          </div>
          <Link
            href="/help"
            className="flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-[color:var(--color-primary)]/60 no-underline hover:text-[color:var(--color-primary)]"
          >
            Browse all
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {POPULAR_ARTICLES.map((article) => {
            const cat = SUPPORT_CATEGORIES.find((c) => c.id === article.categoryId);
            return (
              <Link
                key={article.id}
                href="/help"
                className="glass-card group flex min-h-[44px] items-start gap-4 rounded-xl border border-white/[0.08] p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-[color:var(--color-primary)]/20"
              >
                <span
                  className={`material-symbols-outlined mt-0.5 shrink-0 text-[20px] ${categoryColor(cat?.color ?? '')}`}
                >
                  {cat?.icon ?? 'article'}
                </span>
                <div className="min-w-0">
                  <p className="mb-1 text-[13px] font-semibold leading-snug text-white group-hover:text-[color:var(--color-primary)]">
                    {article.title}
                  </p>
                  <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-wide text-white/35">
                    {article.readTime}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pb-16 md:px-8 md:pb-20">
        <div className="mb-10">
          <p className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-primary)]/50">
            Knowledge base
          </p>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-white md:text-[22px]">
            Find answers by what you&apos;re trying to do
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SUPPORT_CATEGORIES.map((cat) => {
            const catArticles = SUPPORT_ARTICLES.filter((a) => a.categoryId === cat.id).slice(0, 4);
            return (
              <div
                key={cat.id}
                className="glass-card group overflow-hidden rounded-xl border border-white/[0.08] transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="border-b border-white/[0.08] p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                      <span
                        className={`material-symbols-outlined text-[20px] ${categoryColor(cat.color)}`}
                      >
                        {cat.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="mb-1 text-[15px] font-bold leading-snug tracking-[-0.01em] text-white">
                        {cat.title}
                      </h3>
                      <p className="text-[12px] leading-snug text-white/55">{cat.tagline}</p>
                    </div>
                  </div>
                </div>
                <ul className="space-y-0.5 p-4">
                  {catArticles.map((a) => (
                    <li key={a.id}>
                      <Link
                        href="/help"
                        className="group/a flex min-h-[44px] items-start gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-white/60 no-underline transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[14px] text-white/25 group-hover/a:text-[color:var(--color-primary)]">
                          chevron_right
                        </span>
                        <span className="leading-snug">{a.title}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/help"
                      className={`flex min-h-[44px] items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold no-underline ${categoryColor(cat.color)} hover:opacity-75`}
                    >
                      See all {cat.articleCount} articles
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pb-16 md:px-8 md:pb-20">
        <div className="mb-10">
          <p className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-primary)]/50">
            Can&apos;t find the answer?
          </p>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-white md:text-[22px]">
            Talk to a person
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CONTACT_CHANNELS.map((ch) => (
            <div
              key={ch.label}
              className="glass-card flex flex-col gap-5 rounded-xl border border-white/[0.08] p-7"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
                  <span className="material-symbols-outlined text-[20px] text-[color:var(--color-primary)]">
                    {ch.icon}
                  </span>
                </div>
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.06em] text-white/45">
                  {ch.tier}
                </span>
              </div>
              <div>
                <p className="mb-1 text-[12px] font-semibold text-white/50">{ch.label}</p>
                <h3 className="mb-2 text-lg font-semibold text-white">{ch.headline}</h3>
                <p className="text-sm leading-relaxed text-white/60">{ch.description}</p>
              </div>
              <Link
                href={ch.href}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[13px] font-semibold text-white no-underline hover:border-[color:var(--color-primary)]/40 hover:text-[color:var(--color-primary)]"
              >
                {ch.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pb-8 md:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-primary)]/50">
              FAQ
            </p>
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-white md:text-[22px]">
              Frequently asked questions
            </h2>
          </div>
          <input
            type="text"
            value={faqFilter}
            onChange={(e) => setFaqFilter(e.target.value)}
            placeholder="Filter FAQs…"
            className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/35 focus:border-[color:var(--color-primary)]/40 focus:outline-none sm:w-64"
          />
        </div>

        <div className="space-y-3">
          {filteredFaqs.map((faq) => (
            <details
              key={faq.id}
              id={`faq-${faq.id}`}
              className="glass-card rounded-xl border border-white/[0.08] px-5 py-4"
            >
              <summary className="cursor-pointer text-base font-medium text-white">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
