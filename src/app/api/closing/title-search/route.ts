import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { logger } from '@/lib/logger';

/* ═══════════════════════════════════════════════════════
   POST /api/closing/title-search

   Title search requires a real provider integration
   (county records API, First American, Westlaw PeopleMap, etc.).
   No provider is currently configured.

   Architecture decision required before this route can return
   real data. See web3RegistryHooks.ts for the provider interface
   design notes.
   ═══════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  let body: { projectId?: string; propertyAddress?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.propertyAddress) {
    return NextResponse.json(
      { success: false, error: 'propertyAddress is required' },
      { status: 400 }
    );
  }

  logger.info('[title-search] Provider not configured — returning unavailable', {
    callerUid: auth.uid,
    projectId: body.projectId,
  });

  return NextResponse.json(
    {
      success: false,
      providerDecisionRequired: true,
      error:
        'Title search provider not configured. A real provider (county records API, First American, Stewart Title, etc.) must be integrated before live title data is available.',
    },
    { status: 503 }
  );
}
