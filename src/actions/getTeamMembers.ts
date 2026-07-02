'use server';

import { cookies } from 'next/headers';
import type { OrgTeamMember } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   getTeamMembers — Server Action
   Fetches team members for the authenticated user's org,
   enriched with lastSeenAt from their most-recent session
   document in users/{uid}/sessions/*.
   ═══════════════════════════════════════════════════════ */

export interface TeamMembersResult {
  members: OrgTeamMember[];
  orgName: string;
  seatCount: number;
  maxSeats: number;
  accountTier: 'Individual' | 'Team';
}

const EMPTY_RESULT: TeamMembersResult = {
  members: [], orgName: '', seatCount: 0, maxSeats: 1, accountTier: 'Individual',
};

function hasAdminCredentials(): boolean {
  return !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

/**
 * Fetch the lastSeenAt ISO string from the most-recent session doc for a uid.
 * Returns null if the user has no sessions or the query fails (non-fatal).
 */
async function fetchLastSeenAt(
  adminDb: FirebaseFirestore.Firestore,
  uid: string,
): Promise<string | null> {
  try {
    const snap = await adminDb
      .collection('users')
      .doc(uid)
      .collection('sessions')
      .orderBy('lastSeenAt', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const ts = snap.docs[0].data().lastSeenAt;
    return ts?.toDate?.()?.toISOString() ?? null;
  } catch {
    // Non-fatal: missing index, permissions, etc. → honest null
    return null;
  }
}

export async function getTeamMembers(): Promise<TeamMembersResult> {
  if (!hasAdminCredentials()) return EMPTY_RESULT;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session');
    if (!sessionCookie?.value) return EMPTY_RESULT;

    const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
    const decoded = await adminAuth.verifyIdToken(sessionCookie.value);
    if (!decoded.uid) return EMPTY_RESULT;

    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const orgId = userSnap.data()?.organizationId;
    if (!orgId || orgId === 'org_placeholder') return EMPTY_RESULT;

    const orgSnap = await adminDb.collection('organizations').doc(orgId).get();
    const orgData = orgSnap.data();

    const membersSnap = await adminDb.collection('users').where('organizationId', '==', orgId).get();
    const rawMembers: OrgTeamMember[] = membersSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id, uid: d.uid || doc.id, email: d.email || '',
        displayName: d.displayName || 'User', role: d.role || 'Vendor',
        internalRole: d.internalRole || 'Deal Lead', status: d.status || 'active',
        assignedProjectIds: d.assignedProjectIds || [],
        joinedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        invitedAt: d.invitedAt?.toDate?.()?.toISOString(),
      };
    });

    // Enrich each member with their last recorded session timestamp.
    // Runs in parallel — N reads for an N-seat team (max 10 for Team tier).
    const members = await Promise.all(
      rawMembers.map(async (m) => {
        const uid = m.uid ?? m.id;
        const lastSeenAt = uid ? await fetchLastSeenAt(adminDb, uid) : null;
        return { ...m, lastSeenAt };
      }),
    );

    const active = members.filter((m) => m.status !== 'removed');
    const tier = orgData?.accountTier || (active.length > 1 ? 'Team' : 'Individual');
    return { members, orgName: orgData?.name || '', seatCount: active.length, maxSeats: tier === 'Team' ? 10 : 1, accountTier: tier };
  } catch (error) {
    console.error('[getTeamMembers] Failed:', error);
    return EMPTY_RESULT;
  }
}

