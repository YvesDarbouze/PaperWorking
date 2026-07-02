import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { getDriveProvider } from '@/lib/providers/integrations/googleDrive';

/* ═══════════════════════════════════════════════════════════════
   GET /api/integrations/google-drive/authorize
   ───────────────────────────────────────────────────────────────
   Returns the Google consent-page URL for the authenticated user.
   The state parameter is HMAC-signed with WORKER_SECRET so the
   callback can verify it belongs to this user.

   Security:
   - Requires valid Firebase ID token (rejected → 401).
   - GOOGLE_CLIENT_SECRET never leaves the server.
   - State is signed; replayed or forged states are rejected.
   ═══════════════════════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const provider = getDriveProvider();
    const authUrl  = provider.getAuthUrl(auth.uid);
    return NextResponse.json({ authUrl });
  } catch (err: any) {
    console.error('[drive/authorize]', err.message);
    return NextResponse.json({ error: err.message ?? 'Failed to build auth URL' }, { status: 500 });
  }
}
