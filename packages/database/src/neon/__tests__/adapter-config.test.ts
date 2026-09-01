import { describe, expect, it } from '@jest/globals';
import {
  DatabaseAdapterConfigError,
  isNeonAdapterMode,
  resolveDatabaseAdapterMode,
  resolveDatabaseUrl,
} from '../config.js';

describe('DATABASE_ADAPTER configuration', () => {
  it('defaults to default/pg path when DATABASE_ADAPTER is unset', () => {
    expect(resolveDatabaseAdapterMode({})).toBe('default');
    expect(isNeonAdapterMode({})).toBe(false);
  });

  it('uses default path for DATABASE_ADAPTER=default', () => {
    expect(resolveDatabaseAdapterMode({ DATABASE_ADAPTER: 'default' })).toBe('default');
    expect(isNeonAdapterMode({ DATABASE_ADAPTER: 'default' })).toBe(false);
  });

  it('uses default path for DATABASE_ADAPTER=pg (legacy alias)', () => {
    expect(resolveDatabaseAdapterMode({ DATABASE_ADAPTER: 'pg' })).toBe('default');
  });

  it('selects neon adapter for DATABASE_ADAPTER=neon', () => {
    expect(resolveDatabaseAdapterMode({ DATABASE_ADAPTER: 'neon' })).toBe('neon');
    expect(isNeonAdapterMode({ DATABASE_ADAPTER: 'neon' })).toBe(true);
  });

  it('rejects invalid DATABASE_ADAPTER values', () => {
    expect(() => resolveDatabaseAdapterMode({ DATABASE_ADAPTER: 'invalid' })).toThrow(
      DatabaseAdapterConfigError,
    );
    expect(() => resolveDatabaseAdapterMode({ DATABASE_ADAPTER: 'supabase' })).toThrow(
      DatabaseAdapterConfigError,
    );
  });

  it('requires DATABASE_URL for adapter construction config', () => {
    expect(() => resolveDatabaseUrl({})).toThrow(/DATABASE_URL is not set/);
    expect(resolveDatabaseUrl({ DATABASE_URL: 'postgresql://u:p@localhost/db' })).toBe(
      'postgresql://u:p@localhost/db',
    );
  });
});
