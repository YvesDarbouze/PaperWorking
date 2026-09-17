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
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  fetchSessionProfile: mockFetchSessionProfile,
  destroySession: jest.fn(),
  createSession: jest.fn(),
  createDevSession: jest.fn(),
  resolveLoginRedirect: jest.fn(() => '/dashboard'),
}));

jest.unstable_mockModule('@/lib/assistant/chat-engine', () => ({
  generateAssistantResponse: jest.fn(),
}));

const { default: MarketingBottomNav, MOBILE_NAV_ITEMS } = await import(
  '../../components/marketing/MarketingBottomNav.js'
);
const { default: MarketingHeader } = await import(
  '../../components/marketing/MarketingHeader.js'
);
const { default: StickyMobileCta } = await import(
  '../../components/marketing/StickyMobileCta.js'
);
const { default: ChatbotWidget } = await import(
  '../../components/marketing/ChatbotWidget.js'
);
const { default: LoginPanel } = await import(
  '../../components/auth/LoginPanel.js'
);
const { AuthProvider } = await import('../../context/AuthContext.js');
const { default: DealCalculatorView } = await import(
  '../../components/marketing/DealCalculatorView.js'
);
const { default: SupportCenter } = await import(
  '../../components/marketing/SupportCenter.js'
);
const { default: PricingSection } = await import(
  '../../components/marketing/PricingSection.js'
);

describe('PROMPT 6 — Native Mobile Experience Suite', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
    mockFetchSessionProfile.mockResolvedValue({
      authenticated: false,
    });
  });

  describe('1. Mobile Navigation with App-Native Feel (Requirement 2)', () => {
    it('renders persistent mobile bottom navigation bar with md:hidden', () => {
      const html = renderToString(<MarketingBottomNav />);

      expect(html).toContain('data-testid="mobile-bottom-nav"');
      expect(html).toContain('md:hidden');
      expect(html).toContain('fixed bottom-0');
    });

    it('contains all 5 required one-tap destinations in bottom nav', () => {
      const html = renderToString(<MarketingBottomNav />);

      // Verify all 5 destinations
      expect(html).toContain('data-testid="mobile-nav-home"');
      expect(html).toContain('data-testid="mobile-nav-how-it-works"');
      expect(html).toContain('data-testid="mobile-nav-calculator"');
      expect(html).toContain('data-testid="mobile-nav-pricing"');
      expect(html).toContain('data-testid="mobile-nav-support"');

      // Verify href targets
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/how-it-works"');
      expect(html).toContain('href="/deal-calculator"');
      expect(html).toContain('href="/pricing"');
      expect(html).toContain('href="/support"');

      // Verify icons
      expect(html).toContain('home');
      expect(html).toContain('hub');
      expect(html).toContain('calculate');
      expect(html).toContain('payments');
      expect(html).toContain('smart_toy');
    });

    it('visually indicates active destination and enforces min 44px touch targets', () => {
      const html = renderToString(<MarketingBottomNav />);

      // On root '/', Home is active
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('min-h-[52px]');
      expect(html).toContain('touch-press');
    });

    it('exposes a 1-tap mobile Log in button in the header so all destinations + auth are 1-tap reachable', () => {
      const headerHtml = renderToString(<MarketingHeader />);

      expect(headerHtml).toContain('data-testid="mobile-quick-login"');
      expect(headerHtml).toContain('href="/login"');
      // Logo leads to /
      expect(headerHtml).toContain('href="/"');
    });
  });

  describe('2. Sticky Context-Aware Primary CTA (Requirement 3)', () => {
    it('renders sticky CTA container on eligible long scrolling pages with verbatim copy', () => {
      const html = renderToString(<StickyMobileCta />);

      expect(html).toContain('data-testid="sticky-mobile-cta"');
      expect(html).toContain('Start Free 14-Day Trial');
      expect(html).toContain('href="/signup"');
      expect(html).toContain('md:hidden');
      // Positions cleanly above the mobile bottom bar
      expect(html).toContain('bottom-[calc(4.25rem+env(safe-area-inset-bottom))]');
    });
  });

  describe('3. Pepper Chat Widget Mobile Optimization (Requirement 5)', () => {
    it('positions collapsed launcher safely above the mobile bottom nav bar', () => {
      const html = renderToString(<ChatbotWidget />);

      expect(html).toContain('data-testid="chatbot-widget-container"');
      expect(html).toContain('bottom-[calc(4.75rem+env(safe-area-inset-bottom))]');
      expect(html).toContain('md:bottom-5');
    });

    it('renders mobile input and toggle buttons with touch-press and safe-area padding', () => {
      const html = renderToString(<ChatbotWidget />);

      expect(html).toContain('touch-press');
      expect(html).toContain('aria-label="Open PaperWorking Assistant chat"');
    });
  });

  describe('4. Mobile-Optimized Forms (Requirement 6)', () => {
    it('provides email keyboard, password show/hide toggle, and 48px submit button on login/signup', () => {
      const html = renderToString(
        <AuthProvider>
          <LoginPanel />
        </AuthProvider>,
      );

      // Email inputMode
      expect(html).toContain('inputMode="email"');
      expect(html).toContain('autoCapitalize="none"');
      expect(html).toContain('autoCorrect="off"');

      // Password show/hide toggle button
      expect(html).toContain('Show');

      // Touch target heights
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('min-h-[48px]');

      // Verbatim CTA copy
      expect(html).toContain('Sign in');
    });

    it('equips Deal Calculator with numeric and decimal inputMode for mobile keypads', () => {
      const html = renderToString(<DealCalculatorView initialAuthenticated={true} />);

      // Numeric inputs
      expect(html).toContain('inputMode="numeric"');
      // Decimal inputs for rates/percentages
      expect(html).toContain('inputMode="decimal"');
      // Touch target min-heights
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('Calculate Deal');
    });

    it('equips Support Center callback form with tel and email inputModes', () => {
      const html = renderToString(<SupportCenter initialSubscriber={false} />);

      expect(html).toContain('inputMode="tel"');
      expect(html).toContain('inputMode="email"');
      expect(html).toContain('autoComplete="name"');
      expect(html).toContain('autoComplete="tel"');
      expect(html).toContain('autoComplete="email"');
      expect(html).toContain('min-h-[44px]');
    });
  });

  describe('5. Graceful Stacking & Swipe Affordances (Requirement 4)', () => {
    it('equips Pricing section with mobile plan jump tabs and 48px touch targets', () => {
      const html = renderToString(<PricingSection />);

      // Mobile plan quick jump tabs
      expect(html).toContain('href="#plan-individual"');
      expect(html).toContain('href="#plan-team"');
      expect(html).toContain('href="#plan-vendor"');

      // Plan cards with IDs
      expect(html).toContain('id="plan-individual"');
      expect(html).toContain('id="plan-team"');
      expect(html).toContain('id="plan-vendor"');

      // Plan CTA buttons have min-h-[48px]
      expect(html).toContain('min-h-[48px]');
    });
  });

  describe('6. Desktop Invariant & Non-Regression', () => {
    it('ensures mobile-specific elements are hidden on desktop (md:hidden)', () => {
      const bottomNavHtml = renderToString(<MarketingBottomNav />);
      expect(bottomNavHtml).toContain('md:hidden');

      const stickyCtaHtml = renderToString(<StickyMobileCta />);
      expect(stickyCtaHtml).toContain('md:hidden');

      const headerHtml = renderToString(<MarketingHeader />);
      expect(headerHtml).toContain('hidden items-center gap-7 md:flex');
    });
  });
});
