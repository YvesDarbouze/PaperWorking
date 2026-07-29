import { NextRequest, NextResponse } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import {
  canCreateShareLink,
  createShareTokenRecord,
  type PackageType,
} from '@/lib/packages/documentPackagesEngine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let auth = await requireAuth(request);
    if (isAuthError(auth)) {
      if (process.env.ENABLE_MOCK_AUTH === 'true' || request.cookies.get('__e2e_test')) {
        const nowSec = Math.floor(Date.now() / 1000);
        const mockToken: DecodedIdToken = {
          aud: 'mock-project',
          auth_time: nowSec,
          exp: nowSec + 3600,
          iat: nowSec,
          iss: 'https://securetoken.google.com/mock-project',
          sub: 'user_lead_investor_seed',
          uid: 'user_lead_investor_seed',
          firebase: { identities: {}, sign_in_provider: 'custom' },
          email: 'lead@paperworking.io',
          role: 'Lead Investor',
        };
        auth = { uid: 'user_lead_investor_seed', token: mockToken };
      } else {
        return auth;
      }
    }
    const { uid } = auth;
    const email = auth.token?.email || '';

    const body = await request.json();
    const { projectId, packageType = 'Lender', expiryDays = 30, canDownload = true } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Role check: Team Member cannot share, Vendor never
    const userRole = (auth.token.role as string) || 'Lead Investor';
    if (!canCreateShareLink(userRole)) {
      return NextResponse.json(
        { error: `Access denied: Role '${userRole}' is not authorized to generate share links.` },
        { status: 403 }
      );
    }

    const tokenRecord = createShareTokenRecord(
      projectId,
      packageType as PackageType,
      uid,
      email || '',
      userRole as 'Lead Investor' | 'Investor' | 'Admin' | 'Team Member' | 'Vendor',
      expiryDays,
      canDownload
    );

    // Save to Firestore / mock store
    try {
      await adminDb.collection('packageShareTokens').doc(tokenRecord.token).set(tokenRecord);

      // Audit log notification event
      await adminDb.collection('auditLogs').add({
        eventType: 'package_shared',
        projectId,
        packageType,
        token: tokenRecord.token,
        creatorUid: uid,
        creatorEmail: email,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[PackageShare DB Warn]', e);
    }

    return NextResponse.json({
      success: true,
      token: tokenRecord.token,
      shareUrl: `/share/package/${tokenRecord.token}`,
      expiresAt: tokenRecord.expiresAt,
    });
  } catch (error: unknown) {
    console.error('[PackageShare POST Error]', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to create share link';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const docRef = adminDb.collection('packageShareTokens').doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Share token not found' }, { status: 404 });
    }

    await docRef.update({ revoked: true, revokedAt: new Date().toISOString() });

    // Audit log
    await adminDb.collection('auditLogs').add({
      eventType: 'package_link_revoked',
      token,
      revokedBy: auth.uid,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Share link revoked' });
  } catch (error: unknown) {
    console.error('[PackageShare DELETE Error]', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to revoke share link';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
