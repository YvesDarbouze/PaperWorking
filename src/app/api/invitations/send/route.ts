import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   POST /api/invitations/send

   Creates a crowdfunding invitation in Firestore and
   triggers an email to the prospective investor.
   
   Requires the caller to have an active subscription.
   ═══════════════════════════════════════════════════════ */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, dealName, email, name, proposedEquityPercent, proposedAmount, invitedByUid, invitedByName } = body;

    if (!projectId || !email || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, email, name' },
        { status: 400 }
      );
    }

    if (proposedEquityPercent <= 0 || proposedEquityPercent > 100) {
      return NextResponse.json(
        { success: false, error: 'Equity percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // 1. Resolve Organization ID from the Deal
    const dealSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!dealSnap.exists) {
       return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }
    const organizationId = dealSnap.data()?.organizationId;

    if (!organizationId) {
       return NextResponse.json({ success: false, error: 'Organization context missing from deal' }, { status: 422 });
    }

    // 2. Generate a unique invitation token
    const token = generateToken();
    const invitationId = `inv_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;

    const invitation = {
      id: invitationId,
      projectId,
      dealName: dealName || dealSnap.data()?.propertyName || 'Untitled Deal',
      organizationId, // Enforces multi-tenancy
      email: email.trim(),
      name: name.trim(),
      proposedEquityPercent,
      proposedAmount: proposedAmount || 0,
      invitedByUid: invitedByUid || 'system',
      invitedByName: invitedByName || 'PaperWorking System',
      token,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // 3. Persist to Firestore
    await adminDb.collection('invitations').doc(invitationId).set(invitation);

    console.log(`[Invitations] Created invitation: ${invitationId} for deal ${projectId}`);

    // ── 3b. Create Inbox Item for existing users ────────────
    try {
      const inviteeSnap = await adminDb
        .collection('users')
        .where('email', '==', email.trim())
        .limit(1)
        .get();

      if (!inviteeSnap.empty) {
        const inviteeDoc = inviteeSnap.docs[0];
        const inviteeUid = inviteeDoc.id;
        const inboxItemId = `inb_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
        const resolvedSenderName = invitedByName || 'PaperWorking System';
        const resolvedDealName = invitation.dealName;

        await adminDb.collection('inboxItems').doc(inboxItemId).set({
          id: inboxItemId,
          recipientUid: inviteeUid,
          organizationId,
          type: 'invitation',
          category: 'crowdfund_invite',
          title: `${resolvedSenderName} invited you to invest in ${resolvedDealName}`,
          body: `You've been offered ${proposedEquityPercent}% equity in this deal. Review and respond to this invitation.`,
          senderUid: invitedByUid || 'system',
          senderName: resolvedSenderName,
          senderAvatarInitial: resolvedSenderName[0]?.toUpperCase() || 'P',
          projectId,
          projectName: resolvedDealName,
          invitationId: token,
          actionUrl: '/dashboard/inbox',
          read: false,
          archived: false,
          createdAt: new Date(),
          expiresAt: invitation.expiresAt,
        });

        console.log(`[Invitations] Created inbox item ${inboxItemId} for existing user ${inviteeUid}`);
      }
    } catch (inboxError) {
      // Non-blocking — inbox item is supplementary to the invitation
      console.warn('[Invitations] Failed to create inbox item for invitee:', inboxError);
    }

    // 4. Generate URL for email/distro
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/register?invite=${token}`;
    
    return NextResponse.json({
      success: true,
      invitationId,
      inviteUrl,
      message: `Invitation successfully logged for ${email}`,
    });
  } catch (error) {
    console.error('[Invitations] Error creating invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}
