import type { Metadata } from 'next';
import { HOW_IT_WORKS_HIGHLIGHTS, HOW_IT_WORKS_STEPS } from '@/lib/marketing/how-it-works-data';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'PaperWorking REIL lifecycle — Acquisition, Fund, Hold, and Exit in one platform.',
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10">
      <section className="mb-12 text-center">
        <p className="pw-section-eyebrow mb-3">How it works</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
          The real estate investment operating system
        </h1>
        <p
          className="mx-auto max-w-[52ch] text-base leading-relaxed md:text-lg"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Manage every phase of a deal with canonical metrics, role-aware portals, and audit-ready exports.
        </p>
      </section>

      <section className="mb-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <article key={step.phase} className="pw-card p-5">
            <p className="pw-section-eyebrow mb-2">Step {step.step}</p>
            <h2 className="mb-2 text-xl font-semibold">{step.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              {step.summary}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {HOW_IT_WORKS_HIGHLIGHTS.map((item) => (
          <article key={item.title} className="pw-card p-5">
            <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              {item.description}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
