import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stateCode = searchParams.get('state');

  try {
    let query = adminDb
      .collection('users')
      .where('accountType', '==', 'vendor')
      .where('subscriptionStatus', '==', 'active');
      
    if (stateCode && stateCode !== 'All') {
      query = query.where('licensingStates', 'array-contains', stateCode);
    }

    const snapshot = await query.get();

    const vendors = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });

    return NextResponse.json({ success: true, vendors });
  } catch (error) {
    console.error('Vendor query failed:', error);
    return NextResponse.json({ error: 'Failed to query vendors' }, { status: 500 });
  }
}
