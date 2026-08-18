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

    const body = await request.json();
    const validation = createInviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const payload = validation.data;
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
