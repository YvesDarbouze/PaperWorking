import React from 'react';

interface HowItWorksHeaderGraphicProps {
  className?: string;
}

export default function HowItWorksHeaderGraphic({ className = '' }: HowItWorksHeaderGraphicProps) {
  return (
    <div
      data-testid="how-it-works-device-showcase"
      className={`relative mx-auto w-full max-w-[1140px] pt-4 pb-10 sm:pb-14 select-none ${className}`}
    >
      {/* Ambient subtle glow beneath devices (antislop compliant - subtle neutral/primary glow) */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 sm:h-96 w-3/4 max-w-[800px] bg-foreground/[0.03] blur-[100px]"
        aria-hidden="true"
      />

      {/* Main Dual Device Stage: Desktop Display Computer + iPhone */}
      <div className="relative flex items-end justify-center">
        {/* ========================================================================= */}
        {/* DESKTOP COMPUTER DISPLAY (MacBook / Pro Display chassis) */}
        {/* ========================================================================= */}
        <div className="relative w-full max-w-[920px] rounded-t-xl sm:rounded-t-2xl border border-border bg-[#0d0a0b] p-2 sm:p-3 shadow-2xl ring-1 ring-foreground/10">
          {/* Top Bezel / Web Camera indicator */}
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="h-2 w-2 rounded-full bg-border" />
            </div>
            {/* Center camera dot */}
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            </div>
            {/* Minimal Status badge */}
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-wider text-muted-foreground">
              REIL Phase 03 · Hold
            </span>
          </div>

          {/* Desktop Screen Viewport */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md sm:rounded-lg border border-border/80 bg-background">
            <img
              src="/images/mockups/reil-hold-phase-desktop.png"
              alt="PaperWorking REIL Project Lifecycle Hold Phase desktop workspace showing live carrying burn rate, rehab progress, and deal components"
              width={1440}
              height={900}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-top"
            />
          </div>

          {/* Laptop Base Stand / Chin */}
          <div className="relative -mx-2 -mb-2 mt-2 sm:-mx-3 sm:-mb-3 sm:mt-3 flex items-center justify-center rounded-b-lg sm:rounded-b-xl border-t border-border/60 bg-[#161415] py-1.5 sm:py-2 px-4 shadow-md">
            <div className="h-1 w-16 sm:w-24 rounded-full bg-border/60" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* IPHONE DEVICE FRAME (Overlaid at bottom-right, thumb-reach responsive) */}
        {/* ========================================================================= */}
        <div className="absolute -bottom-3 sm:-bottom-5 -right-2 sm:right-4 md:right-8 z-20 w-[110px] xs:w-[140px] sm:w-[200px] md:w-[230px] transform transition-transform duration-200 hover:-translate-y-1">
          <div className="relative rounded-[22px] xs:rounded-[26px] sm:rounded-[36px] border-[2.5px] sm:border-[4px] border-[#222] bg-[#0d0a0b] p-1 sm:p-2 shadow-[0_16px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
            {/* Dynamic Island / Speaker Notch */}
            <div className="absolute left-1/2 top-1.5 sm:top-3 z-30 h-2 sm:h-3.5 w-10 sm:w-18 -translate-x-1/2 rounded-full bg-black flex items-center justify-center">
              <span className="h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full bg-muted-foreground/30 mr-1" />
            </div>

            {/* Mobile Screen Viewport */}
            <div className="relative aspect-[390/844] w-full overflow-hidden rounded-[18px] xs:rounded-[22px] sm:rounded-[30px] border border-border/60 bg-background">
              <img
                src="/images/mockups/reil-hold-phase-mobile.png"
                alt="PaperWorking mobile hold phase project workspace in iPhone display"
                width={390}
                height={844}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-top"
              />
            </div>

            {/* iPhone Bottom Home Indicator Bar */}
            <div className="absolute bottom-1.5 sm:bottom-2.5 left-1/2 z-30 h-0.5 sm:h-1 w-12 sm:w-20 -translate-x-1/2 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
