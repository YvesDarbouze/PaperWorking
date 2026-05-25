import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Initialize Admin
const serviceAccountKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: serviceAccountKey,
    })
  });
}
const adminDb = admin.firestore();
const adminAuth = admin.auth();

// Initialize Client SDK
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
};
const clientApp = initializeApp(firebaseConfig);
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);

// Test Data
const ORG_A_ID = 'test_org_a_123';
const ORG_B_ID = 'test_org_b_456';
const PROJECT_A1_ID = 'test_proj_a1';
const PROJECT_B1_ID = 'test_proj_b1';
const USER_A_OWNER_UID = 'test_uid_a_owner';
const USER_A_MEMBER_UID = 'test_uid_a_member';
const USER_B_OWNER_UID = 'test_uid_b_owner';

async function setupTestData() {
  console.log('Setting up test data...');
  // 1. Create Orgs
  await adminDb.collection('organizations').doc(ORG_A_ID).set({ ownerUid: USER_A_OWNER_UID, name: 'Org A' });
  await adminDb.collection('organizations').doc(ORG_B_ID).set({ ownerUid: USER_B_OWNER_UID, name: 'Org B' });

  // 2. Create Users
  await adminAuth.createUser({ uid: USER_A_OWNER_UID, email: 'owner_a@test.com' }).catch(() => {});
  await adminAuth.createUser({ uid: USER_A_MEMBER_UID, email: 'member_a@test.com' }).catch(() => {});
  await adminAuth.createUser({ uid: USER_B_OWNER_UID, email: 'owner_b@test.com' }).catch(() => {});

  // 3. User Docs
  await adminDb.collection('users').doc(USER_A_OWNER_UID).set({ email: 'owner_a@test.com', organizationId: ORG_A_ID, role: 'Lead Investor', subscriptionPlan: 'Team', subscriptionStatus: 'active' });
  await adminDb.collection('users').doc(USER_A_MEMBER_UID).set({ email: 'member_a@test.com', organizationId: ORG_A_ID, role: 'Analyst', subscriptionPlan: 'Team', subscriptionStatus: 'active', memberships: { [ORG_A_ID]: 'Analyst' } });
  await adminDb.collection('users').doc(USER_B_OWNER_UID).set({ email: 'owner_b@test.com', organizationId: ORG_B_ID, role: 'Lead Investor', subscriptionPlan: 'Team', subscriptionStatus: 'active' });

  // 4. Create Projects
  await adminDb.collection('projects').doc(PROJECT_A1_ID).set({ ownerUid: USER_A_OWNER_UID, organizationId: ORG_A_ID, members: { [USER_A_OWNER_UID]: { role: 'Lead Investor' }, [USER_A_MEMBER_UID]: { role: 'Analyst' } }, status: 'open' });
  await adminDb.collection('projects').doc(PROJECT_B1_ID).set({ ownerUid: USER_B_OWNER_UID, organizationId: ORG_B_ID, members: { [USER_B_OWNER_UID]: { role: 'Lead Investor' } }, status: 'open' });
  
  console.log('Test data setup complete.');
}

async function cleanupTestData() {
  console.log('Cleaning up test data...');
  await adminDb.collection('organizations').doc(ORG_A_ID).delete();
  await adminDb.collection('organizations').doc(ORG_B_ID).delete();
  await adminDb.collection('users').doc(USER_A_OWNER_UID).delete();
  await adminDb.collection('users').doc(USER_A_MEMBER_UID).delete();
  await adminDb.collection('users').doc(USER_B_OWNER_UID).delete();
  await adminDb.collection('projects').doc(PROJECT_A1_ID).delete();
  await adminDb.collection('projects').doc(PROJECT_B1_ID).delete();
  
  await adminAuth.deleteUser(USER_A_OWNER_UID).catch(() => {});
  await adminAuth.deleteUser(USER_A_MEMBER_UID).catch(() => {});
  await adminAuth.deleteUser(USER_B_OWNER_UID).catch(() => {});
  console.log('Cleanup complete.');
}

async function loginAs(uid: string) {
  const token = await adminAuth.createCustomToken(uid);
  await signInWithCustomToken(clientAuth, token);
}

async function runTests() {
  try {
    await setupTestData();
    
    // Test 1: Tenant Isolation
    // Member A should be able to read Project A1, but NOT Project B1
    await loginAs(USER_A_MEMBER_UID);
    try {
      const snapA1 = await getDoc(doc(clientDb, 'projects', PROJECT_A1_ID));
      console.log('Tenant Isolation (Allowed Read):', snapA1.exists() ? 'PASS' : 'FAIL (Not found)');
    } catch (e: any) {
      console.log('Tenant Isolation (Allowed Read): FAIL', e.message);
    }

    try {
      await getDoc(doc(clientDb, 'projects', PROJECT_B1_ID));
      console.log('Tenant Isolation (Denied Read): FAIL (Should have thrown permission denied)');
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        console.log('Tenant Isolation (Denied Read): PASS');
      } else {
        console.log('Tenant Isolation (Denied Read): ERROR', e.message);
      }
    }

    // Test 2: Permission Enforcement
    // Analyst cannot update projects
    try {
      await updateDoc(doc(clientDb, 'projects', PROJECT_A1_ID), { status: 'closed_won' });
      console.log('Permission Enforcement (Analyst Update): FAIL (Should have thrown)');
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        console.log('Permission Enforcement (Analyst Update): PASS');
      } else {
        console.log('Permission Enforcement (Analyst Update): ERROR', e.message);
      }
    }

  } finally {
    await cleanupTestData();
    process.exit(0);
  }
}

runTests().catch(console.error);
