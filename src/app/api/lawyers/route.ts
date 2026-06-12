import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

const MAX_RESULTS = 50;

export async function GET(request: Request) {
  // ── Auth Guard ───────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let uid = '';
  try {
    const { adminAuth } = await import('@/lib/firebase/admin');
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error('[lawyers API] Auth token verification failed:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const stateCode = searchParams.get('state');

  if (!stateCode) {
    return NextResponse.json({ error: 'State code is required' }, { status: 400 });
  }

  const normalizedState = stateCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedState)) {
    return NextResponse.json({ error: 'Invalid state code. Must be a 2-letter US state abbreviation.' }, { status: 400 });
  }

  try {
    const { adminDb } = await import('@/lib/firebase/admin');

    // Query Vendor Marketplace subscribers with a lawyer vendorType in the requested state
    const vendorSnapshot = await adminDb
      .collection('users')
      .where('subscriptionPlan', '==', 'Vendor Network')
      .where('subscriptionStatus', '==', 'active')
      .where('vendorType', '==', 'lawyer')
      .where('stateCode', '==', normalizedState)
      .limit(MAX_RESULTS)
      .get();

    // Legacy fallback: users who subscribed under the old "Lawyer Lead-Gen" plan in the requested state
    const remainingSlots = MAX_RESULTS - vendorSnapshot.size;
    let legacyDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

    if (remainingSlots > 0) {
      const legacySnapshot = await adminDb
        .collection('users')
        .where('subscriptionPlan', '==', 'Lawyer Lead-Gen')
        .where('subscriptionStatus', '==', 'active')
        .where('stateCode', '==', normalizedState)
        .limit(remainingSlots)
        .get();
      legacyDocs = legacySnapshot.docs;
    }

    // Deduplicate across both queries (shouldn't overlap, but safety first)
    const seen = new Set<string>();
    const lawyers = [
      ...vendorSnapshot.docs,
      ...legacyDocs,
    ]
      .filter((doc) => {
        if (seen.has(doc.id)) return false;
        seen.add(doc.id);
        return true;
      })
      .map((doc) => ({ uid: doc.id, ...doc.data() }));

    // Always return success with an array — empty array for no matches
    return NextResponse.json({ success: true, lawyers, count: lawyers.length });
  } catch (error) {
    console.error('Lawyer query failed:', error);
    return NextResponse.json({ error: 'Failed to query lawyers' }, { status: 500 });
  }
}
