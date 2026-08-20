import { REIL_PHASE_ORDER } from '@paperworking/shared';
import { REIL_PHASE_LABELS, VALUE_PROPS } from '@/lib/marketing/content';

export default function ReilPhasesSection() {
  return (
    <>
      <section className="border-y py-16" style={{ borderColor: 'var(--color-outline)' }}>
        <div className="mx-auto max-w-[1280px] px-5 md:px-10">
          <p className="pw-section-eyebrow mb-3">REIL framework</p>
          <h2 className="mb-10 max-w-[20ch] text-3xl font-semibold tracking-[-0.02em]">
            Four phases. One investor workflow.
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {REIL_PHASE_ORDER.map((phase, index) => {
              const copy = REIL_PHASE_LABELS[phase];
              return (
                <article key={phase} className="pw-card p-5">
                  <p className="pw-section-eyebrow mb-2">Phase {index + 1}</p>
                  <h3 className="mb-2 text-lg font-semibold">{copy.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {copy.summary}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-[1280px] px-5 md:px-10">
          <p className="pw-section-eyebrow mb-3">Why PaperWorking</p>
          <h2 className="mb-10 max-w-[24ch] text-3xl font-semibold tracking-[-0.02em]">
            Built for operators, not spreadsheet tourists.
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {VALUE_PROPS.map((item) => (
              <article key={item.title} className="pw-card p-5">
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
