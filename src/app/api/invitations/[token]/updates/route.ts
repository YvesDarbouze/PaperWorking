import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   GET /api/invitations/[token]/updates

   Public endpoint (no auth required — same trust model as
   GET /api/invitations/[token]). Resolves an invitation token
   to its project's leadInvestor-authored deal updates feed.

   Allowlisted response only — authorUid is stripped, matching
   the discipline in GET /api/invitations/[token].
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
  }

  try {
    const invSnap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (invSnap.empty) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const inv = invSnap.docs[0].data();

    const updatesSnap = await adminDb
      .collection('projects')
      .doc(inv.projectId)
      .collection('dealUpdates')
      .orderBy('createdAt', 'desc')
      .limit(25)
      .get();

    const updates = updatesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title ?? null,
        body: data.body,
        authorName: data.authorName,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ updates });
  } catch (error) {
    console.error('[GuestPortal] Deal updates lookup failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
