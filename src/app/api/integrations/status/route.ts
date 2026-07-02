import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════════════
   GET /api/integrations/status
   ───────────────────────────────────────────────────────────────
   Returns the connected status for all user-controlled integrations
   (google_drive, mls) from Firestore. Firebase and Stripe are
   platform-level services and always connected.

   Security:
   - Requires valid Firebase ID token (rejected → 401).
   - Only reads the caller's own integration docs (uid from token).
   ═══════════════════════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const integrationsRef = adminDb
    .collection('users')
    .doc(auth.uid)
    .collection('integrations');

  const [driveSnap, mlsSnap] = await Promise.all([
    integrationsRef.doc('google_drive').get(),
    integrationsRef.doc('mls').get(),
  ]);

  return NextResponse.json({
    google_drive: driveSnap.exists
      ? { connected: driveSnap.data()?.connected ?? false, email: driveSnap.data()?.email ?? null }
      : { connected: false, email: null },
    mls: mlsSnap.exists
      ? { connected: mlsSnap.data()?.connected ?? false, provider: mlsSnap.data()?.provider ?? null }
      : { connected: false, provider: null },
  });
}
