import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;
    
    const body = await request.json().catch(() => ({}));
    const { token } = body;
    
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Valid token is required' }, { status: 400 });
    }
    
    const shareRef = adminDb.collection('taxShares').doc(token);
    const shareDoc = await shareRef.get();
    
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }
    
    const shareData = shareDoc.data();
    if (shareData?.userId !== uid) {
      return NextResponse.json({ error: 'Unauthorized to revoke this link' }, { status: 403 });
    }
    
    await shareRef.update({
      revoked: true,
      revokedAt: new Date(),
    });
    
    return NextResponse.json({ success: true, message: 'Share link revoked successfully' });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tax share revoke] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
