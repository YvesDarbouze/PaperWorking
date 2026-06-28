import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import {
  PermitLookupSchema,
  lookupPermit,
  JurisdictionNotSupportedError,
  ExternalApiError,
} from '@/lib/services/permitService';
import { logger } from '@/lib/logger';

/* ═══════════════════════════════════════════════════════
   GET /api/permits

   Query params:
     propertyAddress  (required) — full street address
     jurisdictionId   (required) — e.g. "miami-dade"
     permitNumber     (optional) — look up a specific permit number

   Security contract:
   • Requires a valid Firebase ID token (Bearer scheme). No token → 401.
   • All permit data comes from permitService.ts (real Socrata open-data
     API or MockPermitAdapter when PERMIT_PROVIDER=mock).
   • The hardcoded { status: 'Approved' } stub is gone. Every non-Approved
     and error state is surfaced honestly.

   Provider selection (server-side env flag, no key required for mock):
     PERMIT_PROVIDER=mock    → MockPermitAdapter (deterministic, labeled)
     PERMIT_PROVIDER=socrata → OpenDataSocrataAdapter (default when unset)
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // ── 1. Authenticate ──────────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth; // 401

  // ── 2. Parse and validate query params ───────────────────
  const { searchParams } = req.nextUrl;

  const rawPermitNumber = searchParams.get('permitNumber');
  const raw = {
    propertyAddress: searchParams.get('propertyAddress') ?? '',
    jurisdictionId:  searchParams.get('jurisdictionId')  ?? '',
    permitNumber: rawPermitNumber && rawPermitNumber.trim() ? rawPermitNumber.trim() : undefined,
  };

  const parsed = PermitLookupSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { propertyAddress, jurisdictionId, permitNumber } = parsed.data;

  // ── 3. Look up the permit via permitService ───────────────
  try {
    const permit = await lookupPermit({ propertyAddress, jurisdictionId, permitNumber });

    logger.info('[Permits] Lookup completed', {
      callerUid: auth.uid,
      jurisdictionId,
      status: permit.status,
    });

    return NextResponse.json({ success: true, permit });
  } catch (err) {
    if (err instanceof JurisdictionNotSupportedError) {
      return NextResponse.json(
        {
          success: false,
          status: 'no-coverage',
          jurisdictionId: err.jurisdictionId,
          error: err.message,
        },
        { status: 422 }
      );
    }

    if (err instanceof ExternalApiError) {
      logger.error('[Permits] External API error', err, { jurisdictionId, propertyAddress });
      return NextResponse.json(
        {
          success: false,
          status: 'upstream-error',
          error: err.message,
        },
        { status: 502 }
      );
    }

    logger.error('[Permits] Unexpected error', err instanceof Error ? err : undefined, { jurisdictionId });
    return NextResponse.json(
      { success: false, error: 'Failed to look up permit' },
      { status: 500 }
    );
  }
}
