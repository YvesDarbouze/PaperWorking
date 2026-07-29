import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import * as admin from 'firebase-admin';

function isUserAdmin(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return (
    r === 'admin' ||
    r === 'lead investor' ||
    r === 'owner/admin' ||
    r === 'platform admin' ||
    r.includes('admin') ||
    r.includes('lead') ||
    r.includes('owner') ||
    r.includes('lead_investor')
  );
}

export async function GET(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};
  const orgId = userData?.organizationId || 'org_placeholder';

  // GET /api/team/members
  if (actionPath.length === 1 && actionPath[0] === 'members') {
    if (!orgId || orgId === 'org_placeholder') {
      return NextResponse.json({ members: [], invites: [] });
    }

    const [membersSnap, invitesSnap] = await Promise.all([
      adminDb.collection('users').where('organizationId', '==', orgId).get(),
      adminDb.collection('teamInvitations').where('organizationId', '==', orgId).get(),
    ]);

    const members = membersSnap.docs.map((doc) => ({
      id: doc.id,
      uid: doc.id,
      ...doc.data(),
    }));

    const invites = invitesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ members, invites });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;
  const body = await req.json().catch(() => ({}));

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};
  const orgId = userData?.organizationId || 'org_placeholder';

  // POST /api/team/invite
  if (actionPath.length === 1 && actionPath[0] === 'invite') {
    const { email, role } = body;
    if (!email || !role) {
      return NextResponse.json({ error: 'Missing email or role' }, { status: 400 });
    }

    // Check if the user is already in the organization
    const existingUsers = await adminDb
      .collection('users')
      .where('organizationId', '==', orgId)
      .where('email', '==', email)
      .get();

    if (!existingUsers.empty) {
      return NextResponse.json({ error: 'This user is already a member.' }, { status: 400 });
    }

    // Create an invitation document
    const inviteRef = adminDb.collection('teamInvitations').doc();
    await inviteRef.set({
      email,
      role,
      organizationId: orgId,
      status: 'Invited',
      invitedBy: userData?.displayName || userData?.email || 'Admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, inviteId: inviteRef.id });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const body = await req.json().catch(() => ({}));
  const callerUid = auth.uid;

  // PUT /api/team/members/:id/role
  if (actionPath.length === 3 && actionPath[0] === 'members' && actionPath[2] === 'role') {
    const memberId = actionPath[1];
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'Missing role' }, { status: 400 });
    }

    const [callerDoc, targetDoc] = await Promise.all([
      adminDb.collection('users').doc(callerUid).get(),
      adminDb.collection('users').doc(memberId).get(),
    ]);

    const callerData = callerDoc.exists ? callerDoc.data() : null;
    const targetData = targetDoc.exists ? targetDoc.data() : null;

    if (!callerData || !targetData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const orgId = callerData.organizationId || 'org_placeholder';

    // 1. Self-downgrade check
    if (memberId === callerUid && isUserAdmin(callerData.role) && !isUserAdmin(role)) {
      return NextResponse.json(
        { error: 'Transfer ownership before downgrading yourself.' },
        { status: 403 }
      );
    }

    // 2. Last admin check
    if (isUserAdmin(targetData.role) && !isUserAdmin(role)) {
      const allMembersSnap = await adminDb
        .collection('users')
        .where('organizationId', '==', orgId)
        .get();

      const otherAdmins = allMembersSnap.docs.filter((doc) => {
        const data = doc.data();
        return doc.id !== memberId && data.status !== 'deactivated' && data.status !== 'inactive' && isUserAdmin(data.role);
      });

      if (otherAdmins.length === 0) {
        return NextResponse.json(
          { error: 'You must assign another Admin before removing this user.' },
          { status: 403 }
        );
      }
    }

    await adminDb.collection('users').doc(memberId).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  }

  // PUT /api/team/members/:id/reactivate
  if (actionPath.length === 3 && actionPath[0] === 'members' && actionPath[2] === 'reactivate') {
    const memberId = actionPath[1];

    await adminDb.collection('users').doc(memberId).update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const searchParams = req.nextUrl.searchParams;
  const hardDelete = searchParams.get('hard') === 'true';
  const callerUid = auth.uid;

  // DELETE /api/team/members/:id
  if (actionPath.length === 2 && actionPath[0] === 'members') {
    const memberId = actionPath[1];

    const [callerDoc, targetDoc] = await Promise.all([
      adminDb.collection('users').doc(callerUid).get(),
      adminDb.collection('users').doc(memberId).get(),
    ]);

    const callerData = callerDoc.exists ? callerDoc.data() : null;
    const targetData = targetDoc.exists ? targetDoc.data() : null;

    if (!callerData || !targetData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const orgId = callerData.organizationId || 'org_placeholder';

    // Last admin check when removing a user
    if (isUserAdmin(targetData.role)) {
      const allMembersSnap = await adminDb
        .collection('users')
        .where('organizationId', '==', orgId)
        .get();

      const otherAdmins = allMembersSnap.docs.filter((doc) => {
        const data = doc.data();
        return doc.id !== memberId && data.status !== 'deactivated' && data.status !== 'inactive' && isUserAdmin(data.role);
      });

      if (otherAdmins.length === 0) {
        return NextResponse.json(
          { error: 'You must assign another Admin before removing this user.' },
          { status: 403 }
        );
      }
    }

    if (hardDelete) {
      // Hard delete: remove organization connection
      await adminDb.collection('users').doc(memberId).update({
        organizationId: 'org_placeholder',
        status: 'inactive',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Soft delete: set status to deactivated
      await adminDb.collection('users').doc(memberId).update({
        status: 'deactivated',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}
