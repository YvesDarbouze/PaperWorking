import ReilPhaseModules from '@/components/marketing/ReilPhaseModules';

/**
 * Homepage "How It Works" section.
 *
 * Client direction (Yves): this section should show only the four REIL phase
 * cards — no kicker, headline, lifecycle prose cards, or narrative block.
 */
export default function HowItWorksHeader() {
  return (
    <section id="how-it-works" className="relative border-b border-white/5 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        <ReilPhaseModules />
      </div>
    </section>
  );
}
