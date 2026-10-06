import { NextRequest, NextResponse } from 'next/server';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { recordUserConsent } from '@/lib/auth/user-consent-store';

export const dynamic = 'force-dynamic';

interface ConsentBody {
  consentType?: unknown;
  version?: unknown;
  metadata?: unknown;
  userId?: unknown;
}

/** POST /api/auth/consent — record a timestamped consent event (signup, Plaid, callback). */
export async function POST(request: NextRequest) {
  try {
    let body: ConsentBody = {};
    try {
      body = (await request.json()) as ConsentBody;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { consentType, version, metadata } = body;
    if (!consentType || typeof consentType !== 'string') {
      return NextResponse.json({ success: false, error: 'consentType is required' }, { status: 400 });
    }

    const session = await tryDevSessionAuth();
    const userId =
      session?.uid ?? (typeof body.userId === 'string' && body.userId.trim() ? body.userId : null);

    const forwarded = request.headers.get('x-forwarded-for') || '';
    const ipAddress =
      forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const record = await recordUserConsent({
      userId,
      consentType,
      version: typeof version === 'string' && version.trim() ? version : '2026-08',
      agreedAt: new Date().toISOString(),
      ipAddress,
      userAgent,
      metadata:
        metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : null,
    });

    return NextResponse.json({
      success: true,
      consentId: record.id,
      consentType: record.consentType,
      version: record.version,
      agreedAt: record.agreedAt,
    });
  } catch (err: unknown) {
    console.error('[POST /api/auth/consent] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to record consent record' },
      { status: 500 },
    );
  }
}
