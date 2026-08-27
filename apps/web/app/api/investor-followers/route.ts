import { NextResponse } from 'next/server';
import {
  listInvestorFollowers,
  requireAuthOrJson,
  upsertInvestorFollower,
} from '@/lib/membership/p1-seed-store';

export async function GET(request: Request) {
  const auth = await requireAuthOrJson();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const followers = listInvestorFollowers(
    url.searchParams.get('followerUid'),
    url.searchParams.get('targetUid'),
  );

  return NextResponse.json({
    success: true,
    collection: 'investorFollowers',
    count: followers.length,
    followers,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthOrJson();
  if (!auth.ok) return auth.response;

  let body: { targetUid?: string; follow?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.targetUid) {
    return NextResponse.json({ error: 'targetUid is required' }, { status: 400 });
  }

  const result = upsertInvestorFollower(auth.uid, body.targetUid, body.follow !== false);
  return NextResponse.json({ success: true, ...result });
}
