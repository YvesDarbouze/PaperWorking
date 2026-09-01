import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  compareReadModels,
  organizationFromPostgres,
  userFromPostgres,
} from '../shadow-read.js';
import {
  getDatabaseReadMode,
  isFirestoreReadMode,
  isFirestoreShadowReadsEnabled,
} from '../read-mode.js';

describe('firestore read mode flags', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it('defaults to postgres read mode', () => {
    delete process.env.DATABASE_READ_MODE;
    expect(getDatabaseReadMode()).toBe('postgres');
    expect(isFirestoreReadMode()).toBe(false);
  });

  it('supports firestore read mode when explicitly configured', () => {
    process.env.DATABASE_READ_MODE = 'firestore';
    expect(getDatabaseReadMode()).toBe('firestore');
    expect(isFirestoreReadMode()).toBe(true);
  });

  it('defaults shadow reads to off', () => {
    delete process.env.FIRESTORE_SHADOW_READS;
    expect(isFirestoreShadowReadsEnabled()).toBe(false);
  });
});

describe('firestore shadow read comparison', () => {
  it('compares normalized postgres and firestore user records', () => {
    const postgres = userFromPostgres({
      id: 'uid-1',
      email: 'a@example.com',
      displayName: 'Alex',
      accountType: 'investor',
      role: 'Lead Investor',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const firestoreMatch = { ...postgres };
    expect(compareReadModels('user', 'uid-1', postgres, firestoreMatch, ['id', 'email'])).toEqual(
      [],
    );

    const firestoreMismatch = { ...postgres, email: 'other@example.com' };
    const mismatches = compareReadModels('user', 'uid-1', postgres, firestoreMismatch, ['email']);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.field).toBe('email');
  });

  it('maps postgres organization ownerId for shadow reads', () => {
    const org = organizationFromPostgres({
      id: 'org-1',
      name: 'Acme',
      ownerId: 'uid-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    expect(org.ownerId).toBe('uid-1');
  });
});
