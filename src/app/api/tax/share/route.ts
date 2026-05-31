import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;
    
    const body = await request.json().catch(() => ({}));
    const { taxYear, projectIds } = body;
    
    if (!taxYear || typeof taxYear !== 'number') {
      return NextResponse.json({ error: 'Valid taxYear is required' }, { status: 400 });
    }
    
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'At least one projectId is required' }, { status: 400 });
    }
    
    // Fetch user profile to isolate organization context
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const organizationId = userData?.organizationId || userData?.personalOrganizationId || 'personal';
    
    // Generate UUID token
    const token = crypto.randomUUID();
    
    const shareData = {
      id: token,
      userId: uid,
      organizationId,
      taxYear,
      projectIds,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      revoked: false,
    };
    
    await adminDb.collection('taxShares').doc(token).set(shareData);
    
    return NextResponse.json({
      success: true,
      token,
      shareUrl: `/share/${token}`,
      expiresAt: shareData.expiresAt,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tax share] POST Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;
    
    // Query user's active share links
    const sharesSnap = await adminDb
      .collection('taxShares')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
      
    const shares = sharesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        expiresAt: data.expiresAt?.toDate?.() || data.expiresAt,
        isExpired: new Date() > (data.expiresAt?.toDate?.() || new Date(data.expiresAt)),
      };
    });
    
    return NextResponse.json({ success: true, shares });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tax share] GET Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to retrieve share links' },
      { status: 500 }
    );
  }
}
