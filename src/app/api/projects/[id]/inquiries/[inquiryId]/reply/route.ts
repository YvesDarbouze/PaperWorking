import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { getEmailProvider } from '@/lib/email/getEmailProvider';
import { renderEmailLayout } from '@/lib/emails/templates/BaseLayout';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inquiryId: string }> }
) {
  const { id: projectId, inquiryId } = await params;

  try {
    // 1. Authenticate Lead Investor
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 2. Fetch Project & Verify Access
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectSnap.data()!;
    const isOwner = projectData.ownerUid === uid;
    let isAuthorized = isOwner;

    if (!isAuthorized && projectData.organizationId) {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      if (userSnap.exists && userSnap.data()?.organizationId === projectData.organizationId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // 3. Parse Body
    const body = await request.json();
    const text: string = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json({ error: 'Reply text is required.' }, { status: 400 });
    }

    // 4. Retrieve & Update Inquiry Thread
    const inquiryRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('investorInquiries')
      .doc(inquiryId);

    const inquirySnap = await inquiryRef.get();
    if (!inquirySnap.exists) {
      return NextResponse.json({ error: 'Inquiry thread not found.' }, { status: 404 });
    }

    const inquiryData = inquirySnap.data()!;
    const invitationId = inquiryData.invitationId;

    // Verify invitation still exists and asker can view
    let invSnap = await adminDb.collection('dealInvitations').doc(invitationId).get();
    if (!invSnap.exists) {
      invSnap = await adminDb.collection('invitations').doc(invitationId).get();
    }

    if (!invSnap.exists) {
      return NextResponse.json({ error: 'Asker no longer has access to this deal.' }, { status: 410 });
    }

    const invData = invSnap.data()!;
    const token = invData.token;

    // Expiry check
    const expiresAt = invData.expiresAt?.toDate ? invData.expiresAt.toDate() : new Date(invData.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Asker invitation has expired.' }, { status: 410 });
    }

    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: 'leadInvestor',
      text,
      createdAt: new Date().toISOString(),
    };

    await inquiryRef.update({
      messages: FieldValue.arrayUnion(newMessage),
      status: 'answered',
      updatedAt: FieldValue.serverTimestamp(),
    });

    const { trackDealActivity } = require('@/lib/invitations/activityTimeline');
    await trackDealActivity(
      projectId,
      projectId,
      uid,
      'answer',
      {
        inviteeEmail: inquiryData.investorEmail || '',
        answerText: text,
      }
    ).catch((e: any) => console.error('Failed to log answer event:', e));

    // 5. Send Email to Investor
    const investorEmail = inquiryData.investorEmail || invData.inviteeEmail || invData.email;
    const investorName = inquiryData.investorName || invData.inviteeName || invData.name || 'Investor';

    if (investorEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
      const portalUrl = `${appUrl}/invest/${token}`;
      const dealName = projectData.propertyName || 'Untitled Deal';
      const subject = `LeadInvestor replied to your question on ${dealName}`;

      const bodyHtml = `
        <h1 style="font-size:20px;font-weight:700;color:#0d0d0d;margin:0 0 12px 0;">
          Answer Received
        </h1>
        <p style="font-size:14px;color:#4A4A4A;margin:0 0 20px 0;line-height:1.5;">
          The deal leadInvestor for <strong>${dealName}</strong> has replied to your question:
        </p>

        <div style="background-color:#F9F9F9;border-left:4px solid #454955;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#0d0d0d;">
          <p style="font-weight:600;margin:0 0 4px 0;color:#7F7F7F;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Your Question</p>
          <p style="margin:0;font-style:italic;">"${inquiryData.message || (inquiryData.messages?.[0]?.text) || ''}"</p>
        </div>

        <div style="background-color:#F5F6F6;border:1px solid #EAEAEA;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="font-weight:600;margin:0 0 6px 0;color:#454955;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">LeadInvestor Response</p>
          <p style="font-size:14px;color:#0d0d0d;margin:0;line-height:1.6;white-space:pre-wrap;">${text}</p>
        </div>

        <div style="margin: 24px 0; text-align: center;">
          <a href="${portalUrl}?action=interested" style="display: inline-block; padding: 12px 20px; background-color: #0d0d0d; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 4px;">
            I'm Interested
          </a>
          <a href="${portalUrl}?action=ask" style="display: inline-block; padding: 12px 20px; background-color: #fafafa; color: #0d0d0d; border: 1px solid #dcdcdc; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 4px;">
            Ask a Question
          </a>
          <a href="${portalUrl}?action=decline" style="display: inline-block; padding: 12px 20px; background-color: #ffffff; color: #ff3b30; border: 1px solid #ffb3b0; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 4px;">
            Decline Invitation
          </a>
        </div>
      `;

      const textFallback = `
LeadInvestor Response:
"${text}"

Open discussion: ${portalUrl}
      `;

      const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN || 'reply.paperworking.co';
      const replyTo = `reply+${token}@${inboundDomain}`;

      const emailProvider = getEmailProvider();
      await emailProvider.sendEmail({
        from: 'notifications@mail.paperworking.co',
        to: [investorEmail],
        replyTo,
        subject,
        templateKey: 'DEAL-MKT-REPLY-RECEIVED',
        messageClass: 'O',
        html: renderEmailLayout({ title: 'Lead Investor Response', preheader: subject, bodyHtml }),
        text: textFallback.trim(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Projects/Reply] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
