import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';
import { adminDb } from '@/lib/firebase/admin';
import { filterTimelineForUser } from '@/lib/invitations/activityTimeline';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;
    const email = auth.token.email;

    // Direct database lookup for Vendor role block
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    if (userData && (userData.role === 'Vendor' || userData.accountType === 'vendor')) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const { id: projectId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, email);
    let isAuthorized = !!access;
    let isLeadInvestorOrTeammate = false;

    if (access) {
      isLeadInvestorOrTeammate =
        access.role === 'Lead Investor' ||
        access.role === 'GP' ||
        access.role === 'General Contractor';
    } else {
      // Check if they are an invitee by checking invitations
      const userSnap = await adminDb.collection('users').doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() : null;
      const claimedEmails: string[] = userData?.claimedEmails || [];
      const allUserEmails = [
        email?.toLowerCase().trim(),
        ...claimedEmails.map((e) => e.toLowerCase().trim()),
      ].filter(Boolean) as string[];

      if (allUserEmails.length > 0) {
        for (const userEmail of allUserEmails) {
          const invSnap = await adminDb
            .collection('dealInvitations')
            .where('projectId', '==', projectId)
            .where('inviteeEmail', '==', userEmail)
            .limit(1)
            .get();
          if (!invSnap.empty) {
            isAuthorized = true;
            break;
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Retrieve all timeline events for this project
    const activitiesSnap = await adminDb
      .collection('dealActivityTimeline')
      .where('projectId', '==', projectId)
      .get();

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

    // Sort descending by date
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter securely for non-leadInvestors
    const filtered = await filterTimelineForUser(
      activities as any,
      uid,
      email || '',
      isLeadInvestorOrTeammate
    );

    return NextResponse.json({ timeline: filtered });
  } catch (err: any) {
    console.error('[Timeline GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}
