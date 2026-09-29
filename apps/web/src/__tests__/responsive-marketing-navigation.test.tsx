import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';

const mockPush = jest.fn();
const mockFetchSessionProfile = jest.fn<() => Promise<{ authenticated: boolean }>>();

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  fetchSessionProfile: mockFetchSessionProfile,
  destroySession: jest.fn(),
}));

const { default: MarketingHeader } = await import('../../components/marketing/MarketingHeader.js');
const { default: LandingHero } = await import('../../components/marketing/LandingHero.js');
const { default: DealCalculatorSection } = await import('../../sections/DealCalculatorSection.js');
const { default: MarketplaceSection } = await import('../../sections/MarketplaceSection.js');
const { default: HowItWorksHeader } = await import('../../sections/HowItWorksHeader.js');
const { default: PhaseWalkthrough } = await import('../../sections/PhaseWalkthrough.js');
const { default: LandingBelowFold } = await import('../../components/marketing/LandingBelowFold.js');
const { default: HowItWorks } = await import('../../components/marketing/HowItWorks.js');
const { default: PricingSection } = await import('../../components/marketing/PricingSection.js');
const { default: PermissionsSection } = await import('../../sections/PermissionsSection.js');
const { default: NetworkSection } = await import('../../sections/NetworkSection.js');
const { default: MarketplacesClient } = await import('../../components/marketing/MarketplacesClient.js');

describe('Responsive Marketing Architecture & Navigation Verification', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockResolvedValue({ authenticated: false });
  });

  describe('1. Top Navigation & Dedicated Page Routing', () => {
    it('renders the 5 top nav buttons in exact specified order with dedicated page URLs', () => {
      const headerHtml = renderToString(<MarketingHeader />);

      // Verify labels exist
      const howItWorksIndex = headerHtml.indexOf('How It Works');
      const pricingIndex = headerHtml.indexOf('Pricing');
      const marketplaceIndex = headerHtml.indexOf('Marketplace');
      const supportIndex = headerHtml.indexOf('Support');
      const dealCalcIndex = headerHtml.indexOf('Deal Calculator');

      expect(howItWorksIndex).toBeGreaterThan(-1);
      expect(pricingIndex).toBeGreaterThan(-1);
      expect(marketplaceIndex).toBeGreaterThan(-1);
      expect(supportIndex).toBeGreaterThan(-1);
      expect(dealCalcIndex).toBeGreaterThan(-1);

      // Verify strict sequential ordering
      expect(howItWorksIndex).toBeLessThan(pricingIndex);
      expect(pricingIndex).toBeLessThan(marketplaceIndex);
      expect(marketplaceIndex).toBeLessThan(supportIndex);
      expect(supportIndex).toBeLessThan(dealCalcIndex);

      // Verify dedicated page routing for all 5 nav buttons
      expect(headerHtml).toContain('href="/how-it-works"');
      expect(headerHtml).toContain('href="/pricing"');
      expect(headerHtml).toContain('href="/marketplaces"');
      expect(headerHtml).toContain('href="/support"');
      expect(headerHtml).toContain('href="/deal-calculator"');

      // Ensure hash anchors are not used for primary destinations
      expect(headerHtml).not.toContain('href="/#how-it-works"');
      expect(headerHtml).not.toContain('href="/#marketplace"');
    });

    it('enforces 1140px-1200px centered max-width container on MarketingHeader', () => {
      const headerHtml = renderToString(<MarketingHeader />);
      expect(headerHtml).toContain('max-w-[1200px]');
      expect(headerHtml).toContain('mx-auto');
    });
  });

  describe('2. Desktop Container Sizing & Symmetry (1140px to 1200px)', () => {
    it('constrains LandingHero inside max-w-[1200px] with symmetric padding', () => {
      const heroHtml = renderToString(<LandingHero />);
      expect(heroHtml).toContain('max-w-[1200px]');
      expect(heroHtml).toContain('mx-auto');
      expect(heroHtml).toContain('pt-8 pb-12 sm:pt-10 sm:pb-14 md:pt-12 md:pb-16');
      expect(heroHtml).toContain('px-4 sm:px-6 md:px-8');
    });

    it('constrains DealCalculatorSection inside max-w-[1200px] with symmetric padding', () => {
      const sectionHtml = renderToString(<DealCalculatorSection />);
      expect(sectionHtml).toContain('max-w-[1200px]');
      expect(sectionHtml).toContain('mx-auto');
      expect(sectionHtml).toContain('py-12 md:py-16');
      expect(sectionHtml).toContain('px-4 sm:px-6 md:px-8');
    });

    it('constrains MarketplaceSection inside max-w-[1200px] with symmetric padding', () => {
      const sectionHtml = renderToString(<MarketplaceSection />);
      expect(sectionHtml).toContain('max-w-[1200px]');
      expect(sectionHtml).toContain('mx-auto');
      expect(sectionHtml).toContain('py-12 md:py-16');
      expect(sectionHtml).toContain('px-4 sm:px-6 md:px-8');
    });

    it('constrains HowItWorksHeader inside max-w-[1200px] with symmetric padding', () => {
      const sectionHtml = renderToString(<HowItWorksHeader />);
      expect(sectionHtml).toContain('max-w-[1200px]');
      expect(sectionHtml).toContain('mx-auto');
      expect(sectionHtml).toContain('py-12 md:py-16');
      expect(sectionHtml).toContain('px-4 sm:px-6 md:px-8');
    });

    it('constrains PhaseWalkthrough sections inside max-w-[1200px] with symmetric padding', () => {
      const walkthroughHtml = renderToString(<PhaseWalkthrough />);
      expect(walkthroughHtml).toContain('max-w-[1200px]');
      expect(walkthroughHtml).toContain('py-12 md:py-16');
      expect(walkthroughHtml).not.toContain('max-w-[1280px]');
    });

    it('constrains LandingBelowFold inside max-w-[1200px] with symmetric padding', () => {
      const belowFoldHtml = renderToString(<LandingBelowFold />);
      expect(belowFoldHtml).toContain('max-w-[1200px]');
      expect(belowFoldHtml).toContain('py-12 md:py-16');
      expect(belowFoldHtml).not.toContain('max-w-[1280px]');
    });

    it('constrains dedicated /how-it-works page inside max-w-[1200px] with symmetric padding', () => {
      const howItWorksHtml = renderToString(<HowItWorks />);
      expect(howItWorksHtml).toContain('max-w-[1200px]');
      expect(howItWorksHtml).toContain('pt-8 pb-12 sm:pt-10 sm:pb-14 md:pt-12 md:pb-16');
      expect(howItWorksHtml).not.toContain('max-w-[1280px]');
    });

    it('constrains PricingSection and governance sections inside max-w-[1200px]', () => {
      const pricingHtml = renderToString(<PricingSection />);
      expect(pricingHtml).toContain('max-w-[1200px]');

      const permHtml = renderToString(<PermissionsSection />);
      expect(permHtml).toContain('max-w-[1200px]');
      expect(permHtml).toContain('py-12 md:py-16');

      const netHtml = renderToString(<NetworkSection />);
      expect(netHtml).toContain('max-w-[1200px]');
      expect(netHtml).toContain('py-12 md:py-16');
    });

    it('constrains MarketplacesClient inside max-w-[1200px]', () => {
      const clientHtml = renderToString(<MarketplacesClient />);
      expect(clientHtml).toContain('max-w-[1200px]');
    });
  });

  describe('3. Mobile & Tablet Responsiveness', () => {
    it('supports 360px-480px mobile viewports with minimum 40-44px touch targets and stacked grids', () => {
      const headerHtml = renderToString(<MarketingHeader />);
      expect(headerHtml).toContain('min-h-[44px]');
      expect(headerHtml).toContain('aria-label="Open menu"');

      const clientHtml = renderToString(<MarketplacesClient />);
      expect(clientHtml).toContain('min-h-[44px]');
    });

    it('supports 768px-1024px tablet viewports transitioning into responsive grids', () => {
      const marketplaceHtml = renderToString(<MarketplaceSection />);
      expect(marketplaceHtml).toContain('grid grid-cols-1 gap-6 md:grid-cols-2');

      const permHtml = renderToString(<PermissionsSection />);
      expect(permHtml).toContain('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4');
    });
  });

  describe('4. Design System (shadcn buFzlTs Radix-Lyra Neutral)', () => {
    it('avoids glowing button borders and pill styles in NetworkSection', () => {
      const netHtml = renderToString(<NetworkSection />);
      expect(netHtml).not.toContain('shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]');
      expect(netHtml).not.toContain('rounded-full bg-[#00DD94]');
      expect(netHtml).toContain('rounded-none');
    });

    it('avoids glowing pill buttons in HowItWorks trial CTA', () => {
      const howItWorksHtml = renderToString(<HowItWorks />);
      expect(howItWorksHtml).not.toContain('shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]');
      expect(howItWorksHtml).not.toContain('rounded-full bg-[color:var(--color-primary)] px-8 py-4');
    });

    it('uses crisp precision radius and button variants in MarketplacesClient', () => {
      const clientHtml = renderToString(<MarketplacesClient />);
      expect(clientHtml).not.toContain('shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]');
      expect(clientHtml).toContain('rounded-none');
    });
  });
});
