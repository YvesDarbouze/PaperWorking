'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Auth helper (same pattern as other server actions)
// ---------------------------------------------------------------------------

interface VerifiedUser {
  uid: string;
  role: string;
  organizationId: string;
  accountType?: string;
  displayName?: string;
  email?: string;
  [key: string]: unknown;
}

async function verifyActionAuth(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error('Missing authentication token.');
  try {
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_AUTH === 'true' && (idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123')) {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      const uid = cookieStore.get('mock_user_uid')?.value || 'user_lead_investor_seed';
      const email = cookieStore.get('mock_user_email')?.value || 'marcus@apexcapital.io';
      const name = cookieStore.get('mock_user_name')?.value || 'Marcus Aurelius';
      const role = cookieStore.get('mock_user_role')?.value || 'Lead Investor';
      const accountType = cookieStore.get('mock_user_account_type')?.value || (role === 'Vendor' ? 'vendor' : 'investor');
      const subscriptionPlan = cookieStore.get('mock_user_subscription_plan')?.value || 'Team';
      const subscriptionStatus = subscriptionPlan === 'None' ? 'inactive' : 'active';
      const organizationId = cookieStore.get('mock_user_org_id')?.value || 'org_paperworking_seed';
      return {
        uid,
        email,
        displayName: name,
        role,
        accountType,
        subscriptionPlan,
        subscriptionStatus,
        organizationId,
      } as VerifiedUser;
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) throw new Error('User profile not found in database.');
    const userData = userSnap.data() as Record<string, unknown>;
    return { uid: decodedToken.uid, ...userData } as VerifiedUser;
  } catch (err) {
    console.error('Server Action Auth Error:', err);
    throw new Error('Unauthorized');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const globalForE2E = global as unknown as {
  e2eFollows?: Set<string>;
  e2eConsents?: Map<string, any>;
};

const e2eFollows = globalForE2E.e2eFollows || new Set<string>();
const e2eConsents = globalForE2E.e2eConsents || new Map<string, any>();

if (process.env.NODE_ENV !== 'production') {
  globalForE2E.e2eFollows = e2eFollows;
  globalForE2E.e2eConsents = e2eConsents;
}

export async function getE2EFollows() {
  return Array.from(e2eFollows);
}

export async function getE2EConsents() {
  return Object.fromEntries(e2eConsents);
}

export async function clearE2EFollows() {
  e2eFollows.clear();
}

export async function clearE2EConsents() {
  e2eConsents.clear();
}

function rejectVendor(user: VerifiedUser): void {
  if (user.accountType === 'vendor') {
    throw new Error('Deal listings are not available for vendor accounts.');
  }
}

async function getListingProjectId(listingId: string): Promise<{ projectId: string; listingData: Record<string, unknown> }> {
  const listingRef = adminDb.collection('dealListings').doc(listingId);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) throw new Error('Listing not found.');
  const listingData = listingSnap.data() as Record<string, unknown>;
  const projectId = listingData.projectId as string;
  if (!projectId) throw new Error('Listing has no associated project.');
  return { projectId, listingData };
}

// ---------------------------------------------------------------------------
// 1. followDeal
// ---------------------------------------------------------------------------

export async function followDeal(
  idToken: string,
  listingId: string,
): Promise<{ success: boolean; followId: string }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        const uid = cookieStore.get('mock_user_uid')?.value || 'user_lead_investor_seed';
        e2eFollows.add(`${uid}:${listingId}`);
        return { success: true, followId: uid };
      }
    }

    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const { projectId } = await getListingProjectId(listingId);

    // Check not already following
    const followerRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('followers')
      .doc(user.uid);
    const existing = await followerRef.get();
    if (existing.exists) {
      throw new Error('You are already following this deal.');
    }

    // Create follower doc
    await followerRef.set({
      id: user.uid,
      name: (user.displayName as string) || '',
      email: (user.email as string) || '',
      emailConsent: false,
      inAppConsent: false,
      followedAt: new Date().toISOString(),
    });

    // Increment followCount on the listing
    const listingRef = adminDb.collection('dealListings').doc(listingId);
    await listingRef.update({ followCount: FieldValue.increment(1) });

    return { success: true, followId: user.uid };
  } catch (err) {
    console.error('followDeal error:', err);
    throw err instanceof Error ? err : new Error('Failed to follow deal.');
  }
}

// ---------------------------------------------------------------------------
// 2. unfollowDeal
// ---------------------------------------------------------------------------

export async function unfollowDeal(
  idToken: string,
  listingId: string,
): Promise<{ success: boolean }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        const uid = cookieStore.get('mock_user_uid')?.value || 'user_lead_investor_seed';
        e2eFollows.delete(`${uid}:${listingId}`);
        return { success: true };
      }
    }

    const user = await verifyActionAuth(idToken);

    const { projectId } = await getListingProjectId(listingId);

    // Delete the follower doc
    const followerRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('followers')
      .doc(user.uid);
    const existing = await followerRef.get();
    if (!existing.exists) {
      throw new Error('You are not following this deal.');
    }
    await followerRef.delete();

    // Decrement followCount on the listing
    const listingRef = adminDb.collection('dealListings').doc(listingId);
    await listingRef.update({ followCount: FieldValue.increment(-1) });

    return { success: true };
  } catch (err) {
    console.error('unfollowDeal error:', err);
    throw err instanceof Error ? err : new Error('Failed to unfollow deal.');
  }
}

// ---------------------------------------------------------------------------
// 3. followInvestor
// ---------------------------------------------------------------------------

export async function followInvestor(
  idToken: string,
  investorUid: string,
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const docId = `${investorUid}_${user.uid}`;
    const followerRef = adminDb.collection('investorFollowers').doc(docId);

    // Check not already following
    const existing = await followerRef.get();
    if (existing.exists) {
      throw new Error('You are already following this investor.');
    }

    await followerRef.set({
      id: docId,
      investorUid,
      followerUid: user.uid,
      followerName: (user.displayName as string) || '',
      followerEmail: (user.email as string) || '',
      emailConsent: false,
      inAppConsent: false,
      followedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    console.error('followInvestor error:', err);
    throw err instanceof Error ? err : new Error('Failed to follow investor.');
  }
}

// ---------------------------------------------------------------------------
// 4. unfollowInvestor
// ---------------------------------------------------------------------------

export async function unfollowInvestor(
  idToken: string,
  investorUid: string,
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);

    const docId = `${investorUid}_${user.uid}`;
    const followerRef = adminDb.collection('investorFollowers').doc(docId);
    const existing = await followerRef.get();
    if (!existing.exists) {
      throw new Error('You are not following this investor.');
    }
    await followerRef.delete();

    return { success: true };
  } catch (err) {
    console.error('unfollowInvestor error:', err);
    throw err instanceof Error ? err : new Error('Failed to unfollow investor.');
  }
}

// ---------------------------------------------------------------------------
// 5. updateFollowConsent
// ---------------------------------------------------------------------------

export async function updateFollowConsent(
  idToken: string,
  collectionPath: string,
  docId: string,
  consent: { emailConsent?: boolean; inAppConsent?: boolean },
): Promise<{ success: boolean }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        const uid = cookieStore.get('mock_user_uid')?.value || 'user_lead_investor_seed';
        e2eConsents.set(`${uid}:${collectionPath}/${docId}`, consent);
        return { success: true };
      }
    }

    const user = await verifyActionAuth(idToken);

    const docRef = adminDb.doc(`${collectionPath}/${docId}`);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error('Follow record not found.');

    const data = docSnap.data() as Record<string, unknown>;

    // Validate ownership — the doc's followerUid or id must match the caller
    const ownerUid = (data.followerUid as string) || (data.id as string);
    if (ownerUid !== user.uid) {
      throw new Error('You do not own this follow record.');
    }

    // Build update payload with only the provided fields
    const updates: Record<string, boolean> = {};
    if (consent.emailConsent !== undefined) updates.emailConsent = consent.emailConsent;
    if (consent.inAppConsent !== undefined) updates.inAppConsent = consent.inAppConsent;

    if (Object.keys(updates).length === 0) {
      throw new Error('No consent fields provided.');
    }

    await docRef.update(updates);

    return { success: true };
  } catch (err) {
    console.error('updateFollowConsent error:', err);
    throw err instanceof Error ? err : new Error('Failed to update consent.');
  }
}

// ---------------------------------------------------------------------------
// 6. respondToTerms
// ---------------------------------------------------------------------------

export async function respondToTerms(
  idToken: string,
  listingId: string,
  amountCents: number,
  message?: string,
): Promise<{ success: boolean; commitmentId: string }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const { projectId } = await getListingProjectId(listingId);

    const commitmentsRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('commitments');

    const newDocRef = commitmentsRef.doc(); // auto-generated ID
    const autoId = newDocRef.id;
    const now = new Date().toISOString();

    await newDocRef.set({
      id: autoId,
      listingId,
      projectId,
      investorUid: user.uid,
      investorName: (user.displayName as string) || '',
      investorEmail: (user.email as string) || '',
      amountCents,
      message: message || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, commitmentId: autoId };
  } catch (err) {
    console.error('respondToTerms error:', err);
    throw err instanceof Error ? err : new Error('Failed to submit commitment.');
  }
}

// ---------------------------------------------------------------------------
// 7. checkFollowStatus
// ---------------------------------------------------------------------------

export async function checkFollowStatus(
  idToken: string,
  listingId: string,
): Promise<{ followingDeal: boolean; followingInvestor: boolean }> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        const uid = cookieStore.get('mock_user_uid')?.value || 'user_lead_investor_seed';
        return {
          followingDeal: e2eFollows.has(`${uid}:${listingId}`),
          followingInvestor: false,
        };
      }
    }

    const user = await verifyActionAuth(idToken);

    const { projectId, listingData } = await getListingProjectId(listingId);

    // Check deal follow
    const dealFollowerRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('followers')
      .doc(user.uid);
    const dealSnap = await dealFollowerRef.get();
    const followingDeal = dealSnap.exists;

    // Check investor follow
    let followingInvestor = false;
    const leadInvestor = listingData.leadInvestor as
      | { uid?: string }
      | undefined;
    if (leadInvestor?.uid) {
      const investorDocId = `${leadInvestor.uid}_${user.uid}`;
      const investorFollowRef = adminDb
        .collection('investorFollowers')
        .doc(investorDocId);
      const investorSnap = await investorFollowRef.get();
      followingInvestor = investorSnap.exists;
    }

    return { followingDeal, followingInvestor };
  } catch (err) {
    console.error('checkFollowStatus error:', err);
    throw err instanceof Error ? err : new Error('Failed to check follow status.');
  }
}
