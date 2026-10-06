'use client';

import Link from 'next/link';
import {
  heroHeadline,
  heroSubheadline,
  heroKicker,
} from '@/lib/marketing/copy';
import { Button } from '@/components/ui/Button';
import HeroProductShowcase from './HeroProductShowcase';

export default function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden bg-background pt-2 pb-12 sm:pt-2.5 sm:pb-14 md:pt-3 md:pb-16" aria-label="Hero">
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          
          {/* Left Text Column */}
          <div className="flex flex-col items-start text-left space-y-6 max-w-[620px]">
            {/* Kicker bar */}
            <span className="inline-block text-xs font-[family-name:var(--font-jetbrains-mono)] font-medium uppercase tracking-wider text-muted-foreground">
              {heroKicker}
            </span>

            {/* Headline */}
            <h1 className="text-4xl font-medium tracking-tight text-foreground sm:text-5xl md:text-6xl leading-[1.05]">
              {heroHeadline}
            </h1>

            {/* Subheadline */}
            <h2 className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {heroSubheadline}
            </h2>

            {/* CTA row */}
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:w-auto pt-2">
              <Button
                href="/pricing"
                variant="default"
                size="default"
                className="min-h-[44px] sm:min-h-0 h-9 px-4 text-xs font-medium"
              >
                Get started
              </Button>
              <Button
                href="#deal-calculator"
                variant="outline"
                size="default"
                className="min-h-[44px] sm:min-h-0 h-9 px-4 text-xs font-medium"
              >
                See how it works
              </Button>
            </div>
          </div>

          {/* Right Visual Column */}
          <div className="relative flex justify-center lg:justify-end w-full">
            <HeroProductShowcase />
          </div>

        </div>
      </div>
    </section>
  );
}
