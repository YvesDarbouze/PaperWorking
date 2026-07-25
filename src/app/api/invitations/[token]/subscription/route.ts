import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { syncFractionalInvestorFromCommitment } from '@/lib/firebase/syncFractionalInvestors';
import { CommitmentStatus } from '@/types/schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
  }

  try {
    // 1. Resolve invitation by token
    const invSnap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (invSnap.empty) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const inv = invSnap.docs[0].data();
    const expiresAt = inv.expiresAt?.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired.' }, { status: 410 });
    }

    // 2. Load the corresponding commitment in the project's commitments subcollection
    const commitmentsCol = adminDb
      .collection('projects')
      .doc(inv.projectId)
      .collection('commitments');

    const commitmentsSnap = await commitmentsCol
      .where('email', '==', inv.email)
      .limit(1)
      .get();

    if (commitmentsSnap.empty) {
      return NextResponse.json({ error: 'No active commitment record found for this investor.' }, { status: 404 });
    }

    const commitmentDoc = commitmentsSnap.docs[0];
    const commitmentData = commitmentDoc.data();

    // 3. Update status to 'signed' and append transition log
    const body = await request.json();
    const { action, evidence } = body;

    const transitionEvidence = evidence || (action === 'esign' ? 'E-Signed via DocuSign in Guest Portal' : 'Manually signed copy uploaded');
    const transition = {
      fromStatus: commitmentData.status || null,
      toStatus: 'signed' as const,
      timestamp: new Date().toISOString(),
      actor: inv.email || 'Guest Investor',
      evidence: transitionEvidence,
    };

    const updates: Record<string, any> = {
      status: 'signed',
      updatedAt: FieldValue.serverTimestamp(),
      transitions: FieldValue.arrayUnion
        ? FieldValue.arrayUnion(transition)
        : [...(commitmentData.transitions || []), transition],
    };

    await commitmentDoc.ref.update(updates);

    // 4. Synchronize legacy fractionalInvestors and new contributions arrays
    await syncFractionalInvestorFromCommitment(inv.projectId, {
      id: commitmentDoc.id,
      name: commitmentData.name,
      email: commitmentData.email,
      amountCents: commitmentData.amountCents,
      status: 'signed',
      partyType: commitmentData.partyType || 'Investor',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[GuestSubscriptionSign]', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}
