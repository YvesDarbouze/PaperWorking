import { NextResponse } from 'next/server';
import { executePropertyLookup } from '@/lib/calculator/property-lookup-service';
import { requireDevSessionAuth, isDevAuthFailure } from '@/lib/projects/dev-session-auth';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';

export const dynamic = 'force-dynamic';

interface ResolvedAuth {
  userId: string | null;
  organizationId: string | null;
}

async function resolveCallerAuth(request: Request): Promise<ResolvedAuth> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (isValidSessionToken(token)) {
      const verified = verifySessionToken(token);
      if (verified?.uid) {
        const verifiedRecord = verified as unknown as Record<string, unknown>;
        const orgId = (verifiedRecord.organizationId || verifiedRecord.orgId) as string | undefined;
        return {
          userId: verified.uid,
          organizationId: orgId || null,
        };
      }
    }
  }

  const devAuth = await requireDevSessionAuth();
  if (!isDevAuthFailure(devAuth) && devAuth.uid) {
    return {
      userId: devAuth.uid,
      organizationId: devAuth.organizationId || null,
    };
  }

  return { userId: null, organizationId: null };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const forceRefresh = searchParams.get('refresh') === 'true';
  const { userId, organizationId } = await resolveCallerAuth(request);

  return executePropertyLookup(address, {
    forceRefresh,
    userId,
    organizationId,
    requestHeaders: request.headers,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string; refresh?: boolean };
    const { userId, organizationId } = await resolveCallerAuth(request);
    return executePropertyLookup(body.address, {
      forceRefresh: Boolean(body.refresh),
      userId,
      organizationId,
      requestHeaders: request.headers,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
