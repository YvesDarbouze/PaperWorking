import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { logger } from '@/lib/logger';

/* ═══════════════════════════════════════════════════════
   POST /api/invitations/send

   Security contract:
   • Requires a valid Firebase ID token in the Authorization
     header (Bearer scheme). No token → 401.
   • Caller's identity (invitedByUid, invitedByName) is always
     derived from the verified token + Firestore profile.
     Any invitedByUid / invitedByName in the request body is
     silently ignored — body values can never forge identity.
   • Caller must be a member of the target project with
     Lead Investor, Admin, or Platform Admin role, OR must
     have the 'team.invite' permission. Otherwise → 403.
   • Side-effects are ordered: the record is persisted first.
     If a future email step is added, it must happen after the
     write so a failed write never fires a phantom email.
   ═══════════════════════════════════════════════════════ */

const INVITE_ROLES = new Set(['Lead Investor', 'Admin', 'Platform Admin']);

export async function POST(request: NextRequest) {
  // ── 1. Authenticate ──────────────────────────────────────
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth; // 401 with reason

  const callerUid = auth.uid;

  try {
    const body = await request.json();

    // invitedByUid / invitedByName from the body are NEVER read.
    // Both are derived exclusively from the verified token.
    const { projectId, dealName, email, name, proposedEquityPercent, proposedAmount } = body;

    if (!projectId || !email || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, email, name' },
        { status: 400 }
      );
    }

    if (typeof proposedEquityPercent !== 'number' || proposedEquityPercent <= 0 || proposedEquityPercent > 100) {
      return NextResponse.json(
        { success: false, error: 'Equity percentage must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    // ── 2. Load the project ──────────────────────────────────
    const dealSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!dealSnap.exists) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }
    const deal = dealSnap.data()!;

    const organizationId: string | undefined = deal.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization context missing from deal' },
        { status: 422 }
      );
    }

    // ── 3. Authorize ─────────────────────────────────────────
    // Primary: caller must be in project.members with sufficient role.
    // Fallback: for legacy projects without a members map, check that
    //   the caller belongs to the same org with a qualifying role.
    const members: Record<string, { role?: string; projectPermissions?: string[] }> = deal.members ?? {};
    const member = members[callerUid];

    let authorized = false;

    if (member) {
      const hasInviteRole = INVITE_ROLES.has(member.role ?? '');
      const hasInvitePermission = Array.isArray(member.projectPermissions)
        && member.projectPermissions.includes('team.invite');
      authorized = hasInviteRole || hasInvitePermission;
    } else {
      // No project-level membership record — fall back to org membership check.
      // This covers projects created before the members map was introduced.
      const callerSnap = await adminDb.collection('users').doc(callerUid).get();
      const callerData = callerSnap.data();
      const callerOrgId = callerData?.organizationId as string | undefined;
      const callerRole: string = callerData?.role ?? '';

      if (callerOrgId && callerOrgId === organizationId && INVITE_ROLES.has(callerRole)) {
        authorized = true;
      }
    }

    if (!authorized) {
      logger.warn('[Invitations] Caller lacks invite rights', { callerUid, projectId });
      return NextResponse.json(
        { success: false, error: 'Forbidden: insufficient permissions to send invitations for this project' },
        { status: 403 }
      );
    }

    // ── 4. Derive inviter identity from the token ────────────
    // The caller profile may already be loaded above; fetch if not.
    const callerProfileSnap = await adminDb.collection('users').doc(callerUid).get();
    const callerProfile = callerProfileSnap.data();
    // invitedByUid is ALWAYS callerUid — body value is ignored.
    const invitedByName: string =
      callerProfile?.displayName || callerProfile?.companyName || 'PaperWorking User';

    // ── 5. Build the invitation record ───────────────────────
    const token = generateToken();
    const invitationId = `inv_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;

    const invitation = {
      id: invitationId,
      projectId,
      dealName: dealName || deal.propertyName || 'Untitled Deal',
      organizationId,
      email: email.trim(),
      name: name.trim(),
      proposedEquityPercent,
      proposedAmount: proposedAmount || 0,
      invitedByUid: callerUid,    // ← always from token; body value is never used
      invitedByName,              // ← always from Firestore profile
      token,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // ── 6. Persist first — future email step belongs after this ─
    await adminDb.collection('invitations').doc(invitationId).set(invitation);

    logger.info('[Invitations] Created invitation', {
      invitationId,
      projectId,
      invitedByUid: callerUid,
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invest/${token}`;

    return NextResponse.json({
      success: true,
      invitationId,
      inviteUrl,
      message: `Invitation successfully logged for ${email}`,
    });
  } catch (error) {
    logger.error('[Invitations] Error creating invitation', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}
