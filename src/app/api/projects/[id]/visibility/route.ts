import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

/* ═══════════════════════════════════════════════════════════════════════════
   PATCH /api/projects/[id]/visibility   { isPublic: boolean }
   ───────────────────────────────────────────────────────────────────────────
   Publishes or unpublishes a deal on the owner's marketplace profile.

   Security:
   - Auth required; the caller is taken from the VERIFIED token.
   - OWNERSHIP IS CHECKED: only the project's owner may change its visibility.
     Without this, any authenticated user could publish someone else's private
     deal to their own profile.
   - The route writes exactly one boolean. Redaction of what publishing exposes
     lives in `publicDealsFor`, applied at read time, so no financial field is
     ever copied into a "public" document.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Project id required.' }, { status: 400 });

  let body: { isPublic?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body.isPublic !== 'boolean') {
    return NextResponse.json({ error: 'isPublic must be a boolean.' }, { status: 400 });
  }

  try {
    const ref = adminDb.collection('projects').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const data = snap.data() as Record<string, unknown>;
    const owner = (data.ownerUid as string) ?? (data.userId as string) ?? null;
    if (owner && owner !== auth.uid) {
      // Deliberately 403, not 404: the caller already knows it exists.
      return NextResponse.json(
        { error: 'Only the project owner can change its visibility.' },
        { status: 403 },
      );
    }

    await ref.set(
      { isPublicOnMarketplace: body.isPublic, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    return NextResponse.json({ isPublicOnMarketplace: body.isPublic });
  } catch (err) {
    console.error('[api/projects/[id]/visibility] failed', err);
    return NextResponse.json({ error: 'Could not update visibility.' }, { status: 500 });
  }
}
