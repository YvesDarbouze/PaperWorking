import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';
import type { TitleCheckItem } from '@/types/schema';
import { FieldValue } from 'firebase-admin/firestore';

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
  const actorName = (auth as any).token?.name || (auth as any).token?.email || 'Unknown';

  let body: { projectId?: string; organizationId?: string; projectName?: string; checks?: TitleCheckItem[] };
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

  if (checks === undefined) {
    return NextResponse.json(
      {
        success: false,
        providerDecisionRequired: true,
        error:
          'Title search provider not configured. A real provider (county records API, First American, Stewart Title, etc.) must be integrated before live title data is available.',
      },
      { status: 503 }
    );
  }

  if (!Array.isArray(checks)) {
    return NextResponse.json(
      { success: false, error: 'checks must be an array' },
      { status: 400 }
    );
  }

  // Check project access and scope
  const projectSnap = await adminDb.collection('projects').doc(projectId).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }
  const projectData = projectSnap.data();
  const orgId = projectData?.organizationId;

  const userSnap = await adminDb.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  const profile = userSnap.data();

  // Helper to check project scoped access
  function hasProjectAccess(
    profile: any,
    targetOrgId: string | undefined,
    projectId?: string
  ): boolean {
    if (!targetOrgId) return false;
    const orgMember =
      profile.personalOrganizationId === targetOrgId ||
      profile.organizationId === targetOrgId ||
      (profile.memberships != null && Boolean(profile.memberships[targetOrgId]));

    if (!orgMember) return false;

    if (projectId && profile.membershipScopes) {
      const scope = profile.membershipScopes[targetOrgId];
      if (scope?.isScoped) {
        return Array.isArray(scope.scopedProjectIds) && scope.scopedProjectIds.includes(projectId);
      }
    }
    return true;
  }

  if (!hasProjectAccess(profile, orgId, projectId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

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
