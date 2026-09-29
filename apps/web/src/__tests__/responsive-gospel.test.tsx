import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';

const { Input } = await import('../../components/ui/Input.js');
const { default: LandingHero } = await import('../../components/marketing/LandingHero.js');
const { default: DealCalculatorSection } = await import('../../sections/DealCalculatorSection.js');
const { default: MarketplaceSection } = await import('../../sections/MarketplaceSection.js');
const { default: HowItWorksHeader } = await import('../../sections/HowItWorksHeader.js');
const { default: PhaseWalkthrough } = await import('../../sections/PhaseWalkthrough.js');
const { default: LandingBelowFold } = await import('../../components/marketing/LandingBelowFold.js');
const { default: MarketplacesClient } = await import('../../components/marketing/MarketplacesClient.js');
const { default: HowItWorks } = await import('../../components/marketing/HowItWorks.js');

describe('The PaperWorking Responsive Design Gospel (Core Best Practices)', () => {
  const webDir = path.resolve(process.cwd());
  const rootDir = webDir.endsWith('apps/web') ? path.resolve(webDir, '../..') : webDir;
  const globalsCssPath = path.join(rootDir, 'apps/web/app/globals.css');
  const designMdPath = path.join(rootDir, 'DESIGN.md');
  const agentsRulePath = path.join(rootDir, '.agents/rules/paperworking.md');
  const agentsMdPath = path.join(rootDir, 'AGENTS.md');

  describe('Pillar 1: The Container Rule (Fluid Percentages + Max-Widths)', () => {
    it('enshrines the Container Rule in DESIGN.md, paperworking.md, and AGENTS.md', () => {
      const designMd = fs.readFileSync(designMdPath, 'utf8');
      const agentsRule = fs.readFileSync(agentsRulePath, 'utf8');
      const agentsMd = fs.readFileSync(agentsMdPath, 'utf8');

      expect(designMd).toContain('The Container Rule');
      expect(designMd).toContain('fluid CSS percentages');
      expect(agentsRule).toContain('The Container Rule');
      expect(agentsMd).toContain('Container Rule');
    });

    it('enforces fluid outer wrappers and max-w-[1200px] on all marketing sections', () => {
      const hero = renderToString(<LandingHero />);
      expect(hero).toContain('w-full');
      expect(hero).toContain('max-w-[1200px]');
      expect(hero).toContain('mx-auto');

      const calc = renderToString(<DealCalculatorSection />);
      expect(calc).toContain('max-w-[1200px]');
      expect(calc).toContain('mx-auto');

      const market = renderToString(<MarketplaceSection />);
      expect(market).toContain('max-w-[1200px]');
      expect(market).toContain('mx-auto');

      const how = renderToString(<HowItWorksHeader />);
      expect(how).toContain('max-w-[1200px]');
      expect(how).toContain('mx-auto');

      const phases = renderToString(<PhaseWalkthrough />);
      expect(phases).toContain('w-full');
      expect(phases).toContain('max-w-[1200px]');

      const below = renderToString(<LandingBelowFold />);
      expect(below).toContain('w-full');
      expect(below).toContain('max-w-[1200px]');
    });
  });

  describe('Pillar 2: Media Queries (Mobile-First Approach)', () => {
    it('enshrines Mobile-First Media Queries in the core directives', () => {
      const designMd = fs.readFileSync(designMdPath, 'utf8');
      expect(designMd).toContain('Media Queries (Mobile-First Approach)');
      expect(designMd).toContain('min-width');
    });

    it('uses mobile-first grid and layout progression in sections', () => {
      const hero = renderToString(<LandingHero />);
      expect(hero).toContain('grid-cols-1');
      expect(hero).toContain('lg:grid-cols-2');

      const market = renderToString(<MarketplaceSection />);
      expect(market).toContain('grid-cols-1');
      expect(market).toContain('md:grid-cols-2');
    });
  });

  describe('Pillar 3: Typography & Touch Targets (16px Inputs & 44px Hitboxes)', () => {
    it('Input component applies 16px text-base and 44px min-height on mobile screens', () => {
      const inputHtml = renderToString(<Input placeholder="Search..." />);
      expect(inputHtml).toContain('h-11');
      expect(inputHtml).toContain('min-h-[44px]');
      expect(inputHtml).toContain('md:h-8');
      expect(inputHtml).toContain('md:min-h-0');
      expect(inputHtml).toContain('text-base');
      expect(inputHtml).toContain('md:text-xs');
    });

    it('globals.css enforces global font-size: 16px !important on mobile inputs to eliminate iOS auto-zoom', () => {
      const cssContent = fs.readFileSync(globalsCssPath, 'utf8');
      expect(cssContent).toMatch(/@media\s*\(max-width:\s*767px\)/);
      expect(cssContent).toContain('font-size: 16px !important;');
      expect(cssContent).toContain('.touch-target');
      expect(cssContent).toContain('min-height: 44px;');
    });

    it('marketing body copy utilizes 16px-18px readable typography', () => {
      const calc = renderToString(<DealCalculatorSection />);
      expect(calc).toContain('text-base');
      expect(calc).toContain('sm:text-lg');

      const below = renderToString(<LandingBelowFold />);
      expect(below).toContain('text-base');
      expect(below).toContain('sm:text-lg');
    });
  });

  describe('Pillar 4: Standard Frame Centering & Anti-Slop Integrity', () => {
    it('keeps core text and content centered inside max-w-[1200px]', () => {
      const hero = renderToString(<LandingHero />);
      expect(hero).toContain('max-w-[1200px]');
      expect(hero).toContain('px-4 sm:px-6 md:px-8');
    });

    it('strictly forbids legacy neon emerald #00DD94 across marketing sections', () => {
      const how = renderToString(<HowItWorksHeader />);
      expect(how).not.toContain('#00DD94');

      const calc = renderToString(<DealCalculatorSection />);
      expect(calc).not.toContain('#00DD94');

      const market = renderToString(<MarketplaceSection />);
      expect(market).not.toContain('#00DD94');
    });
  });

  describe('Pillar 5: Standardized Top & Horizontal Padding (Above-the-Fold & No Double Gutters)', () => {
    it('enforces MarketplacesClient fluid container, standard horizontal gutters, and removes dead vertical space', () => {
      const html = renderToString(<MarketplacesClient />);
      expect(html).toContain('max-w-[1200px]');
      expect(html).toContain('px-4 sm:px-6 md:px-8');
      expect(html).toContain('pt-8');
      expect(html).toContain('md:pt-12');
      // Must not contain excessive vertical push that shoves content below the fold
      expect(html).not.toContain('min-h-[60vh]');
      expect(html).not.toContain('justify-center px-4 py-6 md:py-10');
    });

    it('enforces HowItWorks above-the-fold top padding and standard gutters', () => {
      const html = renderToString(<HowItWorks />);
      expect(html).toContain('max-w-[1200px]');
      expect(html).toContain('px-4 sm:px-6 md:px-8');
      expect(html).toContain('pt-8');
      expect(html).toContain('md:pt-12');
      expect(html).not.toContain('py-14 md:py-20');
    });

    it('enforces LandingHero above-the-fold top padding and standard gutters', () => {
      const html = renderToString(<LandingHero />);
      expect(html).toContain('max-w-[1200px]');
      expect(html).toContain('px-4 sm:px-6 md:px-8');
      expect(html).toContain('pt-8');
      expect(html).toContain('md:pt-12');
      expect(html).not.toContain('py-14 md:py-20');
    });
  });
});
