/**
 * GET  /api/user/notification-preferences — returns current prefs (creates defaults on first access)
 * PUT  /api/user/notification-preferences — validates and merges prefs
 *
 * Auth: session cookie or Firebase ID token via Authorization: Bearer header.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import {
  getOrCreateNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/email/notification-preferences-store';

export const dynamic = 'force-dynamic';

// ─── Validation ───────────────────────────────────────────────────────────────

const prefsSchema = z.object({
  emailTransactionAlerts: z.boolean().optional(),
  emailAlertCategories: z.array(z.string()).optional(),
  emailAlertMinAmount: z.number().min(0).optional(),
  emailDigestMode: z.enum(['IMMEDIATE', 'HOURLY_BATCH', 'DAILY_DIGEST']).optional(),
  emailAlertThreshold: z.enum(['ALL', 'HIGH_CONFIDENCE_ONLY', 'MANUAL_APPROVAL_ONLY']).optional(),
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const preferences = await getOrCreateNotificationPreferences(user.uid);
    return NextResponse.json({ success: true, preferences });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GET /api/user/notification-preferences] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(request: Request): Promise<NextResponse> {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const preferences = await updateNotificationPreferences(user.uid, parsed.data);
    return NextResponse.json({ success: true, preferences });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PUT /api/user/notification-preferences] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
