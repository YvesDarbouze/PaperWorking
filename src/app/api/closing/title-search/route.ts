import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';
import type { TitleCheckItem, ClearanceStatus } from '@/types/schema';
import { FieldValue } from 'firebase-admin/firestore';

/* ═══════════════════════════════════════════════════════
   POST /api/closing/title-search

   Persists the title-search checklist for a project to
   Firestore. Called whenever a team member updates any
   individual check's status or notes.

   The blockchain simulation in the title module has been
   removed — that was a setTimeout faker producing no real
   data. Check states are now set manually by the closing
   team and persisted here.
   ═══════════════════════════════════════════════════════ */

interface TitleSearchRequest {
  projectId: string;
  organizationId?: string;
  projectName?: string;
  checks: TitleCheckItem[];
}

/** Derive the aggregate chainOfTitleStatus from the individual checks */
function deriveChainStatus(
  checks: TitleCheckItem[]
): 'pending' | 'verified' | 'failed' {
  if (checks.some((c) => c.status === 'Issue Found')) return 'failed';
  if (checks.every((c) => c.status === 'Cleared')) return 'verified';
  return 'pending';
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;
  const actorName =
    (auth as any).token?.name || (auth as any).token?.email || 'Unknown';

  let body: TitleSearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { projectId, organizationId, projectName, checks } = body;

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'projectId is required' },
      { status: 400 }
    );
  }
  if (!Array.isArray(checks)) {
    return NextResponse.json(
      { success: false, error: 'checks must be an array' },
      { status: 400 }
    );
  }

  // ── Derive aggregate status ──────────────────────────────
  const chainOfTitleStatus = deriveChainStatus(checks);

  // ── Persist to Firestore ─────────────────────────────────
  try {
    await adminDb
      .collection('projects')
      .doc(projectId)
      .update({
        'closingRoom.titleChecks': checks,
        'closingRoom.chainOfTitleStatus': chainOfTitleStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
  } catch (err: any) {
    console.error('[title-search] Firestore write failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to persist title checks' },
      { status: 500 }
    );
  }

  // ── Activity log (fire-and-forget) ───────────────────────
  if (organizationId) {
    logOrgActivity({
      organizationId,
      type: 'doc_uploaded',
      actorId: uid,
      actorName,
      summary: `Title clearance checklist updated for ${projectName || projectId}`,
      targetRef: `projects/${projectId}`,
      projectId,
      projectName,
    }).catch((e) =>
      console.warn('[title-search] Activity log failed (non-fatal):', e)
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      projectId,
      chainOfTitleStatus,
      checks,
      updatedAt: new Date().toISOString(),
    },
  });
}
