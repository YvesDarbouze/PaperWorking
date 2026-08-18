import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';

export interface User360Data {
  identity: {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    disabled: boolean;
    role: string;
    accountType: string;
    createdAt: string;
    lastLoginAt: string;
    customClaims: Record<string, unknown>;
  };
  billing: {
    stripeCustomerId: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    mrr: number;
    nextBillingDate: string | null;
    paymentMethod: string | null;
  };
  plaidConnections: Array<{
    id: string;
    itemId: string;
    institutionName: string;
    accountMask: string | null;
    status: string;
    syncErrorCount: number;
    lastSyncErrorMessage: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  organizations: Array<{
    organizationId: string;
    projectId: string;
    projectDisplayName: string;
    role: string;
    invitedAt: string;
    acceptedAt: string | null;
  }>;
  activityTimeline: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
    severity: string;
    source: 'audit_log' | 'gate_event';
  }>;
}

/**
 * User 360 Data Federation Engine (Amendment B & D)
 * Real-time read-only federation from Firebase Auth, Firestore, Prisma PostgreSQL, and Plaid connections.
 */
export async function fetchUser360Data(targetUid: string): Promise<User360Data | null> {
  try {
    // 1. Firebase Auth user object
    let authUser: Record<string, unknown> | null = null;
    try {
      authUser = (await adminAuth.getUser(targetUid)) as unknown as Record<string, unknown>;
    } catch {
      // Fallback if not found in Firebase Auth directly
    }

    // 2. Firestore profile document
    const userDoc = await adminDb.collection('users').doc(targetUid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const email = (authUser?.email as string) || userData?.email || '';
    const displayName = userData?.displayName || userData?.name || (authUser?.displayName as string) || email.split('@')[0] || 'Unknown';
    const role = userData?.role || userData?.profile?.role || ((authUser?.customClaims as Record<string, string>)?.role) || 'investor';
    const accountType = userData?.accountType || 'investor';
    const disabled = (authUser?.disabled as boolean) || false;
    const emailVerified = (authUser?.emailVerified as boolean) || false;

    // Dates
    const meta = authUser?.metadata as { creationTime?: string; lastSignInTime?: string } | undefined;
    const creationTime = meta?.creationTime;
    const createdAt = creationTime
      ? new Date(creationTime).toISOString()
      : userData?.createdAt?.toDate
      ? userData.createdAt.toDate().toISOString()
      : new Date().toISOString();

    const lastSignInTime = meta?.lastSignInTime;
    const lastLoginAt = lastSignInTime
      ? new Date(lastSignInTime).toISOString()
      : userData?.lastLoginAt?.toDate
      ? userData.lastLoginAt.toDate().toISOString()
      : createdAt;

    // 3. Billing details (read from Firestore profile per Amendment B)
    const stripeCustomerId = userData?.stripeCustomerId || null;
    const subscriptionPlan = userData?.subscriptionPlan || 'Individual';
    const subscriptionStatus = userData?.subscriptionStatus || 'inactive';

    // 4. Plaid Connections from Prisma
    let plaidConnections: User360Data['plaidConnections'] = [];
    try {
      if (prisma && prisma.plaidConnection) {
        const conns = await prisma.plaidConnection.findMany({
          where: { userId: targetUid },
          orderBy: { createdAt: 'desc' },
        });

        plaidConnections = conns.map((c) => ({
          id: c.id,
          itemId: c.itemId,
          institutionName: c.institutionName || 'Bank Account',
          accountMask: c.accountMask || null,
          status: c.status,
          syncErrorCount: c.syncErrorCount,
          lastSyncErrorMessage: c.lastSyncErrorMessage || null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        }));
      }
    } catch {
      // Fallback
    }

    // 5. Organizations & Collaborations from Prisma ProjectCollaborator (Amendment D)
    let organizations: User360Data['organizations'] = [];
    try {
      if (prisma && prisma.projectCollaborator) {
        const collabs = await prisma.projectCollaborator.findMany({
          where: { userId: targetUid },
          include: { project: true },
          orderBy: { invitedAt: 'desc' },
        });

        organizations = collabs.map((c) => ({
          organizationId: ((c.project as unknown as Record<string, unknown>)?.entityName as string) || ((c.project as unknown as Record<string, unknown>)?.createdById as string) || `org_${c.projectId}`,
          projectId: c.projectId,
          projectDisplayName: c.project?.displayName || c.project?.addressLine || 'Property Project',
          role: c.role,
          invitedAt: c.invitedAt.toISOString(),
          acceptedAt: c.acceptedAt ? c.acceptedAt.toISOString() : null,
        }));
      }
    } catch {
      // Fallback
    }

    // 6. Federated Activity Timeline (PostgreSQL AdminAuditLog + Firestore gate_events)
    const activityTimeline: User360Data['activityTimeline'] = [];

    // Audit logs from Postgres
    try {
      if (prisma && prisma.adminAuditLog) {
        const auditLogs = await prisma.adminAuditLog.findMany({
          where: { actorUid: targetUid },
          orderBy: { timestamp: 'desc' },
          take: 50,
        });

        auditLogs.forEach((l) => {
          activityTimeline.push({
            id: l.id,
            action: l.action,
            details: l.reasonCode ? `Reason: ${l.reasonCode}` : (l.metadata ? JSON.stringify(l.metadata) : 'Executed successfully'),
            timestamp: l.timestamp.toISOString(),
            severity: l.severity,
            source: 'audit_log',
          });
        });
      }
    } catch {
      // Fallback
    }

    // Gate events from Firestore
    try {
      const gateSnap = await adminDb
        .collection('gate_events')
        .where('userUid', '==', targetUid)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      gateSnap.docs.forEach((doc) => {
        const d = doc.data();
        const ts = d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : new Date().toISOString();
        activityTimeline.push({
          id: doc.id,
          action: d.eventType || 'gate_transition',
          details: d.notes || d.fromPhase ? `${d.fromPhase} -> ${d.toPhase}` : 'Gate phase updated',
          timestamp: ts,
          severity: 'info',
          source: 'gate_event',
        });
      });
    } catch {
      // Gate events fallback
    }

    // Sort federated timeline descending
    activityTimeline.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

    return {
      identity: {
        uid: targetUid,
        email,
        displayName,
        emailVerified,
        disabled,
        role,
        accountType,
        createdAt,
        lastLoginAt,
        customClaims: (authUser?.customClaims as Record<string, unknown>) || {},
      },
      billing: {
        stripeCustomerId,
        subscriptionPlan,
        subscriptionStatus,
        mrr: subscriptionPlan === 'Team' ? 120 : subscriptionPlan === 'Vendor Network' ? 250 : 0,
        nextBillingDate: null,
        paymentMethod: null,
      },
      plaidConnections,
      organizations,
      activityTimeline,
    };
  } catch (error) {
    console.error('[fetchUser360Data] Failed:', error);
    return null;
  }
}
