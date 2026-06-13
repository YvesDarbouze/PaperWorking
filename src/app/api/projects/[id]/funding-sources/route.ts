import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { CapitalSource } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   PATCH /api/projects/[id]/funding-sources

   Replaces the full capitalStack array on a project's
   financials with the caller-provided sources.

   Security:
   - Requires Firebase ID token (Authorization: Bearer)
   - No source of truth is client-provided identity
   - All writes use firebase-admin (server-side credentials)
   ═══════════════════════════════════════════════════════ */

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  // ── Auth ──────────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id: projectId } = await params;

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'projectId is required' },
      { status: 400 }
    );
  }

  // Verify project scope & access
  const { hasProjectAccess } = await import('@/lib/auth/scopeGuard');
  if (!(await hasProjectAccess(auth.uid, projectId))) {
    return NextResponse.json(
      { success: false, error: 'Access denied. You do not have write access to this project.' },
      { status: 403 }
    );
  }

  let body: { sources: CapitalSource[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { sources } = body;
  if (!Array.isArray(sources)) {
    return NextResponse.json(
      { success: false, error: 'sources must be an array' },
      { status: 400 }
    );
  }

  // ── Persist to Firestore ─────────────────────────────────
  try {
    await adminDb
      .collection('projects')
      .doc(projectId)
      .update({
        'financials.capitalStack': sources,
        updatedAt: FieldValue.serverTimestamp(),
      });
  } catch (err: any) {
    console.error('[funding-sources] Firestore write failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to persist funding sources' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { projectId, sources, updatedAt: new Date().toISOString() },
  });
}
