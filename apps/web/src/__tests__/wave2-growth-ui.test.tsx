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

describe('MISSION W2-09: Growth-Vector Projections & DCF Progression UI Suite', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
    mockFetchSessionProfile.mockResolvedValue({
      authenticated: true,
      subscriptionStatus: 'active',
    });
  });

  it('1. renders Growth & Escalation Assumptions section with honest 0.0% defaults and testids', () => {
    const html = renderToString(
      <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
    );

    // Check presence of Growth & Escalation section
    expect(html).toContain('data-testid="growth-escalation-section"');
    expect(html).toContain('Growth &amp; Escalation Assumptions');
    expect(html).toContain('Honest 0.0% defaults — source: default');

    // Check rent growth input with testid
    expect(html).toContain('data-testid="growth-rent-pct"');
    expect(html).toContain('Rent Growth (%/yr)');

    // Check expense growth input with testid
    expect(html).toContain('data-testid="growth-expense-pct"');
    expect(html).toContain('Expense Growth (%/yr)');

    // Check appreciation input with testid
    expect(html).toContain('data-testid="growth-appreciation-pct"');
    expect(html).toContain('Appreciation (%/yr)');

    // Check default indicators
    expect(html).toContain('default');

    // Verify baseline IRR metric is 3.8% (zero growth regression invariant)
    expect(html).toContain('data-testid="irr-output-metric"');
    expect(html).toContain('3.8%');
  });

  it('2. renders Multi-Year DCF Cash Flow Schedule table with all 5 projection periods', () => {
    const html = renderToString(
      <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
    );

    // Verify DCF Projections table is rendered
    expect(html).toContain('data-testid="dcf-projections-table"');
    expect(html).toContain('Multi-Year DCF Projection (5 Years)');
    expect(html).toContain('0% rent / 0% exp');

    // Verify projection rows for Y1 through Y5
    expect(html).toContain('Y1');
    expect(html).toContain('Y2');
    expect(html).toContain('Y3');
    expect(html).toContain('Y4');
    expect(html).toContain('Y5');

    // Verify gross rent ($62,400) and net exit proceeds ($201,571)
    expect(html).toContain('$62,400');
    expect(html).toContain('$201,571');
    expect(html).toContain('$38,138');
  });
});
