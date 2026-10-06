/**
 * Test Suite: /dashboard/explore Redirect Test (Item 3.3)
 *
 * Verifies:
 * 1. next.config.ts contains a permanent redirect from /dashboard/explore to /dashboard/deals.
 */

import { describe, expect, it } from '@jest/globals';

const { default: nextConfig } = await import('../../next.config.js');

describe('/dashboard/explore Redirect Configuration (Item 3.3)', () => {
  it('contains a permanent redirect from /dashboard/explore to /dashboard/deals', async () => {
    expect(typeof nextConfig.redirects).toBe('function');
    const redirects = await nextConfig.redirects!();
    const exploreRedirect = redirects.find((r) => r.source === '/dashboard/explore');

    expect(exploreRedirect).toBeDefined();
    expect(exploreRedirect?.destination).toBe('/dashboard/deals');
    expect(exploreRedirect?.permanent).toBe(true);
  });
});
