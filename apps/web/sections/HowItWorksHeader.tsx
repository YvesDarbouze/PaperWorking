import {
  howItWorksHeader,
  howItWorksSubheadline,
} from '@/lib/marketing/copy';
import ReilPhaseModules from '@/components/marketing/ReilPhaseModules';

export default function HowItWorksHeader() {
  return (
    <section id="how-it-works" className="relative border-b border-border bg-background py-12 md:py-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
        {/* Header content */}
        <div className="mx-auto mb-12 max-w-4xl text-center">
          <span className="mb-3 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {howItWorksHeader}
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {howItWorksSubheadline}
          </h2>
        </div>

        {/* REIL Phase Modules with Bulleted Activities */}
        <ReilPhaseModules />
      </div>
    </section>
  );
}
