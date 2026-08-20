import Link from 'next/link';
import { HERO_CONTENT } from '@/lib/marketing/content';

export default function HeroSection() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 pb-20 pt-16 md:px-10 md:pt-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="pw-section-eyebrow mb-4">{HERO_CONTENT.eyebrow}</p>
          <h1 className="mb-5 max-w-[14ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] md:text-5xl">
            {HERO_CONTENT.headline}
          </h1>
          <p
            className="mb-8 max-w-[52ch] text-base leading-relaxed md:text-lg"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            {HERO_CONTENT.subheadline}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={HERO_CONTENT.primaryCta.href} className="pw-pill-cta">
              {HERO_CONTENT.primaryCta.label}
            </Link>
            <Link
              href={HERO_CONTENT.secondaryCta.href}
              className="inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold no-underline"
              style={{
                borderColor: 'var(--color-outline)',
                color: 'var(--color-on-surface)',
              }}
            >
              {HERO_CONTENT.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className="pw-card p-6">
          <p className="pw-section-eyebrow mb-3">Deal preview</p>
          <p className="mb-1 text-sm font-semibold">1247 Elm Street, Austin TX</p>
          <p className="mb-6 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
            Demo data — migration preview
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Purchase Price', value: '$485,000' },
              { label: 'After Repair Value', value: '$620,000' },
              { label: 'Projected IRR', value: '18.4%' },
              { label: 'Equity Multiple', value: '1.62×' },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border px-4 py-3"
                style={{ borderColor: 'var(--color-outline)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.06em]" style={{ color: 'var(--color-on-surface-variant)' }}>
                  {metric.label}
                </p>
                <p className="mt-1 text-lg font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
