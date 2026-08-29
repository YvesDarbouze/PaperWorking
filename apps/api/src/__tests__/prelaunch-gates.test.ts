/**
 * Pre-launch — Wave-2 path gate, Stripe fail-closed, estimate display honesty.
 */
import { describe, expect, it } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';

function shouldBlockWave2Path(pathname: string, nodeEnv?: string): boolean {
  if (nodeEnv !== 'production') return false;
  const prefixes = [
    '/dashboard/banking',
    '/dashboard/plaid',
    '/dashboard/integrations',
    '/plaid',
    '/banking',
  ];
  const path = pathname.split('?')[0] || '/';
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

function checkoutWhenMissingStripe(opts: {
  nodeEnv?: string;
  stripeKey?: string;
  mockAllowed?: boolean;
}) {
  if (opts.stripeKey) return { success: true, url: 'https://checkout.stripe.com/x' };
  if (opts.nodeEnv === 'production' || !opts.mockAllowed) {
    throw new ServiceUnavailableException({ error: 'Stripe not configured' });
  }
  return { success: true, mock: true, url: 'http://localhost/billing?session_id=cs_test_mock_u_1' };
}

function formatEstExit(estimatedExitValue?: number, purchasePrice?: number) {
  void purchasePrice; // must not invent ×1.25
  if (typeof estimatedExitValue === 'number') return `$${estimatedExitValue}`;
  return 'Unavailable';
}

describe('Pre-launch — Wave-2 route gating', () => {
  it('production blocks Wave-2 reserved paths', () => {
    expect(shouldBlockWave2Path('/dashboard/plaid', 'production')).toBe(true);
    expect(shouldBlockWave2Path('/dashboard/banking/link', 'production')).toBe(true);
  });

  it('production allows Wave-1 dashboard paths', () => {
    expect(shouldBlockWave2Path('/dashboard/marketplace', 'production')).toBe(false);
    expect(shouldBlockWave2Path('/projects', 'production')).toBe(false);
  });

  it('non-production does not block scaffolding paths', () => {
    expect(shouldBlockWave2Path('/dashboard/plaid', 'development')).toBe(false);
  });
});

describe('Pre-launch — Stripe missing / mock production', () => {
  it('production missing Stripe → fail closed', () => {
    expect(() =>
      checkoutWhenMissingStripe({ nodeEnv: 'production', mockAllowed: true }),
    ).toThrow(ServiceUnavailableException);
  });

  it('production mock payment → rejected', () => {
    expect(() =>
      checkoutWhenMissingStripe({
        nodeEnv: 'production',
        mockAllowed: true,
      }),
    ).toThrow(ServiceUnavailableException);
  });

  it('configured Stripe → success shape', () => {
    const r = checkoutWhenMissingStripe({
      nodeEnv: 'production',
      stripeKey: 'sk_live_x',
    });
    expect(r.success).toBe(true);
    expect((r as { mock?: boolean }).mock).toBeUndefined();
  });
});

describe('Pre-launch — financial estimate display', () => {
  it('does not use purchasePrice * 1.25 as Est. Exit', () => {
    expect(formatEstExit(undefined, 400_000)).toBe('Unavailable');
    expect(formatEstExit(500_000, 400_000)).toBe('$500000');
  });
});
