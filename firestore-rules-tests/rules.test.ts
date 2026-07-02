/**
 * ══════════════════════════════════════════════════════════
 *  PaperWorking — Firestore Security Rules Tests
 *
 *  Uses @firebase/rules-unit-testing to validate security
 *  rules against the Firestore emulator.
 *
 *  Setup:
 *    1. npm install -D @firebase/rules-unit-testing firebase-admin
 *    2. npx firebase emulators:start --only firestore
 *       (or: npx firebase emulators:exec 'npx vitest run firestore-rules-tests/')
 *    3. npx vitest run firestore-rules-tests/rules.test.ts
 *
 *  Environment:
 *    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 (set automatically by emulator)
 * ══════════════════════════════════════════════════════════
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
  RulesTestContext,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';

// ─── Constants ─────────────────────────────────────────────
const PROJECT_ID = 'paperworking-test';
const RULES_PATH = resolve(__dirname, '..', 'firestore.rules');

// Test user UIDs
const OWNER_UID = 'owner-uid-001';
const ADMIN_UID = 'admin-uid-002';
const VENDOR_UID = 'vendor-uid-003';
const INVESTOR_UID = 'investor-uid-004';
const STRANGER_UID = 'stranger-uid-999';

const ORG_ID = 'org-test-001';
const PROJECT_DOC_ID = 'project-test-001';
const NOTIFICATION_ID = 'notif-test-001';

// ─── Test Environment ──────────────────────────────────────
let testEnv: RulesTestEnvironment;

// Helper: get an authenticated Firestore context
function authedDb(uid: string): ReturnType<RulesTestContext['firestore']> {
  return testEnv.authenticatedContext(uid).firestore();
}

// Helper: get an unauthenticated Firestore context
function unauthDb(): ReturnType<RulesTestContext['firestore']> {
  return testEnv.unauthenticatedContext().firestore();
}

// ─── Setup & Teardown ──────────────────────────────────────
beforeAll(async () => {
  const rules = readFileSync(RULES_PATH, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // ── Seed data via Admin context ──
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Owner user doc
    await setDoc(doc(db, 'users', OWNER_UID), {
      uid: OWNER_UID,
      email: 'owner@test.com',
      displayName: 'Test Owner',
      personalOrganizationId: ORG_ID,
      organizationId: ORG_ID,
      memberships: { [ORG_ID]: 'Lead Investor' },
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
      role: 'Lead Investor',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Admin user doc
    await setDoc(doc(db, 'users', ADMIN_UID), {
      uid: ADMIN_UID,
      email: 'admin@test.com',
      displayName: 'Test Admin',
      personalOrganizationId: ORG_ID,
      memberships: { [ORG_ID]: 'Admin' },
      subscriptionPlan: 'Team',
      subscriptionStatus: 'active',
      role: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Vendor user doc
    await setDoc(doc(db, 'users', VENDOR_UID), {
      uid: VENDOR_UID,
      email: 'vendor@test.com',
      displayName: 'Test Vendor',
      personalOrganizationId: 'org-vendor-001',
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      subscriptionStatus: 'active',
      role: 'Vendor',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Investor user doc
    await setDoc(doc(db, 'users', INVESTOR_UID), {
      uid: INVESTOR_UID,
      email: 'investor@test.com',
      displayName: 'Test Investor',
      personalOrganizationId: ORG_ID,
      memberships: { [ORG_ID]: 'Lead Investor' },
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
      role: 'Observer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Stranger user doc (no org access)
    await setDoc(doc(db, 'users', STRANGER_UID), {
      uid: STRANGER_UID,
      email: 'stranger@test.com',
      displayName: 'Stranger',
      personalOrganizationId: 'org-other-999',
      subscriptionPlan: 'None',
      subscriptionStatus: 'inactive',
      role: 'Standard',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Organization
    await setDoc(doc(db, 'organizations', ORG_ID), {
      id: ORG_ID,
      name: 'Test Org',
      ownerUid: OWNER_UID,
      accountTier: 'Team',
      subscriptionPlan: 'Team',
      subscriptionStatus: 'active',
      maxSeats: 10,
      teamMembers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Project with members map
    await setDoc(doc(db, 'projects', PROJECT_DOC_ID), {
      id: PROJECT_DOC_ID,
      organizationId: ORG_ID,
      ownerUid: OWNER_UID,
      propertyName: 'Test Property',
      address: '123 Test St',
      status: 'Active',
      members: {
        [OWNER_UID]: { uid: OWNER_UID, role: 'Lead Investor', joinedAt: new Date() },
        [ADMIN_UID]: { uid: ADMIN_UID, role: 'General Contractor', joinedAt: new Date() },
        [INVESTOR_UID]: { uid: INVESTOR_UID, role: 'Observer', joinedAt: new Date() },
      },
      financials: { purchasePrice: 200000, estimatedARV: 300000, costs: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Notification for owner
    await setDoc(doc(db, 'notifications', NOTIFICATION_ID), {
      id: NOTIFICATION_ID,
      recipientId: OWNER_UID,
      type: 'TASK_COMPLETE',
      title: 'Task completed',
      body: 'A task was completed.',
      actor: { uid: ADMIN_UID, name: 'Test Admin' },
      objectReference: { projectId: PROJECT_DOC_ID },
      urgencyLevel: 'informational',
      channels: ['in-app'],
      read: false,
      archived: false,
      createdAt: new Date(),
      deepLinkUrl: '/dashboard',
    });

    // Vendor request
    await setDoc(doc(db, `projects/${PROJECT_DOC_ID}/vendorRequests`, 'vr-001'), {
      projectId: PROJECT_DOC_ID,
      vendorUid: VENDOR_UID,
      message: 'Need a quote for plumbing',
      status: 'PENDING',
      requestedAt: new Date(),
      requestedBy: OWNER_UID,
    });

    // Property metric snapshot
    await setDoc(doc(db, 'propertyMetricSnapshots', 'pms-001'), {
      organizationId: ORG_ID,
      projectId: PROJECT_DOC_ID,
      metricId: 'roi',
      period: '2026-05',
      value: 12.5,
      createdAt: new Date(),
    });

    // Stripe event
    await setDoc(doc(db, 'stripe_events', 'evt-001'), {
      type: 'invoice.paid',
      data: { amount: 2999 },
      createdAt: new Date(),
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  TEST SUITE
// ═══════════════════════════════════════════════════════════

describe('Firestore Security Rules — PaperWorking', () => {
  // ─── 1. Owner can read own project ────────────────────
  test('1. Owner can read own project ✅', async () => {
    const db = authedDb(OWNER_UID);
    const projectRef = doc(db, 'projects', PROJECT_DOC_ID);
    await assertSucceeds(getDoc(projectRef));
  });

  // ─── 2. Owner can write to own project ────────────────
  test('2. Owner can write to own project ✅', async () => {
    const db = authedDb(OWNER_UID);
    const projectRef = doc(db, 'projects', PROJECT_DOC_ID);
    await assertSucceeds(
      updateDoc(projectRef, { propertyName: 'Updated Property Name' })
    );
  });

  // ─── 3. Admin can read assigned project ───────────────
  test('3. Team member (admin role) can read assigned project ✅', async () => {
    const db = authedDb(ADMIN_UID);
    const projectRef = doc(db, 'projects', PROJECT_DOC_ID);
    await assertSucceeds(getDoc(projectRef));
  });

  // ─── 4. Vendor cannot read unassigned project ─────────
  test('4. Vendor cannot read unassigned project ❌', async () => {
    const db = authedDb(VENDOR_UID);
    const projectRef = doc(db, 'projects', PROJECT_DOC_ID);
    await assertFails(getDoc(projectRef));
  });

  // ─── 5. Vendor can read their own vendor request ──────
  test('5. Vendor can read their own vendor request ✅', async () => {
    const db = authedDb(VENDOR_UID);
    const vrRef = doc(db, `projects/${PROJECT_DOC_ID}/vendorRequests`, 'vr-001');
    await assertSucceeds(getDoc(vrRef));
  });

  // ─── 6. Vendor can update quote fields on their request
  test('6. Vendor can submit quote on their vendor request ✅', async () => {
    const db = authedDb(VENDOR_UID);
    const vrRef = doc(db, `projects/${PROJECT_DOC_ID}/vendorRequests`, 'vr-001');
    await assertSucceeds(
      updateDoc(vrRef, {
        status: 'QUOTED',
        quotedFee: 1500,
        message: 'Here is my quote',
        quotedAt: new Date(),
      })
    );
  });

  // ─── 7. Vendor cannot update non-quote fields ─────────
  test('7. Vendor cannot modify requestedBy field ❌', async () => {
    const db = authedDb(VENDOR_UID);
    const vrRef = doc(db, `projects/${PROJECT_DOC_ID}/vendorRequests`, 'vr-001');
    await assertFails(
      updateDoc(vrRef, {
        requestedBy: VENDOR_UID, // trying to change ownership
      })
    );
  });

  // ─── 8. Anonymous user cannot read anything ───────────
  test('8. Anonymous user cannot read anything ❌', async () => {
    const db = unauthDb();
    const projectRef = doc(db, 'projects', PROJECT_DOC_ID);
    await assertFails(getDoc(projectRef));
  });

  // ─── 9. User cannot read another user's document ─────
  test('9. User cannot read another user\'s document ❌', async () => {
    const db = authedDb(OWNER_UID);
    const otherUserRef = doc(db, 'users', VENDOR_UID);
    await assertFails(getDoc(otherUserRef));
  });

  // ─── 10. Client cannot write to stripe_events ─────────
  test('10. Client cannot write to stripe_events ❌', async () => {
    const db = authedDb(OWNER_UID);
    const stripeRef = doc(db, 'stripe_events', 'evt-new');
    await assertFails(setDoc(stripeRef, { type: 'test', data: {} }));
  });

  // ─── 11. Client cannot read stripe_events ─────────────
  test('11. Client cannot read stripe_events ❌', async () => {
    const db = authedDb(OWNER_UID);
    const stripeRef = doc(db, 'stripe_events', 'evt-001');
    await assertFails(getDoc(stripeRef));
  });

  // ─── 12. Client cannot write to propertyMetricSnapshots
  test('12. Client cannot write to propertyMetricSnapshots ❌', async () => {
    const db = authedDb(OWNER_UID);
    const pmsRef = doc(db, 'propertyMetricSnapshots', 'pms-new');
    await assertFails(
      setDoc(pmsRef, {
        organizationId: ORG_ID,
        projectId: PROJECT_DOC_ID,
        metricId: 'test',
        period: '2026-06',
        value: 10,
      })
    );
  });

  // ─── 13. Owner can read propertyMetricSnapshots ────────
  test('13. Owner can read propertyMetricSnapshots for own org ✅', async () => {
    const db = authedDb(OWNER_UID);
    const pmsRef = doc(db, 'propertyMetricSnapshots', 'pms-001');
    await assertSucceeds(getDoc(pmsRef));
  });

  // ─── 14. User can read own notifications ──────────────
  test('14. User can read own notifications ✅', async () => {
    const db = authedDb(OWNER_UID);
    const notifRef = doc(db, 'notifications', NOTIFICATION_ID);
    await assertSucceeds(getDoc(notifRef));
  });

  // ─── 15. User cannot read other user's notifications ──
  test('15. User cannot read other user\'s notifications ❌', async () => {
    const db = authedDb(VENDOR_UID);
    const notifRef = doc(db, 'notifications', NOTIFICATION_ID);
    await assertFails(getDoc(notifRef));
  });

  // ─── 16. User can mark own notification as read ───────
  test('16. User can mark own notification as read ✅', async () => {
    const db = authedDb(OWNER_UID);
    const notifRef = doc(db, 'notifications', NOTIFICATION_ID);
    await assertSucceeds(
      updateDoc(notifRef, { read: true, readAt: new Date() })
    );
  });

  // ─── 17. User cannot create notifications ─────────────
  test('17. User cannot create notifications ❌', async () => {
    const db = authedDb(OWNER_UID);
    const notifRef = doc(db, 'notifications', 'notif-new');
    await assertFails(
      setDoc(notifRef, {
        recipientId: OWNER_UID,
        type: 'TASK_COMPLETE',
        title: 'Fake',
        body: 'Fake',
        read: false,
        archived: false,
        createdAt: new Date(),
      })
    );
  });

  // ─── 18. User can read own user doc ───────────────────
  test('18. User can read own user doc ✅', async () => {
    const db = authedDb(OWNER_UID);
    const userRef = doc(db, 'users', OWNER_UID);
    await assertSucceeds(getDoc(userRef));
  });

  // ─── 19. User cannot delete own user doc ──────────────
  test('19. User cannot delete own user doc ❌', async () => {
    const db = authedDb(OWNER_UID);
    const userRef = doc(db, 'users', OWNER_UID);
    await assertFails(deleteDoc(userRef));
  });

  // ─── 20. Waitlist allows anonymous create ─────────────
  test('20. Waitlist allows anonymous create ✅', async () => {
    const db = unauthDb();
    await assertSucceeds(
      addDoc(collection(db, 'waitlist'), { email: 'new@example.com' })
    );
  });

  // ─── 21. Stranger cannot read project ─────────────────
  test('21. Stranger outside org cannot read project ❌', async () => {
    const db = authedDb(STRANGER_UID);
    const projectRef = doc(db, 'projects', PROJECT_DOC_ID);
    await assertFails(getDoc(projectRef));
  });

  // ─── 22. Observer can read but not write to project ───
  test('22. Observer (investor) can read but not write project ✅/❌', async () => {
    const db = authedDb(INVESTOR_UID);
    const projectRef = doc(db, 'projects', PROJECT_DOC_ID);

    // Can read
    await assertSucceeds(getDoc(projectRef));

    // Cannot write (Observer not in allowed update roles)
    await assertFails(updateDoc(projectRef, { propertyName: 'Hacked' }));
  });

  // ─── 23. Client cannot write to teamInvitations ───────
  test('23. Client cannot write to teamInvitations ❌', async () => {
    const db = authedDb(OWNER_UID);
    const invRef = doc(db, 'teamInvitations', 'inv-new');
    await assertFails(
      setDoc(invRef, { email: 'test@test.com', status: 'pending' })
    );
  });

  // ─── 24. Client cannot write to queued_emails ─────────
  test('24. Client cannot write to queued_emails ❌', async () => {
    const db = authedDb(OWNER_UID);
    const qeRef = doc(db, 'queued_emails', 'qe-new');
    await assertFails(
      setDoc(qeRef, { recipientId: OWNER_UID, status: 'pending' })
    );
  });
});
