import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, projectId, updates } = body;

    if (!idToken || !projectId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: idToken, projectId, updates' },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const dealRef = adminDb.collection('projects').doc(projectId);
    const dealSnap = await dealRef.get();
    
    if (!dealSnap.exists) {
        return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
    }

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const profile = userSnap.exists ? userSnap.data() : null;
    const targetOrgId = dealSnap.data()?.organizationId;
    let hasAccess = false;
    if (targetOrgId && profile) {
      if (profile.personalOrganizationId === targetOrgId) hasAccess = true;
      else if (profile.organizationId === targetOrgId) hasAccess = true;
      else if (profile.memberships && profile.memberships[targetOrgId]) hasAccess = true;
    }

    // Tenant check
    if (!hasAccess) {
        return NextResponse.json({ error: 'Cross-tenant access denied.' }, { status: 403 });
    }

    const currentData = dealSnap.data()?.rehab || {};
    
    await dealRef.update({
      rehab: {
         ...currentData,
         ...updates
      },
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Rehab Module Update] Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update rehab module.', details: error.message },
      { status: 500 },
    );
  }
}
