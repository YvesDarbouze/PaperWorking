import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, projectId, todos } = body;

    if (!idToken || !projectId || !todos) {
      return NextResponse.json(
        { error: 'Missing required fields: idToken, projectId, todos' },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const dealSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!dealSnap.exists) {
        return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
    }

    // Tenant check
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (userSnap.exists && dealSnap.data()?.organizationId !== userSnap.data()?.organizationId) {
        return NextResponse.json({ error: 'Cross-tenant access denied.' }, { status: 403 });
    }

    await adminDb.collection('projects').doc(projectId).update({
      actionItems: todos,
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Action Items Update] Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update action items.', details: error.message },
      { status: 500 },
    );
  }
}
