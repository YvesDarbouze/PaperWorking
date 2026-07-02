import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Revoke all refresh tokens for the user
    await adminAuth.revokeRefreshTokens(decodedToken.uid);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error revoking sessions:', error);
    return NextResponse.json(
      { error: 'Failed to revoke sessions', details: error.message },
      { status: 500 }
    );
  }
}
