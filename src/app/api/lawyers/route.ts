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
    const snapshot = await adminDb
      .collection('users')
      .where('subscriptionPlan', '==', 'Lawyer Lead-Gen')
      .where('subscriptionStatus', '==', 'active')
      .get();

    const lawyers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, lawyers });
  } catch (error) {
    console.error('Lawyer query failed:', error);
    return NextResponse.json({ error: 'Failed to query lawyers' }, { status: 500 });
  }
}
