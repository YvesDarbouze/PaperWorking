import { adminDb } from '@/lib/firebase/admin';

export class InvitationAbuseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'InvitationAbuseError';
  }
}

/**
 * Checks if the caller's invitation privilege is currently suspended.
 */
export async function checkUserInvitationSuspended(userId: string): Promise<void> {
  const userSnap = await adminDb.collection('users').doc(userId).get();
  if (userSnap.exists) {
    const userData = userSnap.data();
    if (userData?.invitationSuspended === true) {
      throw new InvitationAbuseError(
        `Your invitation privileges have been suspended due to excessive bounces or complaints. Reason: ${userData.suspensionReason || 'USER_COMPLAINT'}. Please contact support to appeal.`,
        'SUSPENDED'
      );
    }
  }
}

/**
 * Enforces per-project (100/24h) and per-account (150/24h) invitation rate limits.
 */
export async function checkInvitationRateLimits(
  userId: string,
  projectId: string,
  newInviteesCount: number
): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Check Per-Project Rate Limit (100 per 24 hours)
  const [dealInvSnap, legacyInvSnap] = await Promise.all([
    adminDb.collection('dealInvitations')
      .where('projectId', '==', projectId)
      .get(),
    adminDb.collection('invitations')
      .where('projectId', '==', projectId)
      .get()
  ]);

  const oneDayAgoTime = oneDayAgo.getTime();

  let dealInvCount = 0;
  if (dealInvSnap) {
    const snap = dealInvSnap as any;
    const docs = 'forEach' in snap ? snap.docs : (snap.docs || []);
    docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.createdAt) {
        const createdTime = new Date(data.createdAt).getTime();
        if (createdTime >= oneDayAgoTime) {
          dealInvCount++;
        }
      }
    });
  }

  let legacyInvCount = 0;
  if (legacyInvSnap) {
    const snap = legacyInvSnap as any;
    const docs = 'forEach' in snap ? snap.docs : (snap.docs || []);
    docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.createdAt) {
        const createdTime = new Date(data.createdAt).getTime();
        if (createdTime >= oneDayAgoTime) {
          legacyInvCount++;
        }
      }
    });
  }

  const totalProjectInvites = dealInvCount + legacyInvCount;
  if (totalProjectInvites + newInviteesCount > 100) {
    throw new InvitationAbuseError(
      `Rate limit exceeded: A project is capped at 100 invitations per 24 hours. (Currently sent: ${totalProjectInvites})`,
      'RATE_LIMIT_PROJECT_EXCEEDED'
    );
  }

  // 2. Check Per-Account Rate Limit (150 per 24 hours across all projects)
  const [userDealInvSnap, userLegacyInvSnap] = await Promise.all([
    adminDb.collection('dealInvitations')
      .where('inviterUid', '==', userId)
      .get(),
    adminDb.collection('invitations')
      .where('invitedByUid', '==', userId)
      .get()
  ]);

  let userDealInvCount = 0;
  if (userDealInvSnap) {
    const snap = userDealInvSnap as any;
    const docs = 'forEach' in snap ? snap.docs : (snap.docs || []);
    docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.createdAt) {
        const createdTime = new Date(data.createdAt).getTime();
        if (createdTime >= oneDayAgoTime) {
          userDealInvCount++;
        }
      }
    });
  }

  let userLegacyInvCount = 0;
  if (userLegacyInvSnap) {
    const snap = userLegacyInvSnap as any;
    const docs = 'forEach' in snap ? snap.docs : (snap.docs || []);
    docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.createdAt) {
        const createdTime = new Date(data.createdAt).getTime();
        if (createdTime >= oneDayAgoTime) {
          userLegacyInvCount++;
        }
      }
    });
  }

  const totalAccountInvites = userDealInvCount + userLegacyInvCount;
  if (totalAccountInvites + newInviteesCount > 150) {
    throw new InvitationAbuseError(
      `Rate limit exceeded: An account is capped at 150 invitations per 24 hours across all projects. (Currently sent: ${totalAccountInvites})`,
      'RATE_LIMIT_ACCOUNT_EXCEEDED'
    );
  }
}

/**
 * Detects if a bulk list upload/invite looks purchased or non-relational (mass strangers).
 * If invitees > 5 and > 80% are strangers, flags it and logs to operator queue.
 */
export async function detectPurchasedListPattern(
  userId: string,
  projectId: string,
  invitees: string[]
): Promise<{ isSuspicious: boolean; strangersCount: number; ratio: number }> {
  if (invitees.length <= 5) {
    return { isSuspicious: false, strangersCount: 0, ratio: 0 };
  }

  let strangersCount = 0;
  for (const email of invitees) {
    const userQuery = await adminDb.collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();
    if (userQuery.empty) {
      strangersCount++;
    }
  }

  const ratio = strangersCount / invitees.length;
  const isSuspicious = ratio > 0.8;

  if (isSuspicious) {
    const details = `Suspicious bulk invitation list: ${invitees.length} recipients invited, of which ${strangersCount} (${Math.round(ratio * 100)}%) do not have accounts.`;
    await adminDb.collection('operatorQueue').add({
      type: 'PURCHASED_LIST_DETECTION',
      userId,
      projectId,
      details,
      createdAt: new Date(),
      resolved: false,
    });
  }

  return { isSuspicious, strangersCount, ratio };
}
