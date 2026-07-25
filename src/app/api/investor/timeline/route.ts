import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;
    const email = auth.token.email;
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    
    if (userData && (userData.role === 'Vendor' || userData.accountType === 'vendor')) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const claimedEmails: string[] = userData?.claimedEmails || [];
    const allUserEmails = [
      email?.toLowerCase().trim(),
      ...claimedEmails.map((e) => e.toLowerCase().trim()),
    ].filter(Boolean) as string[];

    // Fetch projects owned by this user
    const projectsSnap = await adminDb
      .collection('projects')
      .where('ownerUid', '==', uid)
      .get();
    const ownedProjectIds = new Set(projectsSnap.docs.map((d) => d.id));

    // Fetch all timeline events to filter in memory
    const activitiesSnap = await adminDb.collection('dealActivityTimeline').get();

    const activities = activitiesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        projectId: data.projectId,
        dealId: data.dealId,
        actorUid: data.actorUid,
        type: data.type,
        metadata: data.metadata || {},
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? new Date().toISOString(),
      };
    });

    // Filter in-memory securely
    const filtered = activities.filter((act) => {
      // 1. If user is the Lead Investor of the project
      if (ownedProjectIds.has(act.projectId)) {
        return true;
      }
      // 2. If user is the direct actor of this event
      if (act.actorUid === uid) {
        return true;
      }
      // 3. If user is the invitee/recipient of this event
      const inviteeEmail = act.metadata?.inviteeEmail?.toLowerCase().trim();
      if (inviteeEmail && allUserEmails.includes(inviteeEmail)) {
        return true;
      }
      return false;
    });

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ timeline: filtered });
  } catch (err: any) {
    console.error('[Investor Timeline GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch investor timeline' }, { status: 500 });
  }
}
