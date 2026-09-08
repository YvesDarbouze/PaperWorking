import { NextResponse } from 'next/server';
import {
  tryDevSessionAuth,
  requireDevSessionAuth,
  isDevAuthFailure,
} from '@/lib/projects/dev-session-auth';
import {
  getUserSavedDeals,
  toggleUserSavedDeal,
  mergeAnonymousSavedDeals,
  setUserSavedDeals,
} from '@/lib/marketplace/saved-deals-store';

export async function GET() {
  const auth = await tryDevSessionAuth();

  if (!auth) {
    return NextResponse.json({
      authenticated: false,
      savedDealIds: [],
    });
  }

  const savedDealIds = getUserSavedDeals(auth.uid);
  return NextResponse.json({
    authenticated: true,
    savedDealIds,
  });
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();

  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: {
    dealId?: string;
    action?: 'save' | 'unsave';
    mergeAnonymous?: string[];
    savedDealIds?: string[];
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let updatedIds: string[];

  if (Array.isArray(body.mergeAnonymous)) {
    updatedIds = mergeAnonymousSavedDeals(auth.uid, body.mergeAnonymous);
  } else if (Array.isArray(body.savedDealIds)) {
    updatedIds = setUserSavedDeals(auth.uid, body.savedDealIds);
  } else if (body.dealId) {
    const forceSaved = body.action ? body.action === 'save' : undefined;
    const result = toggleUserSavedDeal(auth.uid, body.dealId, forceSaved);
    updatedIds = result.savedDealIds;
  } else {
    updatedIds = getUserSavedDeals(auth.uid);
  }

  return NextResponse.json({
    success: true,
    savedDealIds: updatedIds,
  });
}
