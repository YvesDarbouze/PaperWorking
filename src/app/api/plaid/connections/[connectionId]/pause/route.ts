import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';

/**
 * Pause / Resume a BankConnection.
 *
 * POST   /api/plaid/connections/[connectionId]/pause  → status = 'paused'
 * DELETE /api/plaid/connections/[connectionId]/pause  → status = 'active'  (resume)
 *
 * Paused connections are skipped by the sync cron — the access_token is retained
 * so re-activation is instant (no Plaid re-link needed).
 *
 * Auth:      Firebase ID token
 * Security:  Ownership verified — user may only pause their own connections.
 */

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ connectionId: string }>;
}

async function resolveOwnership(uid: string, connectionId: string) {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, userId: true, status: true },
  });

  if (!connection) {
    return { error: NextResponse.json({ success: false, error: 'Connection not found' }, { status: 404 }) };
  }
  if (connection.userId !== uid) {
    return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  }
  return { connection };
}

/** POST → pause */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;
  const { connectionId } = await params;

  const { error, connection } = await resolveOwnership(uid, connectionId);
  if (error) return error;

  if (connection!.status === 'paused') {
    return NextResponse.json({ success: true, status: 'paused', message: 'Already paused' });
  }

  await prisma.bankConnection.update({
    where: { id: connectionId },
    data: { status: 'paused' },
  });

  // Telemetry (fire-and-forget)
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (posthogKey) {
    fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event: 'plaid_connection_paused',
        distinct_id: uid,
        properties: { connectionId },
      }),
    }).catch(() => {/* ignore */});
  }

  return NextResponse.json({ success: true, status: 'paused' });
}

/** DELETE → resume (set back to active) */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;
  const { connectionId } = await params;

  const { error, connection } = await resolveOwnership(uid, connectionId);
  if (error) return error;

  if (connection!.status === 'active') {
    return NextResponse.json({ success: true, status: 'active', message: 'Already active' });
  }

  await prisma.bankConnection.update({
    where: { id: connectionId },
    data: { status: 'active' },
  });

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (posthogKey) {
    fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event: 'plaid_connection_resumed',
        distinct_id: uid,
        properties: { connectionId },
      }),
    }).catch(() => {/* ignore */});
  }

  return NextResponse.json({ success: true, status: 'active' });
}
