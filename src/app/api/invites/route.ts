import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

const createInviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
  role: z.enum(['team_member', 'vendor', 'investor']).default('team_member'),
  professionalRole: z.string().optional().default('General Specialist'),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  customMessage: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // Fetch inviter user accountType
    const inviterSnap = await adminDb.collection('users').doc(uid).get();
    const inviterData = inviterSnap.data();
    const inviterAccountType = inviterData?.accountType || inviterData?.account_type || 'investor';

    // ONLY Investment Team accounts can invite to Deals / Projects
    if (inviterAccountType !== 'investment_team' && inviterAccountType !== 'team') {
      return NextResponse.json(
        { error: 'Only Investment Team accounts can invite others to Deals.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createInviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const payload = validation.data;

    // Validate recipient is part of an Investment Team
    const recipientSnap = await adminDb.collection('users').where('email', '==', payload.email.toLowerCase()).get();
    if (!recipientSnap.empty) {
      const recipientData = recipientSnap.docs[0].data();
      const recipientAccountType = recipientData.accountType || recipientData.account_type;
      const recipientTeamId = recipientData.teamId || recipientData.organizationId;
      if (recipientAccountType === 'investor' && !recipientTeamId) {
        return NextResponse.json(
          {
            error: 'Recipient must be part of an Investment Team to participate in this Deal.',
            action: 'prompt_join_team',
            teamOptions: []
          },
          { status: 400 }
        );
      }
    }
    const inviteRef = adminDb.collection('invites').doc();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days expiration

    const inviteDoc = {
      invite_id: inviteRef.id,
      id: inviteRef.id,
      invited_by: uid,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email,
      role: payload.role,
      account_type: payload.role === 'vendor' ? 'vendor' : payload.role === 'investor' ? 'investor' : 'team',
      professionalRole: payload.professionalRole,
      projectId: payload.projectId || null,
      projectName: payload.projectName || null,
      customMessage: payload.customMessage || null,
      status: 'pending', // pending | accepted | expired
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await inviteRef.set(inviteDoc);

    return NextResponse.json(
      {
        success: true,
        inviteId: inviteRef.id,
        status: 'pending',
        invite: inviteDoc,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Invites POST Error]:', errMsg);
    return NextResponse.json(
      { error: 'Failed to create invite', details: errMsg },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const snapshot = await adminDb
      .collection('invites')
      .where('invited_by', '==', uid)
      .get();

    const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, invites });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Invites GET Error]:', errMsg);
    return NextResponse.json(
      { error: 'Failed to fetch invites', details: errMsg },
      { status: 500 }
    );
  }
}
