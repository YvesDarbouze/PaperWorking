import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, projectId } = body;

    if (!email || !token || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, token, projectId.' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Locate invitation by token
    let invitationDoc: any = null;
    let inviterUid = '';

    const dealInvSnap = await adminDb.collection('dealInvitations')
      .where('token', '==', token)
      .limit(1)
      .get();
    
    if (!dealInvSnap.empty) {
      invitationDoc = dealInvSnap.docs[0];
      const data = invitationDoc.data();
      inviterUid = data.inviterUid || '';
    } else {
      const legacyInvSnap = await adminDb.collection('invitations')
        .where('token', '==', token)
        .limit(1)
        .get();
      if (!legacyInvSnap.empty) {
        invitationDoc = legacyInvSnap.docs[0];
        const data = invitationDoc.data();
        inviterUid = data.invitedByUid || '';
      }
    }

    if (!invitationDoc) {
      return NextResponse.json({ error: 'Invitation not found for the provided token.' }, { status: 404 });
    }

    // 2. Update invitation status to reported
    await invitationDoc.ref.update({
      status: 'reported',
      reportedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Log to operatorQueue
    await adminDb.collection('operatorQueue').add({
      type: 'RECIPIENT_REPORT',
      userId: inviterUid,
      projectId,
      email: emailLower,
      details: `Recipient (${emailLower}) reported invitation for project ${projectId} as spam.`,
      createdAt: new Date(),
      resolved: false,
    });

    // 4. Increment complaint count and apply suspension if threshold met (>= 2 complaints)
    if (inviterUid) {
      const userRef = adminDb.collection('users').doc(inviterUid);
      const userSnap = await userRef.get();
      
      let currentComplaints = 0;
      if (userSnap.exists) {
        currentComplaints = userSnap.data()?.complaintCount || 0;
      }
      
      const newComplaints = currentComplaints + 1;
      const userUpdates: Record<string, any> = {
        complaintCount: newComplaints,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (newComplaints >= 2) {
        userUpdates.invitationSuspended = true;
        userUpdates.suspensionReason = 'USER_COMPLAINT';

        // Log suspension alert to operatorQueue
        await adminDb.collection('operatorQueue').add({
          type: 'SUSPENSION_ALERT',
          userId: inviterUid,
          details: `Lead Investor invitation privileges suspended automatically due to complaint threshold breach (${newComplaints} complaints).`,
          createdAt: new Date(),
          resolved: false,
        });
      }

      await userRef.update(userUpdates);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your report. The invitation has been reported and logged.',
    });
  } catch (err: any) {
    console.error('[Spam Report Error]', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
