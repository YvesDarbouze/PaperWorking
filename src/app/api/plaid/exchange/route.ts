import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { getBankingProvider } from '@/lib/banking';
import { encryptToken } from '@/lib/encryption/tokenVault';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await requireAuth(req);
  if (isAuthError(auth)) {
    return auth;
  }
  const { uid } = auth;

  let body: { public_token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { public_token: publicToken } = body;
  if (!publicToken) {
    return NextResponse.json({ success: false, error: 'public_token is required' }, { status: 400 });
  }

  try {
    const bankingProvider = getBankingProvider();
    
    // Exchange public_token for access_token and item_id
    const { accessToken, itemId } = await bankingProvider.exchangePublicToken(uid, publicToken);

    // Encrypt the access_token before storing
    const encryptedAccessToken = encryptToken(accessToken);

    // Save to Firestore path: /users/{uid}/bankConnections/{itemId}
    const connectionRef = adminDb
      .collection('users')
      .doc(uid)
      .collection('bankConnections')
      .doc(itemId);

    await connectionRef.set({
      itemId,
      accessToken: encryptedAccessToken,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      itemId,
    });
  } catch (error: any) {
    console.error('[Plaid Exchange Endpoint] Failed to exchange token:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to exchange Plaid token',
      },
      { status: 500 }
    );
  }
}
