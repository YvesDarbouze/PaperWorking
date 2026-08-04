import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/firebase-admin/admin-guard';
import { adminDb } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Lookup agent in Firestore or Prisma
    const userDoc = await adminDb.collection('users').doc(id).get();
    let userData = userDoc.exists ? userDoc.data() : null;

    if (!userData) {
      const pUser = (await prisma.user.findUnique({ where: { id } })) as any;
      if (pUser) {
        userData = {
          id: pUser.id,
          displayName: pUser.name,
          email: pUser.email,
          agentPersona: pUser.agentPersona,
          syntheticAgent: pUser.syntheticAgent,
          tier: pUser.tier || 'starter',
        };
      }
    }

    if (!userData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const email = userData.email || '';
    const name = userData.displayName || userData.name || 'Synthetic Agent';

    // Create session token and response
    const response = NextResponse.json({
      success: true,
      redirectUrl: '/dashboard/command-center',
      agent: {
        id,
        email,
        name,
        persona: userData.agentPersona || 'investor',
      },
    });

    // Set auth session cookies for agent login
    response.cookies.set('__session', `mock_session_agent_${id}`, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
    });

    response.cookies.set('mock_user_uid', id, { path: '/' });
    response.cookies.set('mock_user_email', email, { path: '/' });
    response.cookies.set('mock_user_name', name, { path: '/' });

    return response;
  } catch (err: any) {
    console.error('[Impersonate POST]', err);
    return NextResponse.json(
      { error: 'Failed to impersonate agent', message: err.message },
      { status: 500 }
    );
  }
}
