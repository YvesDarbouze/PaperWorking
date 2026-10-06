import React from 'react';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
// Mock next/navigation
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard/profile',
  useSearchParams: () => new URLSearchParams(),
}));

const { default: PublicProfileEditor } = await import('@/components/profile/PublicProfileEditor');

describe('PublicProfileEditor: REIL 33 KPIs Non-Editable Track Record', () => {
  beforeEach(() => {
    // Provide a mocked fetch for /api/marketplace/profile
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            profile: {
              displayName: 'Jordan Bell, GP',
              businessName: 'Highline Capital',
              headline: 'Managing Partner',
              strategies: ['multifamily', 'value_add'],
              isVerified: true,
            },
          }),
      } as any),
    ) as any;
  });

  it('renders heading as "Public Profile" without "& Operator Provenance"', () => {
    const html = renderToString(<PublicProfileEditor initialLoading={false} />);
    expect(html).toContain('Public Profile');
    expect(html).not.toContain('Public Profile &amp; Operator Provenance');
    expect(html).not.toContain('&amp; Operator Provenance');
  });

  it('renders the Historical Track Record & Metrics section with REIL 33 KPIs trust seal', () => {
    const html = renderToString(<PublicProfileEditor initialLoading={false} />);
    expect(html).toContain('Historical Track Record &amp; Metrics');
    expect(html).toContain('Derived from REIL system 33 Underwriting KPIs. Non-editable by operators.');
    expect(html).toContain('System Generated · REIL 33 KPIs');
    expect(html).toContain('The Playbook (33 KPIs)');
    expect(html).toContain('href="/support/metrics"');
    expect(html).toContain('Institutional Track Record Verification');
    expect(html).toContain('Performance metrics are derived directly from the Real Estate Investment Lifecycle (REIL) system and the 33 Underwriting KPIs.');
  });

  it('renders the 4 track record inputs as disabled, readonly, and locked to the REIL 33 KPIs', () => {
    const html = renderToString(<PublicProfileEditor initialLoading={false} />);

    // 1. AUM ($M): Derived from REIL KPI #1 & #3
    expect(html).toContain('data-testid="profile-aum-input"');
    expect(html).toContain('value="0"');
    expect(html).toContain('KPI #1 &amp; #3');

    // 2. Realized IRR %: Derived from REIL KPI #10
    expect(html).toContain('data-testid="profile-roi-input"');
    expect(html).toContain('value="0"');
    expect(html).toContain('KPI #10');

    // 3. Equity Multiple: Derived from REIL KPI #11
    expect(html).toContain('data-testid="profile-multiple-input"');
    expect(html).toContain('value="0"');
    expect(html).toContain('KPI #11');

    // 4. Exits / Deals: Derived from REIL Phase 4 (KPIs #27–#33)
    expect(html).toContain('data-testid="profile-deals-input"');
    expect(html).toContain('value="0"');
    expect(html).toContain('KPIs #27–#33');

    // Verify readonly and disabled attributes are present on inputs
    expect(html).toContain('readOnly=""');
    expect(html).toContain('disabled=""');
  });
});
