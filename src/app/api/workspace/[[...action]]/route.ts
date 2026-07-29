import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import * as admin from 'firebase-admin';

export async function GET(req: NextRequest, { params: _params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const uid = auth.uid;
  const userDoc = await adminDb.collection('users').doc(uid).get();
  const orgId = userDoc.data()?.organizationId || 'org_placeholder';

  const orgDoc = await adminDb.collection('organizations').doc(orgId).get();
  const orgData = orgDoc.exists ? orgDoc.data() : {};

  return NextResponse.json(orgData);
}

export async function PUT(req: NextRequest, { params: _params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const uid = auth.uid;
  const body = await req.json().catch(() => ({}));

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const orgId = userDoc.data()?.organizationId || 'org_placeholder';

  const { name, timezone, logo } = body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (timezone !== undefined) updateData.timezone = timezone;
  if (logo !== undefined) updateData.logo = logo;

  updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await adminDb.collection('organizations').doc(orgId).update(updateData);

  return NextResponse.json({ success: true, workspace: updateData });
}

export async function POST(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;

  const userRef = adminDb.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const orgId = userDoc.data()?.organizationId || 'org_placeholder';
  const orgRef = adminDb.collection('organizations').doc(orgId);

  // POST /api/workspace/logo
  if (actionPath.length === 1 && actionPath[0] === 'logo') {
    const body = await req.json().catch(() => ({}));
    const { logoBase64, format, sizeBytes } = body;

    if (!logoBase64) {
      return NextResponse.json({ error: 'Missing logo data' }, { status: 400 });
    }

    // Size check: max 2MB
    if (sizeBytes && sizeBytes > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Logo size exceeds 2MB limit' }, { status: 400 });
    }

    // Format check: png, jpg, jpeg, svg
    const allowedFormats = ['png', 'jpg', 'jpeg', 'svg'];
    if (format && !allowedFormats.includes(format.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid file format. Only PNG, JPG, and SVG are supported.' }, { status: 400 });
    }

    await orgRef.update({
      logo: logoBase64,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, logo: logoBase64 });
  }

  // POST /api/workspace/delete
  if (actionPath.length === 1 && actionPath[0] === 'delete') {
    const body = await req.json().catch(() => ({}));
    const { confirmName } = body;

    const orgDoc = await orgRef.get();
    const orgName = orgDoc.data()?.name || '';

    if (confirmName !== orgName) {
      return NextResponse.json({ error: 'Workspace name confirmation does not match.' }, { status: 400 });
    }

    const deletionDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await orgRef.update({
      pendingDeletionAt: new Date().toISOString(),
      deletionDate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, deletionDate });
  }

  // POST /api/workspace/cancel-deletion
  if (actionPath.length === 1 && actionPath[0] === 'cancel-deletion') {
    await orgRef.update({
      pendingDeletionAt: admin.firestore.FieldValue.delete(),
      deletionDate: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}
