/**
 * Synthetic Investor Crew — Foundation & Governance Unit Tests
 *
 * Tests:
 * 1. Persona roster complete (all 9 present, strategy fixtures valid, tier mapping resolves to real PLAN_CATALOG plan IDs).
 * 2. Teardown ordering & idempotency functions.
 * 3. Test-account governance exclusions (analytics stats exclude test accounts, email dispatcher no-ops).
 */

import { PERSONA_ROSTER, type PersonaKey } from '../../crew/personas';
import { resolvePersonaPlan, isCrewEmail, isTestAccount, PERSONA_PLAN_MAP } from '../../crew/config';
import { TEARDOWN_COLLECTION_ORDER, isCrewDocument, executeTeardown } from '../../crew/teardown';
import { PLAN_CATALOG } from '../lib/stripe/plans';
import { getAdminUserStats } from '../actions/admin';
import { TransactionNotificationService } from '../lib/notifications/transactionNotifications';

// Mock Firebase Admin and next/headers for admin auth in unit tests
var mockVerifyIdToken = jest.fn();
var mockUserDocGet = jest.fn();
var mockCollectionGet = jest.fn();

jest.mock('../lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (name: string) => {
      if (name === 'users') {
        return {
          doc: () => ({ get: mockUserDocGet }),
          get: mockCollectionGet,
        };
      }
      return { get: mockCollectionGet };
    },
  },
}));

jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn((name: string) => (name === '__session' ? { value: 'valid-admin-session' } : undefined)),
  }),
}));

describe('Synthetic Crew Foundation & Governance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'admin-user-1' });
    mockUserDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'Platform Admin' }),
    });
  });

  describe('Persona Definitions & Fixture Determinism', () => {
    const expectedKeys: PersonaKey[] = [
      'wholesaler',
      'fix_flipper',
      'buy_hold',
      'multifamily_landlord',
      'land_developer',
      'commercial_investor',
      'brrrr_investor',
      'reit_investor',
      'syndicator',
    ];

    it('contains all 9 synthetic investor personas', () => {
      expectedKeys.forEach((key) => {
        expect(PERSONA_ROSTER[key]).toBeDefined();
        expect(PERSONA_ROSTER[key].key).toBe(key);
        expect(PERSONA_ROSTER[key].name).toBeTruthy();
        expect(PERSONA_ROSTER[key].email).toContain('+crew@paperworking.co');
      });
    });

    it('ensures each persona has >=1 strategy fixture matching their strategy numbers', () => {
      Object.values(PERSONA_ROSTER).forEach((persona) => {
        expect(persona.fixtures.length).toBeGreaterThanOrEqual(1);
        persona.fixtures.forEach((fixture) => {
          expect(fixture.id).toBeTruthy();
          expect(fixture.slug).toBeTruthy();
          expect(fixture.title).toBeTruthy();
          expect(fixture.city).toBeTruthy();
          expect(fixture.state).toBeTruthy();
        });
      });
    });

    it('resolves every persona tier key to an actual subscription plan ID in PLAN_CATALOG', () => {
      Object.keys(PERSONA_ROSTER).forEach((keyStr) => {
        const key = keyStr as PersonaKey;
        const resolved = resolvePersonaPlan(key);
        expect(PLAN_CATALOG[resolved.planId]).toBeDefined();
        expect(resolved.canonicalName).toEqual(PLAN_CATALOG[resolved.planId].canonicalName);
      });
    });

    it('ensures all 3 catalog tiers (individual, team, vendor) are represented in the crew roster', () => {
      const assignedPlans = new Set(Object.values(PERSONA_PLAN_MAP));
      expect(assignedPlans.has('individual')).toBe(true);
      expect(assignedPlans.has('team')).toBe(true);
      expect(assignedPlans.has('vendor')).toBe(true);
    });
  });

  describe('Teardown Ordering & Idempotency', () => {
    it('defines FK-safe teardown collection ordering (users last)', () => {
      expect(TEARDOWN_COLLECTION_ORDER).toContain('users');
      expect(TEARDOWN_COLLECTION_ORDER[TEARDOWN_COLLECTION_ORDER.length - 1]).toBe('users');
    });

    it('correctly identifies synthetic crew documents for deletion', () => {
      const crewUids = new Set(['uid-crew-deshawn']);
      expect(
        isCrewDocument('users', { email: 'deshawn.carter+crew@paperworking.co', is_test_account: true }, crewUids)
      ).toBe(true);
      expect(
        isCrewDocument('projects', { ownerId: 'uid-crew-deshawn' }, crewUids)
      ).toBe(true);
      expect(
        isCrewDocument('users', { email: 'john.real@gmail.com', is_test_account: false }, crewUids)
      ).toBe(false);
    });

    it('executes dry-run teardown idempotently without throwing', async () => {
      const result = await executeTeardown({ dryRun: true });
      expect(result.dryRun).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  describe('Governance Exclusions', () => {
    it('isCrewEmail identifies crew emails correctly', () => {
      expect(isCrewEmail('deshawn.carter+crew@paperworking.co')).toBe(true);
      expect(isCrewEmail('marisol.vega+crew@paperworking.co')).toBe(true);
      expect(isCrewEmail('investor@gmail.com')).toBe(false);
    });

    it('isTestAccount identifies test user documents', () => {
      expect(isTestAccount({ is_test_account: true })).toBe(true);
      expect(isTestAccount({ persona_key: 'wholesaler' })).toBe(true);
      expect(isTestAccount({ email: 'priya.raman+crew@paperworking.co' })).toBe(true);
      expect(isTestAccount({ email: 'real.user@gmail.com' })).toBe(false);
    });

    it('filters out test accounts from admin user stats calculation', async () => {
      mockCollectionGet.mockResolvedValueOnce({
        empty: false,
        size: 3,
        docs: [
          {
            id: 'real-user-1',
            data: () => ({
              displayName: 'Real Investor',
              email: 'real@investor.com',
              role: 'Investor',
              subscriptionPlan: 'Individual',
              subscriptionStatus: 'active',
              createdAt: new Date().toISOString(),
              is_test_account: false,
            }),
          },
          {
            id: 'crew-user-deshawn',
            data: () => ({
              displayName: 'Deshawn Carter',
              email: 'deshawn.carter+crew@paperworking.co',
              persona_key: 'wholesaler',
              role: 'Wholesaler',
              subscriptionPlan: 'Individual',
              subscriptionStatus: 'active',
              createdAt: new Date().toISOString(),
              is_test_account: true,
            }),
          },
          {
            id: 'crew-user-marisol',
            data: () => ({
              displayName: 'Marisol Vega',
              email: 'marisol.vega+crew@paperworking.co',
              persona_key: 'fix_flipper',
              role: 'Fix & Flipper',
              subscriptionPlan: 'Individual',
              subscriptionStatus: 'active',
              createdAt: new Date().toISOString(),
              is_test_account: true,
            }),
          },
        ],
      });

      const stats = await getAdminUserStats();
      // Total 3 docs in mock, 2 are test accounts -> totalUsers should be 1
      expect(stats.totalUsers).toBe(1);
      expect(stats.recentUsers.length).toBe(1);
      expect(stats.recentUsers[0].email).toBe('real@investor.com');
    });

    it('TransactionNotificationService skips email dispatch for synthetic test accounts', async () => {
      const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
      await TransactionNotificationService.sendEmail({
        userId: 'crew-user-1',
        to: 'deshawn.carter+crew@paperworking.co',
        subject: 'Test Notification',
        html: '<p>Test</p>',
        text: 'Test',
        templateType: 'PAYMENT_RECEIPT' as any,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Skipped outbound email for synthetic test account')
      );
      spy.mockRestore();
    });
  });
});
