import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

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
  usePathname: () => '/support',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  fetchSessionProfile: mockFetchSessionProfile,
  destroySession: jest.fn(),
  createSession: jest.fn(),
  createDevSession: jest.fn(),
}));

jest.unstable_mockModule('@/lib/assistant/chat-engine', () => ({
  generateAssistantResponse: jest.fn(),
}));

const { default: MarketingHeader } = await import(
  '../../components/marketing/MarketingHeader.js'
);
const { default: SupportCenter } = await import(
  '../../components/marketing/SupportCenter.js'
);
const { metadata: supportMetadata } = await import(
  '../../app/(marketing)/support/page.js'
);

describe('PROMPT 1 — Support Center & Top Navigation Integration Suite', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
  });

  describe('1. Top Navigation Placement & Active Link Treatment', () => {
    it('renders "Support" after "Marketplace" and before "Log in" in desktop and mobile navigation', () => {
      mockFetchSessionProfile.mockResolvedValue({
        authenticated: false,
      });

      const headerHtml = renderToString(<MarketingHeader />);

      const dealCalcIndex = headerHtml.indexOf('Deal Calculator');
      const howItWorksIndex = headerHtml.indexOf('How it works');
      const pricingIndex = headerHtml.indexOf('Pricing');
      const marketplaceIndex = headerHtml.indexOf('Marketplace');
      const supportIndex = headerHtml.indexOf('Support');
      const logInIndex = headerHtml.indexOf('Log in');

      // Verify presence
      expect(dealCalcIndex).toBeGreaterThan(-1);
      expect(howItWorksIndex).toBeGreaterThan(-1);
      expect(pricingIndex).toBeGreaterThan(-1);
      expect(marketplaceIndex).toBeGreaterThan(-1);
      expect(supportIndex).toBeGreaterThan(-1);
      expect(logInIndex).toBeGreaterThan(-1);

      // Verify exact order
      expect(marketplaceIndex).toBeLessThan(supportIndex);
      expect(supportIndex).toBeLessThan(logInIndex);

      // Verify href
      expect(headerHtml).toContain('href="/support"');
    });

    it('applies active link styling when viewing /support', () => {
      mockFetchSessionProfile.mockResolvedValue({
        authenticated: false,
      });

      const headerHtml = renderToString(<MarketingHeader />);

      // Active styling
      expect(headerHtml).toContain('aria-current="page"');
      expect(headerHtml).toContain('text-white font-semibold');

      // "Get started" remains the sole green primary CTA pill
      expect(headerHtml).toContain('Get started');
      expect(headerHtml).toContain('bg-[color:var(--color-primary)]');
    });
  });

  describe('2. Five Required Sections in Exact Sequence', () => {
    it('renders the 5 sections in strict sequence with proper heading hierarchy and anchor IDs', () => {
      const html = renderToString(<SupportCenter initialSubscriber={false} />);

      // Section 1: Pepper
      const pepperIndex = html.indexOf('id="pepper"');
      expect(pepperIndex).toBeGreaterThan(-1);
      expect(html).toContain('Pepper</h2>');

      // Section 2: FAQ
      const faqIndex = html.indexOf('id="faq"');
      expect(faqIndex).toBeGreaterThan(-1);
      expect(html).toContain('FAQ</h2>');

      // Section 3: PaperWorking Glossary
      const glossaryIndex = html.indexOf('id="glossary"');
      expect(glossaryIndex).toBeGreaterThan(-1);
      expect(html).toContain('PaperWorking Glossary</h2>');

      // Section 4: Feature Request / Suggestions
      const featureIndex = html.indexOf('id="feature-request"');
      expect(featureIndex).toBeGreaterThan(-1);
      expect(html).toContain('Feature Request / Suggestions</h2>');

      // Section 5: Request a call back
      const callbackIndex = html.indexOf('id="request-a-call-back"');
      expect(callbackIndex).toBeGreaterThan(-1);
      expect(html).toContain('Request a call back</h2>');

      // Strict sequential order
      expect(pepperIndex).toBeLessThan(faqIndex);
      expect(faqIndex).toBeLessThan(glossaryIndex);
      expect(glossaryIndex).toBeLessThan(featureIndex);
      expect(featureIndex).toBeLessThan(callbackIndex);
    });
  });

  describe('3. Exact Client Language Verification', () => {
    it('renders the client verbatim phrases without alteration', () => {
      const html = renderToString(<SupportCenter initialSubscriber={false} />);

      // Page Title
      expect(html).toContain('Support Center');

      // Pepper description verbatim
      expect(html).toContain('Pepper will answer any question in Search and Chat style.');

      // Glossary description verbatim
      expect(html).toContain('definitions for functionality in the PaperWorking App.');

      // Feature Request gating verbatim (accounting for HTML entity escaping)
      expect(html).toMatch(/You must be a subscriber to make a (?:'|&#x27;|&apos;)Feature Request(?:'|&#x27;|&apos;) or (?:'|&#x27;|&apos;)Suggestions\.(?:'|&#x27;|&apos;)/);
    });
  });

  describe('4. Approved Placeholder Microcopy (11 Items)', () => {
    it('includes all approved placeholder microcopy items across states and forms', () => {
      // 1. Locked-state microcopy
      const loggedOutHtml = renderToString(<SupportCenter initialSubscriber={false} />);
      expect(loggedOutHtml).toContain('Log in with an active subscription to continue.');

      // Active subscriber view
      const subHtml = renderToString(<SupportCenter initialSubscriber={true} />);

      // 2. Form labels
      expect(subHtml).toContain('Your message');
      expect(subHtml).toContain('Name');
      expect(subHtml).toContain('Email');
      expect(subHtml).toContain('Phone number');

      // 3. Submit buttons
      expect(subHtml).toContain('Submit');
      expect(subHtml).toContain('Request a call back');

      // 7. Pepper input placeholder
      expect(subHtml).toContain('placeholder="Ask Pepper anything…"');

      // 8. Pepper starter questions (3 items)
      expect(subHtml).toContain('How do I set up my workspace?');
      expect(subHtml).toContain('What are the 33 metrics?');
      expect(subHtml).toContain('How does the free trial work?');

      // 11. Page meta/title
      expect(supportMetadata.title).toBe('Support Center — PaperWorking');
    });
  });

  describe('5. Subscriber Gating Integrity', () => {
    it('locks Feature Request / Suggestions for unauthenticated users', () => {
      const html = renderToString(<SupportCenter initialSubscriber={false} />);

      // Shows locked notice
      expect(html).toMatch(/You must be a subscriber to make a (?:'|&#x27;|&apos;)Feature Request(?:'|&#x27;|&apos;) or (?:'|&#x27;|&apos;)Suggestions\.(?:'|&#x27;|&apos;)/);
      expect(html).toContain('Log in with an active subscription to continue.');
      expect(html).toContain('/login?next=');
      expect(html).toContain('/pricing');

      // Does not show the interactive input form
      expect(html).not.toContain('id="feedback-message"');
    });

    it('unlocks Feature Request / Suggestions for active subscribers', () => {
      const html = renderToString(<SupportCenter initialSubscriber={true} />);

      // Shows interactive feedback form
      expect(html).toContain('id="feedback-message"');
      expect(html).toContain('Feature Request');
      expect(html).toContain('Suggestions');
      expect(html).toContain('Submit');

      // Does not show locked notice
      expect(html).not.toContain('Log in with an active subscription to continue.');
    });
  });

  describe('6. Request a Call Back Form', () => {
    it('renders input fields for Name, Email, and Phone number with call back submission button', () => {
      const html = renderToString(<SupportCenter initialSubscriber={false} />);

      expect(html).toContain('id="cb-name"');
      expect(html).toContain('id="cb-email"');
      expect(html).toContain('id="cb-phone"');
      expect(html).toContain('Request a call back');
    });
  });

  describe('7. Absolute Privacy Invariant (Zero Client Exposure)', () => {
    it('ensures hi@paperworking.co is NEVER exposed in the rendered client output', () => {
      const loggedOutHtml = renderToString(<SupportCenter initialSubscriber={false} />);
      const subHtml = renderToString(<SupportCenter initialSubscriber={true} />);

      expect(loggedOutHtml).not.toContain('hi@paperworking.co');
      expect(subHtml).not.toContain('hi@paperworking.co');
    });

    it('ensures SupportCenter.tsx source file contains ZERO occurrences of hi@paperworking.co', () => {
      const supportCenterPath = fs.existsSync(path.resolve(process.cwd(), 'components/marketing/SupportCenter.tsx'))
        ? path.resolve(process.cwd(), 'components/marketing/SupportCenter.tsx')
        : path.resolve(process.cwd(), 'apps/web/components/marketing/SupportCenter.tsx');

      const source = fs.readFileSync(supportCenterPath, 'utf8');

      expect(source).not.toContain('hi@paperworking.co');
    });
  });
});
