import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { getBankingProvider } from '@/lib/banking';

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await requireAuth(req);
  if (isAuthError(auth)) {
    return auth;
  }
  const { uid } = auth;

  try {
    const bankingProvider = getBankingProvider();
    const linkToken = await bankingProvider.createLinkToken(uid);

    return NextResponse.json({
      success: true,
      link_token: linkToken,
    });
  } catch (error: any) {
    console.error('[Plaid Link Token Endpoint] Failed to generate link token:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create Plaid link token',
      },
      { status: 500 }
    );
  }
}
