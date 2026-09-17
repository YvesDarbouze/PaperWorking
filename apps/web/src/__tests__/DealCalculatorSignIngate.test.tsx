import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { NextRequest } from 'next/server';

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

const { middleware, config } = await import('../../middleware.js');
const { default: MarketingHeader } = await import(
  '../../components/marketing/MarketingHeader.js'
);
const { default: MarketingBottomNav } = await import(
  '../../components/marketing/MarketingBottomNav.js'
);
const { default: DealCalculatorView } = await import(
  '../../components/marketing/DealCalculatorView.js'
);

describe('Mission Verification — Deal Calculator Top Nav, Auth Gate & Project CTA', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
  });

  describe('1. Server-Side Router Guard (middleware.ts)', () => {
    it('protects /deal-calculator in config.matcher', () => {
      expect(config.matcher).toContain('/deal-calculator');
      expect(config.matcher).toContain('/deal-calculator/:path*');
    });

    it('redirects unauthenticated direct requests on /deal-calculator to /login?next=%2Fdeal-calculator', () => {
      const request = new NextRequest('http://localhost:3000/deal-calculator');
      const response = middleware(request);

      expect(response.status).toBe(307);
      const redirectLocation = response.headers.get('location');
      expect(redirectLocation).toBe('http://localhost:3000/login?next=%2Fdeal-calculator');
    });

    it('preserves query parameters when redirecting unauthenticated visitors to /login', () => {
      const request = new NextRequest(
        'http://localhost:3000/deal-calculator?price=500000&arv=650000'
      );
      const response = middleware(request);

      expect(response.status).toBe(307);
      const redirectLocation = response.headers.get('location');
      expect(redirectLocation).toBe(
        'http://localhost:3000/login?next=%2Fdeal-calculator%3Fprice%3D500000%26arv%3D650000'
      );
    });

    it('allows requests with valid __session cookie to proceed to /deal-calculator', () => {
      const request = new NextRequest('http://localhost:3000/deal-calculator', {
        headers: {
          cookie: '__session=valid_authenticated_investor_session',
        },
      });
      const response = middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('2. Top Navigation & Mobile Navigation Entry', () => {
    it('renders "Deal Calculator" in desktop header routing to /deal-calculator', () => {
      mockFetchSessionProfile.mockResolvedValue({ authenticated: false });
      const html = renderToString(<MarketingHeader />);

      expect(html).toContain('Deal Calculator');
      expect(html).toContain('href="/deal-calculator"');
    });

    it('renders "Deal Calculator" in mobile bottom navigation routing to /deal-calculator', () => {
      const html = renderToString(<MarketingBottomNav />);

      expect(html).toContain('Deal Calculator');
      expect(html).toContain('href="/deal-calculator"');
      expect(html).toContain('calculate');
    });
  });

  describe('3. "Want to make this deal a Project?" CTA & Lifecycle Conversion', () => {
    it('renders the "Want to make this deal a Project?" prompt modal on completed calculation', () => {
      const html = renderToString(
        <DealCalculatorView
          initialAuthenticated={true}
          initialSubscriptionStatus="active"
          initialShowProjectPrompt={true}
        />
      );

      expect(html).toContain('Want to make this deal a Project?');
      expect(html).toContain('data-testid="make-project-prompt-modal"');
      expect(html).toContain('Phase 01 — Acquisition');
      expect(html).toContain('Yes');
      expect(html).toContain('No');
    });

    it('preserves the guest story honestly with real input structure and sign-in modal', () => {
      mockFetchSessionProfile.mockResolvedValue({ authenticated: false });
      const html = renderToString(<DealCalculatorView />);

      expect(html).toContain('data-testid="sign-in-gate-modal"');
      expect(html).toContain('Sign in to use the Deal Calculator.');
      expect(html).toContain('Purchase Price');
      expect(html).toContain('After Repair Value (ARV)');
      expect(html).toContain('Cap Rate');
      expect(html).toContain('Projected IRR');
    });
  });
});
