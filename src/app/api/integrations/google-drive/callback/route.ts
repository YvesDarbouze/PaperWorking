import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getDriveProvider, RealDriveProvider, verifyState } from '@/lib/providers/integrations/googleDrive';
import { FieldValue } from 'firebase-admin/firestore';

/* ═══════════════════════════════════════════════════════════════
   GET /api/integrations/google-drive/callback
   ───────────────────────────────────────────────────────────────
   Handles the OAuth2 callback from Google.

   Flow:
   1. Google redirects here with ?code=...&state=...
   2. State is verified (HMAC + timestamp TTL) — contains uid.
   3. Code is exchanged for tokens server-side.
   4. Connected status + email written to Firestore:
      users/{uid}/integrations/google_drive
   5. Returns a minimal HTML page that posts a message to the
      opener window and closes itself (popup pattern).

   Security:
   - State is HMAC-signed — forged or replayed states are rejected.
   - Refresh token stored in Firestore server-side, never in client.
   - No secrets appear in the response.
   ═══════════════════════════════════════════════════════════════ */

function closePopup(success: boolean, errorMsg?: string): NextResponse {
  const message = success
    ? { type: 'google-drive-connected', success: true }
    : { type: 'google-drive-connected', success: false, error: errorMsg ?? 'Unknown error' };

  const html = `<!DOCTYPE html>
<html>
<head><title>Connecting…</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0a0b;color:#9E9DA0;">
  <p>${success ? 'Connected! Closing…' : `Error: ${errorMsg}`}</p>
  <script>
    try {
      window.opener && window.opener.postMessage(${JSON.stringify(message)}, window.location.origin);
    } catch(e) {}
    setTimeout(() => window.close(), 800);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: success ? 200 : 400,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return closePopup(false, `Google OAuth error: ${error}`);
  }

  if (!code || !state) {
    return closePopup(false, 'Missing code or state parameter');
  }

  try {
    const provider = getDriveProvider();

    let uid: string;
    let email: string;
    let refreshToken: string | null = null;

    if (provider instanceof RealDriveProvider) {
      const result = await provider.exchangeCodeWithTokens(code, state);
      uid          = result.uid;
      email        = result.email;
      refreshToken = result.refreshToken;
    } else {
      // Mock provider — verifyState handles CSRF check, exchangeCode returns fixed email
      const result = await provider.exchangeCode(code, state);
      uid   = result.uid;
      email = result.email;
    }

    // Store refresh token in a server-only subcollection (never readable by the client)
    if (refreshToken) {
      await adminDb
        .collection('users')
        .doc(uid)
        .collection('integrations_private')
        .doc('google_drive')
        .set({ refreshToken, updatedAt: FieldValue.serverTimestamp() });
    }

    // Public connection status — client reads this via /api/integrations/status
    await adminDb
      .collection('users')
      .doc(uid)
      .collection('integrations')
      .doc('google_drive')
      .set({ connected: true, email, updatedAt: FieldValue.serverTimestamp() });

    return closePopup(true);
  } catch (err: any) {
    console.error('[drive/callback]', err.message);
    return closePopup(false, err.message ?? 'Token exchange failed');
  }
}
