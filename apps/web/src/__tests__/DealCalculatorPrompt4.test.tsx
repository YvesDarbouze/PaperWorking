import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';

const mockPush = jest.fn();
const mockFetchSessionProfile = jest.fn<() => Promise<{
  authenticated: boolean;
  accountType?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}>>();

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
  usePathname: () => '/deal-calculator',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  fetchSessionProfile: mockFetchSessionProfile,
  destroySession: jest.fn(),
  createSession: jest.fn(),
  createDevSession: jest.fn(),
}));

const { default: MarketingHeader } = await import(
  '../../components/marketing/MarketingHeader.js'
);
const { default: DealCalculatorView } = await import(
  '../../components/marketing/DealCalculatorView.js'
);

describe('PROMPT 4 — Top-Nav Deal Calculator Entry & Gated Lifecycle Suite', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
  });

  describe('1. Top Navigation Placement & Active Link Treatment', () => {
    it('renders "Deal Calculator" as the first navigation link in desktop & mobile navigation', () => {
      mockFetchSessionProfile.mockResolvedValue({
        authenticated: false,
      });

      const headerHtml = renderToString(<MarketingHeader />);

      // Verify "Deal Calculator" appears before "How it works"
      const dealCalcIndex = headerHtml.indexOf('Deal Calculator');
      const howItWorksIndex = headerHtml.indexOf('How it works');
      const pricingIndex = headerHtml.indexOf('Pricing');
      const marketplaceIndex = headerHtml.indexOf('Marketplace');

      expect(dealCalcIndex).toBeGreaterThan(-1);
      expect(howItWorksIndex).toBeGreaterThan(-1);
      expect(pricingIndex).toBeGreaterThan(-1);
      expect(marketplaceIndex).toBeGreaterThan(-1);

      expect(dealCalcIndex).toBeLessThan(howItWorksIndex);
      expect(howItWorksIndex).toBeLessThan(pricingIndex);
      expect(pricingIndex).toBeLessThan(marketplaceIndex);

      // Verify href targets /deal-calculator
      expect(headerHtml).toContain('href="/deal-calculator"');
    });

    it('applies active link styling when on /deal-calculator', () => {
      mockFetchSessionProfile.mockResolvedValue({
        authenticated: false,
      });

      const headerHtml = renderToString(<MarketingHeader />);

      // Active state on desktop & mobile
      expect(headerHtml).toContain('aria-current="page"');
      expect(headerHtml).toContain('text-white font-semibold');

      // "Get started" remains the sole green primary CTA pill
      expect(headerHtml).toContain('Get started');
      expect(headerHtml).toContain('bg-[color:var(--color-primary)]');
    });
  });

  describe('2. Unauthenticated State (Logged-out Visitor Gate)', () => {
    it('renders the "Sign in" request gate modal with exact client language and approved microcopy', () => {
      mockFetchSessionProfile.mockResolvedValue({
        authenticated: false,
      });

      const html = renderToString(<DealCalculatorView />);

      // Check modal role & testid
      expect(html).toContain('role="dialog"');
      expect(html).toContain('data-testid="sign-in-gate-modal"');

      // Exact client heading: "Sign in"
      expect(html).toContain('Sign in');

      // [NEW PLACEHOLDER MICROCOPY — requires client approval]: "Sign in to use the Deal Calculator."
      expect(html).toContain('Sign in to use the Deal Calculator.');

      // Path to Sign in preserving post-auth redirect to /deal-calculator
      expect(html).toContain('/login?next=%2Fdeal-calculator');

      // Path to existing 14-day trial signup flow preserving post-auth redirect
      expect(html).toContain('Get started');
      expect(html).toContain('/signup?next=%2Fdeal-calculator');
    });
  });

  describe('3. Authenticated States & Paywall Handling', () => {
    it('unauthenticated state displays the gate, while interactive calculator elements remain structured', () => {
      mockFetchSessionProfile.mockResolvedValue({
        authenticated: false,
      });

      const html = renderToString(<DealCalculatorView />);

      // Gate is present
      expect(html).toContain('data-testid="sign-in-gate-modal"');

      // Inputs and metrics are present in the DOM structure
      expect(html).toContain('Deal Calculator');
      expect(html).toContain('Purchase Price');
      expect(html).toContain('After Repair Value (ARV)');
      expect(html).toContain('Rehab Budget');
      expect(html).toContain('Cap Rate');
      expect(html).toContain('Projected IRR');
    });

    it('authenticated active user does NOT render the sign-in gate and can access the calculator directly', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).not.toContain('data-testid="sign-in-gate-modal"');
      expect(html).not.toContain('data-testid="paywall-modal"');
      expect(html).toContain('Calculate Deal');
      expect(html).toContain('Cap Rate');
      expect(html).toContain('Projected IRR');
    });

    it('authenticated user with expired trial renders the paywall modal pointing to /pricing', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="expired" />
      );

      expect(html).toContain('data-testid="paywall-modal"');
      expect(html).toContain('Trial Expired');
      expect(html).toContain('href="/pricing"');
      expect(html).toContain('View Plans');
    });
  });

  describe('4. "Make it a Project" Prompt & Acquisition Phase Alignment', () => {
    it('specifies the client question verbatim: "Do you want to make this deal a Project?" with "Yes" and "No" buttons', () => {
      const html = renderToString(
        <DealCalculatorView
          initialAuthenticated={true}
          initialSubscriptionStatus="active"
          initialShowProjectPrompt={true}
        />
      );

      // Prompt modal is visible
      expect(html).toContain('data-testid="make-project-prompt-modal"');

      // Verbatim question from client
      expect(html).toContain('Do you want to make this deal a Project?');

      // Approved action buttons
      expect(html).toContain('Yes');
      expect(html).toContain('No');

      // Carried over to Phase 01 — Acquisition
      expect(html).toContain('Phase 01 — Acquisition');
    });
  });
});
