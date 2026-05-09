import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const snapshot = await adminDb
      .collection('vendorRequests')
      .where('assignedVendorUid', '==', auth.uid)
      .orderBy('requestedAt', 'desc')
      .get();

    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Vendor requests query failed:', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}
