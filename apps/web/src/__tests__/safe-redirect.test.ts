import { describe, expect, it } from '@jest/globals';
import {
  sanitizeRedirectPath,
  hasActiveSubscriptionStatus,
} from '../../lib/auth/safe-redirect';

describe('safe redirect', () => {
  it('allows internal dashboard paths', () => {
    expect(sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/projects/new')).toBe('/projects/new');
  });

  it('rejects external and javascript URLs', () => {
    expect(sanitizeRedirectPath('https://evil.com/phish')).toBe('/dashboard');
    expect(sanitizeRedirectPath('//evil.com/path')).toBe('/dashboard');
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
  });

  it('rejects unknown internal prefixes', () => {
    expect(sanitizeRedirectPath('/attacker/hidden')).toBe('/dashboard');
  });
});

describe('subscription status helper', () => {
  it('recognizes active and trialing', () => {
    expect(hasActiveSubscriptionStatus('active')).toBe(true);
    expect(hasActiveSubscriptionStatus('trialing')).toBe(true);
    expect(hasActiveSubscriptionStatus('canceled')).toBe(false);
  });
});
