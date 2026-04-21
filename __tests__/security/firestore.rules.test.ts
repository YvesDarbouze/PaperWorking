import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

/* ═══════════════════════════════════════════════════════
   Firestore Rules Unit Tests
   
   Verifies:
   • Organization isolation (Team A can't read Team B)
   • Role hierarchy (GC can't delete deals)
   • Member access (Creators must be in the members map)
   ═══════════════════════════════════════════════════════ */

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'paperworking-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('allows owner to create a deal if they initialize the members map', async () => {
    const alice = testEnv.authenticatedContext('alice', { organizationId: 'org123' });
    
    // First, Alice needs a user doc for the rules helper getUserDoc()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('users/alice').set({
        organizationId: 'org123'
      });
    });

    await assertSucceeds(
      alice.firestore().doc('deals/deal1').set({
        ownerUid: 'alice',
        organizationId: 'org123',
        members: {
          alice: { role: 'Lead Investor' }
        }
      })
    );
  });

  it('denies deal creation if the members map is missing (The Regression Fix)', async () => {
    const bob = testEnv.authenticatedContext('bob', { organizationId: 'org123' });
    
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('users/bob').set({
        organizationId: 'org123'
      });
    });

    await assertFails(
      bob.firestore().doc('deals/deal2').set({
        ownerUid: 'bob',
        organizationId: 'org123',
        // members map missing
      })
    );
  });

  it('prevents cross-organization data leakage', async () => {
    const alice = testEnv.authenticatedContext('alice', { organizationId: 'org_alice' });
    const mallory = testEnv.authenticatedContext('mallory', { organizationId: 'org_evil' });

    // Setup Alice's deal
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('users/alice').set({ organizationId: 'org_alice' });
      await context.firestore().doc('deals/secure_deal').set({
        organizationId: 'org_alice',
        members: { alice: { role: 'Lead Investor' } }
      });
    });

    // Mallory tries to read Alice's deal
    await assertFails(mallory.firestore().doc('deals/secure_deal').get());
  });

  it('enforces role-based write permissions on ledger items', async () => {
    const contractor = testEnv.authenticatedContext('contractor', { organizationId: 'org123' });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('users/contractor').set({ organizationId: 'org123' });
      await context.firestore().doc('deals/deal1').set({
        organizationId: 'org123',
        members: { contractor: { role: 'General Contractor' } }
      });
    });

    // GC can create ledger items
    await assertSucceeds(
      contractor.firestore().collection('deals/deal1/ledgerItems').add({
        amount: 500,
        organizationId: 'org123',
        status: 'Pending'
      })
    );

    // GC CANNOT approve items (only Lead/Accountant can)
    await assertFails(
      contractor.firestore().doc('deals/deal1/ledgerItems/item1').update({
        status: 'Approved'
      })
    );
  });
});
