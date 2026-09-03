import { describe, expect, it, jest } from '@jest/globals';
import { indexPostgresUsers, resolvePostgresMatch } from '../user-backfill/resolve-postgres.js';
import {
  buildCreatePayload,
  buildFillMissingPayload,
  planUserBackfill,
} from '../user-backfill/plan-user-backfill.js';
import { collectSecurityReviews } from '../user-backfill/reconcile-security.js';
import { runUserBackfill, verifyUserParity } from '../user-backfill/run-user-backfill.js';
import type {
  AuthUserSnapshot,
  PostgresUserSnapshot,
  UserBackfillDeps,
} from '../user-backfill/types.js';

const authUser = (overrides: Partial<AuthUserSnapshot> = {}): AuthUserSnapshot => ({
  uid: 'firebase-uid-1',
  email: 'user@example.com',
  displayName: 'User One',
  photoURL: null,
  phoneNumber: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  disabled: false,
  ...overrides,
});

const postgresUser = (overrides: Partial<PostgresUserSnapshot> = {}): PostgresUserSnapshot => ({
  id: 'firebase-uid-1',
  email: 'user@example.com',
  legacyFirebaseUid: null,
  name: 'User One',
  displayName: 'User One',
  phone: null,
  role: 'investor',
  accountType: 'investor',
  timezone: null,
  avatarUrl: null,
  companyName: null,
  syntheticAgent: false,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
  ...overrides,
});

describe('user backfill planning', () => {
  it('preserves existing Firestore user as no-op when complete', () => {
    const plan = planUserBackfill({
      auth: authUser(),
      existingFirestore: {
        uid: 'firebase-uid-1',
        email: 'user@example.com',
        displayName: 'User One',
        name: 'User One',
        accountType: 'investor',
        role: 'investor',
        legacyFirebaseUid: 'firebase-uid-1',
      },
      postgresIndex: indexPostgresUsers([postgresUser()]),
    });
    expect(plan.proposedAction).toBe('no-op');
    expect(plan.fieldsToWrite).toEqual([]);
  });

  it('creates missing user from Postgres profile', () => {
    const plan = planUserBackfill({
      auth: authUser(),
      existingFirestore: null,
      postgresIndex: indexPostgresUsers([postgresUser({ companyName: 'Acme' })]),
    });
    expect(plan.proposedAction).toBe('create');
    expect(plan.payload?.accountType).toBe('investor');
    expect(plan.payload?.companyName).toBe('Acme');
    expect(plan.payload?.uid).toBe('firebase-uid-1');
  });

  it('provisions Auth-only user when Postgres has no match', () => {
    const plan = planUserBackfill({
      auth: authUser({ uid: 'auth-only', email: 'new@example.com' }),
      existingFirestore: null,
      postgresIndex: indexPostgresUsers([]),
    });
    expect(plan.proposedAction).toBe('create');
    expect(plan.authFallback).toBe(true);
    expect(plan.payload?.email).toBe('new@example.com');
    expect(plan.payload?.accountType).toBe('investor');
  });

  it('skips ambiguous email matches', () => {
    const index = indexPostgresUsers([
      postgresUser({ id: 'pg-1', email: 'dup@example.com' }),
      postgresUser({ id: 'pg-2', email: 'dup@example.com' }),
    ]);
    const match = resolvePostgresMatch(authUser({ email: 'dup@example.com' }), index);
    expect(match.kind).toBe('ambiguous_email');
    const plan = planUserBackfill({
      auth: authUser({ uid: 'auth-1', email: 'dup@example.com' }),
      existingFirestore: null,
      postgresIndex: index,
    });
    expect(plan.proposedAction).toBe('ambiguous');
  });

  it('flags email/uid conflict without auto-linking', () => {
    const plan = planUserBackfill({
      auth: authUser({ uid: 'auth-new', email: 'shared@example.com' }),
      existingFirestore: null,
      postgresIndex: indexPostgresUsers([
        postgresUser({ id: 'old-postgres-id', email: 'shared@example.com' }),
      ]),
    });
    expect(plan.proposedAction).toBe('conflict');
    expect(plan.conflictReasons[0]).toContain('email_uid_mismatch');
  });

  it('does not auto-elevate admin from Postgres on create', () => {
    const plan = planUserBackfill({
      auth: authUser(),
      existingFirestore: null,
      postgresIndex: indexPostgresUsers([
        postgresUser({ accountType: 'admin', role: 'admin' }),
      ]),
    });
    expect(plan.payload?.accountType).toBe('investor');
    expect(plan.payload?.role).toBeNull();
    expect(plan.securityReviews).toContain('postgres_admin_account_type');
    expect(plan.securityReviews).toContain('postgres_admin_role');
  });

  it('fills only missing fields on existing Firestore doc', () => {
    const { payload, fields } = buildFillMissingPayload({
      existing: {
        uid: 'firebase-uid-1',
        email: 'user@example.com',
        accountType: 'investor',
      },
      auth: authUser({ displayName: 'From Auth', phoneNumber: '+15551212' }),
      postgres: postgresUser({ companyName: 'Acme Corp', timezone: 'America/New_York' }),
    });
    expect(fields).toEqual(
      expect.arrayContaining(['displayName', 'name', 'phone', 'companyName', 'timezone']),
    );
    expect(payload.accountType).toBeUndefined();
    expect(payload.email).toBeUndefined();
  });

  it('preserves Firestore admin over Postgres non-admin mismatch', () => {
    const reviews = collectSecurityReviews({
      firestore: { accountType: 'admin', role: 'admin' },
      postgres: postgresUser({ accountType: 'investor', role: 'investor' }),
    });
    expect(reviews).toContain('firestore_admin_mismatch');
  });

  it('maps legacy Firebase UID from Postgres', () => {
    const index = indexPostgresUsers([
      postgresUser({ id: 'neon-id', legacyFirebaseUid: 'firebase-uid-1', email: 'legacy@example.com' }),
    ]);
    const match = resolvePostgresMatch(authUser({ uid: 'firebase-uid-1' }), index);
    expect(match.kind).toBe('by_legacy_uid');
  });

  it('preserves createdAt from Postgres on create payload', () => {
    const payload = buildCreatePayload({
      auth: authUser({ createdAt: new Date('2025-01-01T00:00:00.000Z') }),
      postgres: postgresUser({ createdAt: new Date('2024-06-01T00:00:00.000Z') }),
    });
    expect(payload.createdAt).toEqual(new Date('2024-06-01T00:00:00.000Z'));
  });
});

describe('user backfill runner', () => {
  it('dry-run performs no writes', async () => {
    const write = jest.fn();
    const deps: UserBackfillDeps = {
      listAuthUsers: async () => [authUser()],
      listPostgresUsers: async () => [],
      getFirestoreUser: async () => null,
      writeFirestoreUser: write,
    };
    await runUserBackfill({ dryRun: true, deps, logger: () => {} });
    expect(write).not.toHaveBeenCalled();
  });

  it('execute is idempotent on rerun (create then no-op)', async () => {
    const store = new Map<string, Record<string, unknown>>();
    const deps: UserBackfillDeps = {
      listAuthUsers: async () => [authUser()],
      listPostgresUsers: async () => [postgresUser()],
      getFirestoreUser: async (uid) => store.get(uid) ?? null,
      writeFirestoreUser: async (uid, payload, mode) => {
        if (mode === 'create' && !store.has(uid)) {
          store.set(uid, payload);
          return;
        }
        store.set(uid, { ...store.get(uid), ...payload });
      },
    };

    await runUserBackfill({ dryRun: false, deps, logger: () => {} });
    expect(store.size).toBe(1);

    const second = await runUserBackfill({ dryRun: false, deps, logger: () => {} });
    expect(second.executed?.migrated).toBe(0);
    expect(second.counts.noOp).toBe(1);
  });

  it('verify parity reports missing Firestore docs', async () => {
    const deps: UserBackfillDeps = {
      listAuthUsers: async () => [authUser(), authUser({ uid: 'missing-2', email: 'b@example.com' })],
      listPostgresUsers: async () => [],
      getFirestoreUser: async (uid) => (uid === 'firebase-uid-1' ? { uid, email: 'user@example.com' } : null),
      writeFirestoreUser: async () => {},
      countFirestoreUsers: async () => 1,
    };
    const report = await verifyUserParity(deps);
    expect(report.authUsers).toBe(2);
    expect(report.missingFirestoreDoc).toEqual(['missing-2']);
  });
});
