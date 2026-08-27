import { NextResponse } from 'next/server';
import {
  createDealInvitation,
  listDealInvitations,
  requireAuthOrJson,
} from '@/lib/membership/p1-seed-store';

export async function GET(request: Request) {
  const auth = await requireAuthOrJson();
  if (!auth.ok) return auth.response;

  const projectId = new URL(request.url).searchParams.get('projectId');
  const invitations = listDealInvitations(projectId);
  return NextResponse.json({
    success: true,
    collection: 'dealInvitations',
    count: invitations.length,
    invitations,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthOrJson();
  if (!auth.ok) return auth.response;

  let body: {
    dealListingId?: string;
    projectId?: string;
    inviteeEmail?: string;
    expiresAt?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.dealListingId || !body.projectId || !body.inviteeEmail) {
    return NextResponse.json(
      { error: 'dealListingId, projectId, and inviteeEmail are required' },
      { status: 400 },
    );
  }

  const invitation = createDealInvitation({
    dealListingId: body.dealListingId,
    projectId: body.projectId,
    inviterUid: auth.uid,
    inviteeEmail: body.inviteeEmail,
    expiresAt: body.expiresAt ?? new Date(Date.now() + 30 * 86400000).toISOString(),
  });

  return NextResponse.json({ success: true, invitation });
}
