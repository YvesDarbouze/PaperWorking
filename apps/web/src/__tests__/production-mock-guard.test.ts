import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { isProductionRuntime, useMockData, useMockAuth } from '../../lib/data/env';

describe('production mock safety', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(value: string | undefined) {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: originalNodeEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    setNodeEnv(originalNodeEnv);
  });

  it('useMockData is false in production regardless of flags', () => {
    setNodeEnv('production');
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true';
    process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH = 'true';
    expect(useMockData()).toBe(false);
    expect(useMockAuth()).toBe(false);
  });

  it('useMockData defaults true in non-production', () => {
    setNodeEnv('development');
    delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;
    delete process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH;
    expect(useMockData()).toBe(true);
  });

  it('useMockData respects explicit false in development', () => {
    setNodeEnv('development');
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'false';
    expect(useMockData()).toBe(false);
  });

  it('isProductionRuntime tracks NODE_ENV', () => {
    setNodeEnv('production');
    expect(isProductionRuntime()).toBe(true);
  });
});
