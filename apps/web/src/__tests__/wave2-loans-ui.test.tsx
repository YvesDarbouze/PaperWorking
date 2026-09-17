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

describe('MISSION W2-10: Loan Structures & Payment Shock UI Suite', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
    mockFetchSessionProfile.mockResolvedValue({
      authenticated: true,
      subscriptionStatus: 'active',
    });
  });

  it('1. renders Loan Structure & Terms section with default 30-yr amortizing selection', () => {
    const html = renderToString(
      <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
    );

    // Check presence of Loan Structure section
    expect(html).toContain('data-testid="loan-structure-section"');
    expect(html).toContain('Loan Structure &amp; Terms');
    expect(html).toContain('30-yr amortizing');

    // Check 3-way toggle group and buttons
    expect(html).toContain('data-testid="loan-type-group"');
    expect(html).toContain('data-testid="loan-type-amortizing"');
    expect(html).toContain('data-testid="loan-type-io"');
    expect(html).toContain('data-testid="loan-type-arm"');

    // In amortizing mode: no payment shock banner should be rendered
    expect(html).not.toContain('data-testid="payment-shock-disclosure"');

    // In amortizing mode: IO and ARM inputs are not rendered
    expect(html).not.toContain('data-testid="loan-io-years"');
    expect(html).not.toContain('data-testid="loan-arm-fixed-years"');
    expect(html).not.toContain('data-testid="loan-arm-adjustment-pct"');
  });

  it('2. renders canonical metrics and DCF table under default amortizing loan structure', () => {
    const html = renderToString(
      <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
    );

    // Initial loan amount: 75% of $520,000 = $390,000
    expect(html).toContain('$390,000');
    // Net Operating Income: $38,138
    expect(html).toContain('$38,138');
    // Monthly Net Cash Flow under baseline: $713
    expect(html).toContain('$713');
    // Baseline IRR: 3.8%
    expect(html).toContain('data-testid="irr-output-metric"');
    expect(html).toContain('3.8%');
    // Multi-Year DCF table includes Amortizing label
    expect(html).toContain('data-testid="dcf-projections-table"');
    expect(html).toContain('Amortizing');
    expect(html).toContain('0% rent / 0% exp');
  });
});
