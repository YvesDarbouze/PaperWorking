import Link from 'next/link';
import type { Metadata } from 'next';
import { PRICING_FAQ, PRICING_PLANS } from '@/lib/marketing/pricing-data';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'PaperWorking plans for investors, teams, and vendors. All plans include a 14-day trial.',
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10">
      <section className="mb-12 text-center">
        <p className="pw-section-eyebrow mb-3">Pricing</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
          Priced against the mistakes it is built to catch
        </h1>
        <p
          className="mx-auto max-w-[52ch] text-base leading-relaxed md:text-lg"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Migration preview pricing aligned with Stripe plan catalog. Checkout wiring uses mock sandbox until cutover.
        </p>
      </section>

      <section className="mb-16 grid gap-6 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <article
            key={plan.id}
            className="pw-card flex flex-col p-6"
            style={plan.highlighted ? { outline: '2px solid var(--color-primary)' } : undefined}
          >
            <p className="pw-section-eyebrow mb-2">{plan.name}</p>
            <p className="mb-1 text-3xl font-semibold">
              ${plan.monthlyPrice}
              <span className="text-base font-normal" style={{ color: 'var(--color-on-surface-variant)' }}>
                /mo
              </span>
            </p>
            <p className="mb-4 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
              or ${plan.annualPrice}/yr billed annually
            </p>
            <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              {plan.summary}
            </p>
            <ul className="mb-6 flex-1 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <Link href={plan.ctaHref} className="pw-pill-cta inline-flex w-fit">
              Start 14-day trial
            </Link>
          </article>
        ))}
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Pricing FAQ</h2>
        <div className="space-y-3">
          {PRICING_FAQ.map((faq) => (
            <details key={faq.question} className="pw-card px-5 py-4">
              <summary className="cursor-pointer font-medium">{faq.question}</summary>
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
