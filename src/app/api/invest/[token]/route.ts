import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const doc = await adminDb.collection('investmentTokens').doc(token).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const data = doc.data()!;

    if (data.status === 'used' || data.status === 'expired') {
      return NextResponse.json({ error: 'Token already used or expired' }, { status: 410 });
    }

    // Check expiry timestamp
    if (data.expiresAt) {
      const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      if (expiry < new Date()) {
        return NextResponse.json({ error: 'Token expired' }, { status: 410 });
      }
    }

    return NextResponse.json({ success: true, deal: data });
  } catch (error) {
    console.error('Investment token lookup failed:', error);
    return NextResponse.json({ error: 'Failed to load investment data' }, { status: 500 });
  }
}
