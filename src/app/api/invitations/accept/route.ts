import { adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   GET /api/invitations/accept?token=<token>

   Validates a crowdfunding invitation token and routes
   the user based on their authentication/subscription
   status.
   ═══════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    // 1. Look up the invitation in Firestore
    const invitationSnap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (invitationSnap.empty) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation token' },
        { status: 404 }
      );
    }

    const invitationDoc = invitationSnap.docs[0];
    const invitationData = invitationDoc.data();

    // 2. Validate Status and Expiration
    const now = new Date();
    const expiresAt = invitationData.expiresAt?.toDate ? invitationData.expiresAt.toDate() : new Date(invitationData.expiresAt);

    if (invitationData.status !== 'pending') {
       return NextResponse.json({ success: false, error: 'Invitation has already been processed' }, { status: 410 });
    }

    if (expiresAt < now) {
       return NextResponse.json({ success: false, error: 'Invitation link has expired' }, { status: 410 });
    }

    // 3. Return context for the registration flow
    return NextResponse.json({
      success: true,
      action: 'redirect_to_register',
      redirectUrl: `/register?invite=${token}`,
      context: {
        projectId: invitationData.projectId,
        dealName: invitationData.dealName,
        proposedEquity: invitationData.proposedEquityPercent,
        invitedBy: invitationData.invitedByName
      },
      message: 'Invitation verified. Proceed to registration.',
    });
  } catch (error) {
    console.error('[Invitations] Error accepting invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
