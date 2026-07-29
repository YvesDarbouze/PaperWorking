import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import * as admin from 'firebase-admin';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const uid = auth.uid;
  const userDoc = await adminDb.collection('users').doc(uid).get();
  const orgId = userDoc.data()?.organizationId || 'org_placeholder';

  const securityDoc = await adminDb.collection('securitySettings').doc(orgId).get();
  const securityData = securityDoc.exists ? securityDoc.data() : {
    ssoEnabled: false,
    twoFaRequired: false,
    sessionTimeout: '24 hours',
    ipAllowlist: '',
  };

  return NextResponse.json(securityData);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const uid = auth.uid;
  const body = await req.json().catch(() => ({}));

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const orgId = userDoc.data()?.organizationId || 'org_placeholder';

  const {
    ssoEnabled,
    twoFaRequired,
    sessionTimeout,
    ipAllowlist,
    ssoProvider,
    samlEntityId,
    samlSignInUrl,
    samlX509Cert
  } = body;

  const updateData = {
    ssoEnabled: !!ssoEnabled,
    twoFaRequired: !!twoFaRequired,
    sessionTimeout: sessionTimeout || '24 hours',
    ipAllowlist: ipAllowlist || '',
    ssoProvider: ssoProvider || 'saml',
    samlEntityId: samlEntityId || '',
    samlSignInUrl: samlSignInUrl || '',
    samlX509Cert: samlX509Cert || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await adminDb.collection('securitySettings').doc(orgId).set(updateData, { merge: true });

  // If SSO is newly enabled, invalidate active user sessions for all members in the organization
  if (ssoEnabled) {
    const membersSnap = await adminDb.collection('users').where('organizationId', '==', orgId).get();
    const batch = adminDb.batch();
    for (const doc of membersSnap.docs) {
      batch.update(doc.ref, {
        sessionInvalidatedAt: new Date().toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  return NextResponse.json({ success: true, security: updateData });
}
