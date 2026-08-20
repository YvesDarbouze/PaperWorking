import Link from 'next/link';
import type { Metadata } from 'next';
import {
  CONTACT_CHANNELS,
  POPULAR_SEARCHES,
  SUPPORT_CATEGORIES,
  SUPPORT_FAQS,
  SYSTEM_STATUS,
} from '@/lib/marketing/support-data';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Help center, FAQs, and support channels for PaperWorking investors.',
};

function StatusBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.06em]"
      style={{ borderColor: 'var(--color-outline)', color: 'var(--color-on-surface-variant)' }}
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {SYSTEM_STATUS.message}
    </span>
  );
}

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10">
      <section className="mb-16 text-center">
        <p className="pw-section-eyebrow mb-3">Support Center</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
          Answers when your deal cannot wait
        </h1>
        <p
          className="mx-auto mb-8 max-w-[52ch] text-base leading-relaxed md:text-lg"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Problem-centric guides for setup, underwriting, funding, and exit — plus direct channels when you need a human.
        </p>

        <div
          className="mx-auto mb-6 flex max-w-xl items-center rounded-full border px-5 py-3 text-sm"
          style={{ borderColor: 'var(--color-outline)', color: 'var(--color-on-surface-variant)' }}
        >
          Search the knowledge base
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {POPULAR_SEARCHES.map((term) => (
            <span
              key={term}
              className="rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: 'var(--color-outline)' }}
            >
              {term}
            </span>
          ))}
        </div>

        <StatusBadge />
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold">Browse by goal</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {SUPPORT_CATEGORIES.map((category) => (
            <article key={category.id} className="pw-card p-5">
              <h3 className="mb-1 text-lg font-semibold">{category.title}</h3>
              <p className="mb-3 text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                {category.tagline}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                {category.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold">Contact channels</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {CONTACT_CHANNELS.map((channel) => (
            <article key={channel.id} className="pw-card flex flex-col p-5">
              <p className="pw-section-eyebrow mb-2">{channel.label}</p>
              <p className="mb-1 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                {channel.tier}
              </p>
              <h3 className="mb-2 text-lg font-semibold">{channel.headline}</h3>
              <p className="mb-5 flex-1 text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                {channel.description}
              </p>
              <Link href={channel.href} className="pw-pill-cta inline-flex w-fit text-[13px]">
                Contact
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Frequently asked questions</h2>
        <div className="space-y-3">
          {SUPPORT_FAQS.map((faq) => (
            <details key={faq.id} className="pw-card px-5 py-4">
              <summary className="cursor-pointer text-base font-medium">{faq.question}</summary>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
