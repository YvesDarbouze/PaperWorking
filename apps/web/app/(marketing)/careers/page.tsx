import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers | PaperWorking',
  description:
    'Join the team building the deal-intelligence platform for modern real estate investors.',
  robots: { index: false, follow: false },
};

const CULTURE_VALUES = [
  {
    title: 'Outcome over output',
    body: 'We measure success by investor results — fewer missed deadlines, faster closings, less money leaked to holding costs.',
  },
  {
    title: 'Small team, full ownership',
    body: 'Everyone touches product, talks to users, and ships to production. No spectators.',
  },
  {
    title: 'Remote-first, async-default',
    body: 'We write things down, respect deep work, and keep meetings to the minimum required for alignment.',
  },
] as const;

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-10">
      <p className="pw-section-eyebrow mb-3">Careers</p>
      <h1 className="mb-6 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
        Build something investors rely on.
      </h1>
      <p
        className="mb-12 max-w-2xl text-base leading-relaxed"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        PaperWorking is a small, focused team solving a real problem: the operational chaos that costs
        real estate investors time and money on every deal. We&apos;re looking for people who ship fast,
        care about craft, and want their work to matter.
      </p>

      <section className="pw-card mb-8 p-6 md:p-8">
        <h2 className="pw-section-eyebrow mb-6">How We Work</h2>
        <ul className="space-y-6">
          {CULTURE_VALUES.map((value) => (
            <li key={value.title}>
              <h3 className="mb-1 text-base font-semibold">{value.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                {value.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pw-card p-6 text-center md:p-8">
        <h2 className="mb-3 text-xl font-semibold tracking-[-0.02em]">
          No open roles right now — but we&apos;re always listening.
        </h2>
        <p
          className="mx-auto mb-6 max-w-md text-sm leading-relaxed"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          If you&apos;re an engineer, designer, or domain expert in real estate finance and think you can
          contribute, reach out directly.
        </p>
        <a href="mailto:careers@paperworking.co" className="pw-pill-cta inline-flex">
          careers@paperworking.co
        </a>
      </section>
    </div>
  );
}
