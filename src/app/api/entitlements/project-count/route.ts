import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   GET /api/entitlements/project-count

   Returns the number of non-archived projects owned by
   the authenticated user. Used by useEntitlements to
   display project limit hints client-side.
   ═══════════════════════════════════════════════════════ */

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const projectsSnap = await adminDb
      .collection('projects')
      .where('ownerUid', '==', uid)
      .where('status', '!=', 'archived')
      .get();

    return NextResponse.json({ count: projectsSnap.size });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Entitlements project-count] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to fetch project count' },
      { status: 500 }
    );
  }
}
