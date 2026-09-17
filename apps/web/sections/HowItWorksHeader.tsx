import {
  howItWorksHeader,
  howItWorksSubheadline,
  reilNarrativeLead,
} from '@/lib/marketing/copy';
import { REIL_NARRATIVE_STEPS } from '@/lib/marketing/how-it-works-data';
import ReilPhaseModules from '@/components/marketing/ReilPhaseModules';
import ReilLifecycleCards from '@/components/marketing/ReilLifecycleCards';

export default function HowItWorksHeader() {
  return (
    <section id="how-it-works" className="relative border-b border-white/5 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        {/* Header content */}
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <span className="mb-4 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-semibold uppercase tracking-[0.1em] text-[#00DD94]">
            {howItWorksHeader}
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {howItWorksSubheadline}
          </h2>

          <ReilLifecycleCards />

          {/* REIL System Defining Content Block */}
          <div className="mx-auto mt-6 max-w-3xl text-left">
            <p className="mb-5 text-sm leading-[1.7] text-white/80 sm:text-base">
              {reilNarrativeLead}
            </p>
            <ul className="space-y-3.5 list-none pl-0">
              {REIL_NARRATIVE_STEPS.map((step) => (
                <li key={step.phaseNumber} className="text-sm leading-[1.65] text-white/75 sm:text-base">
                  <strong className="font-semibold text-[#00DD94]">
                    {step.label}
                  </strong>{' '}
                  <span>{step.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* REIL Phase Modules with Bulleted Activities (PROMPT 11) */}
        <ReilPhaseModules />
      </div>
    </section>
  );
}
