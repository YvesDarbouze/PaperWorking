import { describe, expect, it } from '@jest/globals';
import {
  createPrismaDriverAdapter,
  resetPgPoolForTests,
  resolvePrismaDriverAdapterKind,
} from '../adapter.js';

describe('Prisma driver adapter factory selection', () => {
  it('maps default mode to pg driver kind', () => {
    expect(resolvePrismaDriverAdapterKind('default')).toBe('pg');
  });

  it('maps neon mode to neon driver kind', () => {
    expect(resolvePrismaDriverAdapterKind('neon')).toBe('neon');
  });

  it('constructs PrismaPg adapter in default mode without live connection', () => {
    resetPgPoolForTests();
    const adapter = createPrismaDriverAdapter(
      'default',
      'postgresql://test:test@127.0.0.1:5432/test',
    );
    expect(adapter.constructor.name).toBe('PrismaPgAdapterFactory');
    expect(adapter.provider).toBe('postgres');
    resetPgPoolForTests();
  });

  it('constructs PrismaNeon adapter in neon mode without connecting', () => {
    const adapter = createPrismaDriverAdapter(
      'neon',
      'postgresql://test:test@127.0.0.1:5432/test',
    );
    expect(adapter.constructor.name).toBe('PrismaNeonAdapterFactory');
    expect(adapter.provider).toBe('postgres');
  });
});
