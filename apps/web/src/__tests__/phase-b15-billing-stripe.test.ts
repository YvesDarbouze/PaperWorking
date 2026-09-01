import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBffApiPath } from '../../lib/api/bff-fetch';

const here = dirname(fileURLToPath(import.meta.url));

describe('phase B15 — billing BFF transport registry', () => {
  it('registers billing and stripe browser routes', () => {
    expect(isBffApiPath('/api/billing')).toBe(true);
    expect(isBffApiPath('/api/billing/cancel')).toBe(true);
    expect(isBffApiPath('/api/stripe/checkout')).toBe(true);
    expect(isBffApiPath('/api/stripe/portal')).toBe(true);
    expect(isBffApiPath('/api/stripe/session-status')).toBe(true);
    expect(isBffApiPath('/api/stripe/webhook')).toBe(false);
  });
});

describe('phase B15 — browser billing transport', () => {
  it('BillingPreviewPanel uses same-origin billing BFF helpers', () => {
    const panel = readFileSync(
      join(here, '../../components/dashboard/BillingPreviewPanel.tsx'),
      'utf8',
    );
    expect(panel).toContain('getBillingSummaryFromBff');
    expect(panel).toContain('createStripeCheckoutFromBff');
    expect(panel).toContain('createStripePortalFromBff');
    expect(panel).toContain('cancelBillingSubscriptionFromBff');
    expect(panel).not.toContain('apiFetch(');
  });

  it('Next billing routes delegate to shared billing services', () => {
    const billing = readFileSync(join(here, '../../app/api/billing/route.ts'), 'utf8');
    const cancel = readFileSync(join(here, '../../app/api/billing/cancel/route.ts'), 'utf8');
    const checkout = readFileSync(join(here, '../../app/api/stripe/checkout/route.ts'), 'utf8');
    const portal = readFileSync(join(here, '../../app/api/stripe/portal/route.ts'), 'utf8');
    const sessionStatus = readFileSync(
      join(here, '../../app/api/stripe/session-status/route.ts'),
      'utf8',
    );

    expect(billing).toContain('buildBillingReadService');
    expect(cancel).toContain('buildBillingSubscriptionCommandService');
    expect(checkout).toContain('buildBillingCheckoutService');
    expect(portal).toContain('buildBillingPortalService');
    expect(sessionStatus).toContain('buildBillingCheckoutService');
  });

  it('api-provider billing preview uses BFF helper', () => {
    const provider = readFileSync(join(here, '../../lib/data/api-provider.ts'), 'utf8');
    expect(provider).toContain('getBillingSummaryFromBff');
    expect(provider).not.toContain("apiJson<Record<string, unknown>>('/api/billing')");
  });
});

describe('phase B15 — webhook not migrated to Next', () => {
  it('no Next stripe webhook route exists', () => {
    expect(() =>
      readFileSync(join(here, '../../app/api/stripe/webhook/route.ts'), 'utf8'),
    ).toThrow();
  });
});
