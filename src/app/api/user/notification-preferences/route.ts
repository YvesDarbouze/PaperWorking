/**
 * GET  /api/user/notification-preferences — returns current prefs (creates defaults on first access)
 * PUT  /api/user/notification-preferences — updates prefs
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { TransactionNotificationService } from '@/lib/notifications/transactionNotifications';
import { EmailDigestMode, EmailAlertThreshold, FinancialTransactionCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_CATEGORIES = Object.values(FinancialTransactionCategory) as string[];

const prefsSchema = z.object({
  emailTransactionAlerts: z.boolean().optional(),
  emailAlertCategories: z
    .array(z.string())
    .refine((cats) => cats.every((c) => VALID_CATEGORIES.includes(c)), {
      message: 'Invalid category in emailAlertCategories',
    })
    .optional(),
  emailAlertMinAmount: z.number().min(0).optional(),
  emailDigestMode: z.enum(['IMMEDIATE', 'HOURLY_BATCH', 'DAILY_DIGEST']).optional(),
  emailAlertThreshold: z.enum(['ALL', 'HIGH_CONFIDENCE_ONLY', 'MANUAL_APPROVAL_ONLY']).optional(),
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const userId = auth.uid;

  try {
    const prefs = await TransactionNotificationService.getOrCreatePreferences(userId);
    return NextResponse.json({
      success: true,
      preferences: {
        ...prefs,
        emailAlertMinAmount: Number(prefs.emailAlertMinAmount),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/user/notification-preferences] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const userId = auth.uid;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  try {
    // Ensure preferences row exists first
    await TransactionNotificationService.getOrCreatePreferences(userId);

    const updated = await prisma.userNotificationPreferences.update({
      where: { userId },
      data: {
        ...(data.emailTransactionAlerts !== undefined && { emailTransactionAlerts: data.emailTransactionAlerts }),
        ...(data.emailAlertCategories !== undefined && { emailAlertCategories: data.emailAlertCategories }),
        ...(data.emailAlertMinAmount !== undefined && { emailAlertMinAmount: data.emailAlertMinAmount }),
        ...(data.emailDigestMode !== undefined && { emailDigestMode: data.emailDigestMode as EmailDigestMode }),
        ...(data.emailAlertThreshold !== undefined && { emailAlertThreshold: data.emailAlertThreshold as EmailAlertThreshold }),
      },
    });

    return NextResponse.json({
      success: true,
      preferences: {
        ...updated,
        emailAlertMinAmount: Number(updated.emailAlertMinAmount),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PUT /api/user/notification-preferences] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
