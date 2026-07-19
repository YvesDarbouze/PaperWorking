import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import {
  ATTORNEY_CLOSE_STATES_SEED,
  ATTORNEY_STATES_DOC_PATH,
} from '@/lib/config/attorneyStates';

export const dynamic = 'force-dynamic';

/**
 * GET /api/config/attorney-states
 *
 * Returns the current attorney-close state list from Firestore.
 * If the document doesn't exist yet, seeds it from the default list.
 *
 * Public read — no auth required (the list is non-sensitive config data).
 */
export async function GET() {
  try {
    const docRef = adminDb.doc(ATTORNEY_STATES_DOC_PATH);
    const snap = await docRef.get();

    if (snap.exists) {
      const data = snap.data()!;
      return NextResponse.json({
        states: data.states || [],
        seededAt: data.seededAt || null,
        updatedAt: data.updatedAt || null,
      });
    }

    // Auto-seed on first read
    const now = new Date().toISOString();
    const seedPayload = {
      states: [...ATTORNEY_CLOSE_STATES_SEED],
      seededAt: now,
      updatedAt: now,
      updatedBy: 'system_seed',
      description:
        'States where attorney involvement at closing is customary or required. ' +
        'Founder-editable — the platform organizes eligibility, never makes a legal determination.',
    };
    await docRef.set(seedPayload);

    return NextResponse.json({
      states: seedPayload.states,
      seededAt: now,
      updatedAt: now,
    });
  } catch (err: any) {
    console.error('[Attorney States Config]', err.message);
    return NextResponse.json({ error: 'Failed to load attorney states' }, { status: 500 });
  }
}

/**
 * PUT /api/config/attorney-states
 *
 * Updates the attorney-close state list. Founder/admin only.
 *
 * Body: { states: string[] }
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const { states } = body;

    if (!Array.isArray(states) || states.some((s: any) => typeof s !== 'string' || s.length !== 2)) {
      return NextResponse.json(
        { error: 'states must be an array of 2-letter state codes' },
        { status: 422 }
      );
    }

    const normalized = states.map((s: string) => s.toUpperCase().trim());
    const unique = [...new Set(normalized)].sort();

    const now = new Date().toISOString();
    const docRef = adminDb.doc(ATTORNEY_STATES_DOC_PATH);
    await docRef.set(
      {
        states: unique,
        updatedAt: now,
        updatedBy: auth.uid,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, states: unique, updatedAt: now });
  } catch (err: any) {
    console.error('[Attorney States Config PUT]', err.message);
    return NextResponse.json({ error: 'Failed to update attorney states' }, { status: 500 });
  }
}
