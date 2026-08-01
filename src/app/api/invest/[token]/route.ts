import { NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════════════════════
   /api/invest/[token] — retired.

   This route backed the `investmentTokens` collection, which has
   no live creator anywhere in the codebase (the current invite
   pipeline is `invitations` -> POST /api/invitations/respond ->
   projects/{id}/commitments). It also wrote directly into
   `fractionalInvestors` with status 'confirmed' immediately upon
   signature, bypassing the leadInvestor-confirmation step entirely.

   Both handlers now return 410 so any stale outstanding link
   (e.g. from an old email) gets a clear, honest message instead
   of writing bogus, non-reconciled investor data.
   ═══════════════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

const LEGACY_RESPONSE = {
  success: false,
  legacy: true,
  error: 'This investment link type is no longer supported. Please contact your leadInvestor for a new invitation.',
};

export async function GET() {
  return NextResponse.json(LEGACY_RESPONSE, { status: 410 });
}

export async function POST() {
  return NextResponse.json(LEGACY_RESPONSE, { status: 410 });
}
