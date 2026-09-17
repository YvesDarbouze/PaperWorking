import { NextResponse } from 'next/server';
import { executePropertyLookup } from '@/lib/calculator/property-lookup-service';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';

export const dynamic = 'force-dynamic';

async function resolveCallerAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (isValidSessionToken(token)) {
      const verified = verifySessionToken(token);
      if (verified?.uid) return verified.uid;
    }
  }

  const devAuth = await tryDevSessionAuth();
  if (devAuth?.uid) return devAuth.uid;

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const forceRefresh = searchParams.get('refresh') === 'true';
  const userId = await resolveCallerAuth(request);

  return executePropertyLookup(address, {
    forceRefresh,
    userId,
    requestHeaders: request.headers,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string; refresh?: boolean };
    const userId = await resolveCallerAuth(request);
    return executePropertyLookup(body?.address, {
      forceRefresh: Boolean(body?.refresh),
      userId,
      requestHeaders: request.headers,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
