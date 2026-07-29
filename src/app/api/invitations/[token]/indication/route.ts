import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { Resend } from 'resend';
import { renderEmailLayout } from '@/lib/emails/templates/BaseLayout';
import { trackDealActivity } from '@/lib/invitations/activityTimeline';
import { NON_BINDING_DISCLOSURE } from '@/lib/constants/disclosure';

export const dynamic = 'force-dynamic';

const getResend = () => process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.co';

async function blockVendor(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  let callerUid: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7);
    try {
      const decoded = await adminDb.collection('users').doc(idToken).get();
      if (decoded.exists) callerUid = decoded.id;
      else {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        callerUid = decodedToken.uid;
      }
    } catch (e) {
      if ((idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123') && process.env.ENABLE_MOCK_AUTH === 'true') {
        callerUid = request.cookies.get('mock_user_uid')?.value || null;
      }
    }
  } else if (process.env.ENABLE_MOCK_AUTH === 'true') {
    callerUid = request.cookies.get('mock_user_uid')?.value || null;
  }

  if (callerUid) {
    const userSnap = await adminDb.collection('users').doc(callerUid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    if (userData && (userData.role === 'Vendor' || userData.accountType === 'vendor')) {
      return true;
    }
  }
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    if (await blockVendor(request)) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    const { token } = await params;
    const body = await request.json();
    const { type, value, currency } = body;

    // Validate request inputs
    if (type !== 'percentage' && type !== 'amount') {
      return NextResponse.json(
        { error: 'Indication type must be "percentage" or "amount".' },
        { status: 400 }
      );
    }

    if (typeof value !== 'number' || value <= 0) {
      return NextResponse.json(
        { error: 'Indication value must be a positive number.' },
        { status: 400 }
      );
    }

    if (type === 'percentage' && value > 100) {
      return NextResponse.json(
        { error: 'Percentage value cannot exceed 100.' },
        { status: 400 }
      );
    }

    if (type === 'amount' && (!currency || typeof currency !== 'string' || currency.length !== 3)) {
      return NextResponse.json(
        { error: 'Indication amount requires a valid 3-letter currency code.' },
        { status: 400 }
      );
    }

    // Resolve invitation
    let isDealInvitation = false;
    let snap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snap.empty) {
      snap = await adminDb
        .collection('dealInvitations')
        .where('token', '==', token)
        .limit(1)
        .get();
      if (!snap.empty) {
        isDealInvitation = true;
      }
    }

    if (snap.empty) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const invRef = snap.docs[0].ref;
    const inv = snap.docs[0].data();

    // Check expiration
    const expiresAt = inv.expiresAt?.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    const cleanCurrency = type === 'amount' ? currency.toUpperCase().trim() : null;

    // Save to Firestore
    await invRef.update({
      indication: {
        type,
        value,
        currency: cleanCurrency,
        updatedAt: new Date().toISOString(),
      },
    });

    // Notify Lead Investor
    const inviterId = inv.inviterUid || inv.invitedByUid || 'system';
    const [projectSnap, ownerSnap] = await Promise.all([
      adminDb.collection('projects').doc(inv.projectId).get(),
      inviterId !== 'system'
        ? adminDb.collection('users').doc(inviterId).get()
        : Promise.resolve(null),
    ]);

    const dealName = projectSnap.exists
      ? (projectSnap.data()?.propertyName ?? 'Untitled Deal')
      : (inv.dealName ?? 'Untitled Deal');
    const ownerEmail = ownerSnap?.exists ? ownerSnap.data()?.email : null;

    const inviteeName = inv.inviteeName || inv.name || 'Anonymous Investor';
    const inviteeEmail = inv.inviteeEmail || inv.email;

    const resend = getResend();
    if (resend && ownerEmail) {
      const formattedValue =
        type === 'amount'
          ? `${cleanCurrency} ${Number(value).toLocaleString()}`
          : `${value}%`;

      const emailBody = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #0d0d0d;">Soft Commit Updated</h2>
          <p>An invitee has submitted or updated their non-binding indication of interest for the deal <strong>${dealName}</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Invitee Details:</strong></p>
          <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
            <li><strong>Name:</strong> ${inviteeName}</li>
            <li><strong>Email:</strong> ${inviteeEmail}</li>
          </ul>
          <p><strong>Indicated Amount / Share:</strong></p>
          <p style="font-size: 20px; font-weight: bold; color: #10b981; margin: 0 0 20px 0;">
            ${formattedValue}
          </p>
          <p style="font-size: 11px; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
            * Note: ${NON_BINDING_DISCLOSURE}
          </p>
        </div>
      `;

      const html = renderEmailLayout({
        title: 'Soft Commit Updated',
        bodyHtml: emailBody,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      });

      await resend.emails.send({
        from: FROM_EMAIL,
        to: [ownerEmail],
        subject: `[Soft Commit] Indication of Interest update for ${dealName}`,
        html,
      }).catch((e: any) => console.error('Failed to dispatch notification email:', e.message));
    }

    // Log timeline activity
    await trackDealActivity(
      inv.projectId,
      inv.projectId,
      inviterId,
      'interest',
      {
        inviteeEmail,
        indicatedType: type,
        indicatedValue: value,
        indicatedCurrency: cleanCurrency,
      }
    ).catch((e: any) => console.error('Failed to log indication timeline event:', e));

    // Track event via Event Taxonomy
    try {
      const { trackEvent } = require('@/actions/telemetry');
      await trackEvent('deal_interest_indicated', {
        listingId: inv.listingId || null,
        projectId: inv.projectId,
        type,
        currency: cleanCurrency,
        value,
      }, token);
    } catch (e) {
      console.error('Failed to log indication telemetry event:', e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Indication POST Error]', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    if (await blockVendor(request)) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    const { token } = await params;

    // Resolve invitation
    let isDealInvitation = false;
    let snap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snap.empty) {
      snap = await adminDb
        .collection('dealInvitations')
        .where('token', '==', token)
        .limit(1)
        .get();
      if (!snap.empty) {
        isDealInvitation = true;
      }
    }

    if (snap.empty) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const invRef = snap.docs[0].ref;
    const inv = snap.docs[0].data();

    // Check expiration
    const expiresAt = inv.expiresAt?.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    // Save/Withdraw indication on invitation record
    await invRef.update({
      indication: null,
    });

    // Notify Lead Investor
    const inviterId = inv.inviterUid || inv.invitedByUid || 'system';
    const [projectSnap, ownerSnap] = await Promise.all([
      adminDb.collection('projects').doc(inv.projectId).get(),
      inviterId !== 'system'
        ? adminDb.collection('users').doc(inviterId).get()
        : Promise.resolve(null),
    ]);

    const dealName = projectSnap.exists
      ? (projectSnap.data()?.propertyName ?? 'Untitled Deal')
      : (inv.dealName ?? 'Untitled Deal');
    const ownerEmail = ownerSnap?.exists ? ownerSnap.data()?.email : null;

    const inviteeName = inv.inviteeName || inv.name || 'Anonymous Investor';
    const inviteeEmail = inv.inviteeEmail || inv.email;

    const resend = getResend();
    if (resend && ownerEmail) {
      const emailBody = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #ea580c;">Soft Commit Withdrawn</h2>
          <p>An invitee has withdrawn their non-binding indication of interest for the deal <strong>${dealName}</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Invitee Details:</strong></p>
          <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
            <li><strong>Name:</strong> ${inviteeName}</li>
            <li><strong>Email:</strong> ${inviteeEmail}</li>
          </ul>
          <p style="font-size: 11px; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
            * Note: ${NON_BINDING_DISCLOSURE}
          </p>
        </div>
      `;

      const html = renderEmailLayout({
        title: 'Soft Commit Withdrawn',
        bodyHtml: emailBody,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      });

      await resend.emails.send({
        from: FROM_EMAIL,
        to: [ownerEmail],
        subject: `[Soft Commit] Indication of Interest withdrawn for ${dealName}`,
        html,
      }).catch((e: any) => console.error('Failed to dispatch notification email:', e.message));
    }

    // Log timeline activity
    await trackDealActivity(
      inv.projectId,
      inv.projectId,
      inviterId,
      'decline',
      {
        inviteeEmail,
        withdrawnIndication: true,
      }
    ).catch((e: any) => console.error('Failed to log indication timeline event:', e));

    // Track event via Event Taxonomy
    try {
      const { trackEvent } = require('@/actions/telemetry');
      await trackEvent('deal_interest_indicated', {
        listingId: inv.listingId || null,
        projectId: inv.projectId,
        type: 'amount',
        currency: null,
        value: 0,
      }, token);
    } catch (e) {
      console.error('Failed to log indication telemetry event:', e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Indication DELETE Error]', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
