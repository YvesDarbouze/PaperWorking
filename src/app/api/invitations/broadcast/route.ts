import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { logger } from '@/lib/logger';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';

const INVITE_ROLES = new Set(['Lead Investor', 'Admin', 'Platform Admin']);

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const callerUid = auth.uid;

  try {
    const body = await request.json();
    const { projectId, subject, bodyTemplate, termsVersion } = body;

    if (!projectId || !subject || !bodyTemplate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, subject, bodyTemplate' },
        { status: 400 }
      );
    }

    // 2. Load the project
    const dealSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!dealSnap.exists) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }
    const deal = dealSnap.data()!;
    const organizationId = deal.organizationId;
    const dealName = deal.propertyName || 'Untitled Deal';

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization context missing from deal' },
        { status: 422 }
      );
    }

    // 3. Authorize caller
    const members = deal.members ?? {};
    const member = members[callerUid];
    let authorized = false;

    if (member) {
      const hasInviteRole = INVITE_ROLES.has(member.role ?? '');
      const hasInvitePermission = Array.isArray(member.projectPermissions) && member.projectPermissions.includes('team.invite');
      authorized = hasInviteRole || hasInvitePermission;
    } else {
      const callerSnap = await adminDb.collection('users').doc(callerUid).get();
      const callerData = callerSnap.data();
      const callerOrgId = callerData?.organizationId;
      const callerRole = callerData?.role ?? '';

      if (callerOrgId && callerOrgId === organizationId && INVITE_ROLES.has(callerRole)) {
        authorized = true;
      }
    }

    if (!authorized) {
      logger.warn('[Invitations/Broadcast] Unauthorized send attempt', { callerUid, projectId });
      return NextResponse.json(
        { success: false, error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    // 4. Rate sanity guard: one send per Deal per 24 hours
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const historySnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('invitation_history')
      .where('sentAt', '>=', last24h)
      .limit(1)
      .get();

    if (!historySnap.empty) {
      return NextResponse.json(
        { success: false, error: 'Rate limit: An invitation has already been sent for this deal in the last 24 hours.' },
        { status: 429 }
      );
    }

    // 5. Load Audience & Deduplicate
    const contactsSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('investor_contacts')
      .get();

    const followersSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('followers')
      .get();

    interface DeduplicatedRecipient {
      email: string;
      name: string;
      potentialTicket: number; // in cents
      emailConsent: boolean;
      inAppConsent: boolean;
    }

    const deduplicated: Record<string, DeduplicatedRecipient> = {};

    for (const doc of contactsSnap.docs) {
      const c = doc.data();
      const email = (c.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) continue;
      deduplicated[email] = {
        email: c.email.trim(),
        name: c.name || 'Unnamed Investor',
        potentialTicket: c.potentialTicket || 0,
        emailConsent: c.emailConsent !== false,
        inAppConsent: c.inAppConsent !== false,
      };
    }

    for (const doc of followersSnap.docs) {
      const f = doc.data();
      const email = (f.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) continue;
      if (deduplicated[email]) {
        deduplicated[email].emailConsent = deduplicated[email].emailConsent && (f.emailConsent !== false);
        deduplicated[email].inAppConsent = deduplicated[email].inAppConsent || (f.inAppConsent !== false);
      } else {
        deduplicated[email] = {
          email: f.email.trim(),
          name: f.name || 'Unnamed Investor',
          potentialTicket: 0,
          emailConsent: f.emailConsent !== false,
          inAppConsent: f.inAppConsent !== false,
        };
      }
    }

    const recipients = Object.values(deduplicated);
    const activeRecipients = recipients.filter(r => r.emailConsent || r.inAppConsent);

    if (activeRecipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No consented recipients found in the audience.' },
        { status: 400 }
      );
    }

    // Resolve inviter branding
    const callerProfileSnap = await adminDb.collection('users').doc(callerUid).get();
    const callerProfile = callerProfileSnap.data();
    const invitedByName = callerProfile?.displayName || callerProfile?.companyName || 'Lead Investor';

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
    const fin = deal.financials ?? {};
    const fundingTarget = fin.equityTerms?.funding_target ?? 0;
    const equityOfferedPct = fin.equityTerms?.equity_offered_pct ?? 0;
    const minTicket = fin.equityTerms?.min_ticket ?? 0;

    const recipientsLogged: any[] = [];
    let emailSentCount = 0;
    let inAppSentCount = 0;

    // 6. Iterate and Process each recipient
    for (const r of activeRecipients) {
      const token = generateToken();
      const invitationId = `inv_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;

      // Calculate personal proposed investment terms
      const proposedAmount = r.potentialTicket > 0 ? r.potentialTicket / 100 : minTicket;
      const proposedEquityPercent = fundingTarget > 0 ? (proposedAmount / fundingTarget) * equityOfferedPct : 0;

      const invitation = {
        id: invitationId,
        projectId,
        dealName,
        organizationId,
        email: r.email,
        name: r.name,
        proposedEquityPercent,
        proposedAmount,
        invitedByUid: callerUid,
        invitedByName,
        token,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        termsVersion: termsVersion || 1,
      };

      // Set invitation document
      await adminDb.collection('invitations').doc(invitationId).set(invitation);

      const channelsSent: string[] = [];

      // A. Process In-App Invitation
      if (r.inAppConsent) {
        // Resolve UID by email
        const userQuery = await adminDb.collection('users').where('email', '==', r.email).limit(1).get();
        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          const notificationId = `not_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
          
          await adminDb.collection('notifications').doc(notificationId).set({
            id: notificationId,
            recipientId: userDoc.id,
            type: 'INVEST_INVITE',
            title: `Investment Invitation — ${dealName}`,
            body: `${invitedByName} has invited you to co-invest in the project at ${deal.propertyAddress || dealName}.`,
            actor: {
              uid: callerUid,
              name: invitedByName,
            },
            objectReference: {
              projectId,
              dealAddress: deal.propertyAddress || dealName,
              amount: `$${proposedAmount.toLocaleString()}`,
              token,
            },
            urgencyLevel: 'normal',
            channels: ['in-app'],
            read: false,
            archived: false,
            createdAt: new Date(),
            deepLinkUrl: `/invest/${token}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          
          channelsSent.push('in-app');
          inAppSentCount++;
        }
      }

      // B. Process External Email Invitation
      if (r.emailConsent) {
        // Format Prose and inject variables
        let formattedBody = bodyTemplate
          .replaceAll('{{PROPERTY_ADDRESS}}', deal.propertyAddress || dealName)
          .replaceAll('{{TARGET_PRICE}}', fin.finalAgreedPrice ? `$${(fin.finalAgreedPrice / 100).toLocaleString()}` : fin.purchasePrice ? `$${(fin.purchasePrice / 100).toLocaleString()}` : '$0')
          .replaceAll('{{PROJECTED_NOI}}', fin.projectedNOI ? `$${(fin.projectedNOI / 100).toLocaleString()}` : '$0')
          .replaceAll('{{PROJECTED_CAP_RATE}}', fin.projectedCapRate ? `${fin.projectedCapRate}%` : '0%')
          .replaceAll('{{PROJECTED_COC}}', fin.projectedCashOnCash ? `${fin.projectedCashOnCash}%` : '0%')
          .replaceAll('{{STRATEGY}}', deal.subStrategy || deal.dispositionType || 'Value-Add')
          .replaceAll('{{HOLD_HORIZON}}', fin.holdPeriodYears ? `${fin.holdPeriodYears} Years` : '5 Years')
          .replaceAll('{{FUNDING_TARGET}}', `$${fundingTarget.toLocaleString()}`)
          .replaceAll('{{EQUITY_PERCENT}}', `${equityOfferedPct}%`)
          .replaceAll('{{MIN_TICKET}}', `$${minTicket.toLocaleString()}`);

        // Append non-binding disclosure & unsubscribe link
        const emailHtml = `
          <div style="font-family:sans-serif;line-height:1.6;color:#e8e6ea;background-color:#0d0a0b;padding:24px;border-radius:16px;">
            <div style="margin-bottom:20px;">
              <h2 style="font-weight:bold;color:#ffffff;margin-top:0;">${subject}</h2>
            </div>
            <div style="white-space:pre-wrap;font-size:14px;color:#9e9da0;">${formattedBody}</div>
            
            <div style="margin-top:30px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);text-align:center;">
              <a href="${APP_URL}/invest/${token}" style="display:inline-block;padding:12px 24px;background-color:#454955;color:#0d0a0b;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;">Review Deal & Respond</a>
            </div>

            <div style="margin-top:40px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#6b6a6d;line-height:1.4;">
              <p>Disclosure: This invitation and any associated materials are for informational purposes only and do not constitute an offer to sell or a solicitation of an offer to buy any securities. Any investment commitment made hereunder is non-binding.</p>
              <p>If you no longer wish to receive invitations for this project, you can <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(r.email)}&projectId=${projectId}" style="color:#454955;text-decoration:underline;">unsubscribe here</a>.</p>
            </div>
          </div>
        `;

        await CommunicationEngine.sendRawEmail([r.email], subject, emailHtml);
        channelsSent.push('email');
        emailSentCount++;
      }

      recipientsLogged.push({
        email: r.email,
        name: r.name,
        channels: channelsSent,
        status: 'not tracked', // defaults to not tracked since webhook isn't configured in test
      });
    }

    // 7. Write history log document
    const historyDocId = `hist_${Date.now()}`;
    await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('invitation_history')
      .doc(historyDocId)
      .set({
        id: historyDocId,
        sentAt: new Date(),
        subject,
        bodyTemplate,
        termsVersion: termsVersion || 1,
        recipients: recipientsLogged,
      });

    return NextResponse.json({
      success: true,
      emailSentCount,
      inAppSentCount,
      totalCount: activeRecipients.length,
    });
  } catch (error) {
    logger.error('[Invitations/Broadcast] General Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
