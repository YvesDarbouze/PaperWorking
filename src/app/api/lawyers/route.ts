import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stateCode = searchParams.get('state');

  if (!stateCode) {
    return NextResponse.json({ error: 'State code is required' }, { status: 400 });
  }

  try {
    // Query Vendor Marketplace subscribers with a lawyer vendorType
    const vendorSnapshot = await adminDb
      .collection('users')
      .where('subscriptionPlan', '==', 'Vendor Network')
      .where('subscriptionStatus', '==', 'active')
      .where('vendorType', '==', 'lawyer')
      .get();

    // Legacy fallback: users who subscribed under the old "Lawyer Lead-Gen" plan
    const legacySnapshot = await adminDb
      .collection('users')
      .where('subscriptionPlan', '==', 'Lawyer Lead-Gen')
      .where('subscriptionStatus', '==', 'active')
      .get();

    const seen = new Set<string>();
    const lawyers = [
      ...vendorSnapshot.docs,
      ...legacySnapshot.docs,
    ]
      .filter((doc) => {
        if (seen.has(doc.id)) return false;
        seen.add(doc.id);
        return true;
      })
      .map((doc) => ({ uid: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, lawyers });
  } catch (error) {
    console.error('Lawyer query failed:', error);
    return NextResponse.json({ error: 'Failed to query lawyers' }, { status: 500 });
  }
}
