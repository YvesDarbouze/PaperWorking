'use client';

import DeviceMockup from '@/components/marketing/DeviceMockup';

export default function DealCalculatorSection() {
  return (
    <section
      id="deal-calculator"
      className="relative overflow-hidden bg-[#0a0a0f] border-b border-white/5 py-16 md:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text Column (Left on Desktop) */}
          <div className="flex flex-col items-start space-y-5 text-left">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-primary)]">
              DEAL CALCULATOR
            </span>
            <h2 className="text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl md:text-5xl">
              Analyze deals with professional precision.
            </h2>
            <p className="text-[16px] leading-[1.7] text-white/60 sm:text-lg">
              Before deciding to make a major acquisition, spending thousands, even millions of dollars on an
              investment, use the PaperWorking integrated &ldquo;Deal Calculator&rdquo; to calculate the
              critical numbers real estate investors need to make critical decisions on a new investment.
            </p>
          </div>

          {/* Visual Column (Right on Desktop) */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Subtle primary color glow */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/5 blur-[80px]"
              aria-hidden
            />
            <DeviceMockup variant="silver" className="relative z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
