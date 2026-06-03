import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stateCode = searchParams.get('state');
  const type = searchParams.get('type');
  const zip = searchParams.get('zip');
  const id = searchParams.get('id');

  try {
    if (id) {
      const doc = await adminDb.collection('users').doc(id).get();
      if (doc.exists) {
        const data = doc.data();
        if (data && data.accountType === 'vendor' && data.subscriptionStatus === 'active') {
          return NextResponse.json({ success: true, vendors: [{ id: doc.id, ...data }] });
        }
      }
      return NextResponse.json({ success: true, vendors: [] });
    }

    let query = adminDb
      .collection('users')
      .where('accountType', '==', 'vendor')
      .where('subscriptionStatus', '==', 'active');
      
    if (stateCode && stateCode !== 'All') {
      query = query.where('licensingStates', 'array-contains', stateCode);
    }
    
    if (type && type !== 'All') {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();

    let vendors = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });

    if (zip) {
      vendors = vendors.filter((v: any) => v.serviceAreas && v.serviceAreas.includes(zip));
    }

    return NextResponse.json({ success: true, vendors });
  } catch (error) {
    console.error('Vendor query failed:', error);
    return NextResponse.json({ error: 'Failed to query vendors' }, { status: 500 });
  }
}
