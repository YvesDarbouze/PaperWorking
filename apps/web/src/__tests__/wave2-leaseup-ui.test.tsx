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

const { default: DealCalculatorView } = await import(
  '../../components/marketing/DealCalculatorView.js'
);

describe('MISSION W2-11: Lease-Up & Stabilization UI Suite', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
    mockFetchSessionProfile.mockResolvedValue({
      authenticated: true,
      subscriptionStatus: 'active',
    });
  });

  it('1. renders Lease-Up & Stabilization section with honest 0-month defaults', () => {
    const html = renderToString(
      <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
    );

    // Check presence of Lease-Up section
    expect(html).toContain('data-testid="leaseup-section"');
    expect(html).toContain('Lease-Up &amp; Stabilization');
    expect(html).toContain('Stabilized (0 mo)');

    // Check default inputs
    expect(html).toContain('data-testid="leaseup-stabilization-months"');
    expect(html).toContain('data-testid="leaseup-ramp-pct"');

    // When inactive (0 months), no leaseup status banner is rendered
    expect(html).not.toContain('data-testid="leaseup-status-banner"');
    // Conditional vacant/concessions inputs are not rendered
    expect(html).not.toContain('data-testid="leaseup-vacant-months"');
    expect(html).not.toContain('data-testid="leaseup-concessions-months"');
  });

  it('2. preserves canonical outputs and baseline metrics when lease-up is inactive (0 months)', () => {
    const html = renderToString(
      <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
    );

    // Initial loan amount: $390,000
    expect(html).toContain('$390,000');
    // Net Operating Income: $38,138
    expect(html).toContain('$38,138');
    // Net Monthly Cash Flow: $713
    expect(html).toContain('$713');
    // Projected IRR: 3.8%
    expect(html).toContain('3.8%');
  });
});
