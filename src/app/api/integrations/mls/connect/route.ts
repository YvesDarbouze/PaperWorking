import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { getMLSProvider } from '@/lib/providers/integrations/mls';
import { FieldValue } from 'firebase-admin/firestore';

/* ═══════════════════════════════════════════════════════════════
   POST /api/integrations/mls/connect
   ───────────────────────────────────────────────────────────────
   Tests the MLS connection and stores the result in Firestore.

   Security:
   - Requires valid Firebase ID token (rejected → 401).
   - BRIDGE_SERVER_TOKEN never leaves the server.
   - Provider failure is surfaced as a 502 with actionable message.
   ═══════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const provider = getMLSProvider();

  let testResult: { ok: boolean; message: string };
  try {
    testResult = await provider.testConnection();
  } catch (err: any) {
    console.error('[mls/connect] provider error:', err.message);
    return NextResponse.json(
      { error: 'MLS connection failed', detail: err.message ?? 'Provider unreachable' },
      { status: 502 }
    );
  }

  if (!testResult.ok) {
    return NextResponse.json({ error: testResult.message }, { status: 502 });
  }

  // Persist connected status so the settings page reflects the real state
  await adminDb
    .collection('users')
    .doc(auth.uid)
    .collection('integrations')
    .doc('mls')
    .set({
      connected:  true,
      provider:   provider.providerId,
      updatedAt:  FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ connected: true, message: testResult.message });
}
