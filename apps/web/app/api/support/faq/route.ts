import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getFaqEntries,
  searchFaqEntries,
  getFaqEntryById,
  upsertFaqEntry,
} from '@/lib/support/firestore-support-store';
import {
  validateAndSanitizeFaqInput,
  validateAndSanitizeFaqPatch,
  ContentSecurityError,
} from '@/lib/support/content-filter';
import { verifySupportAdminAuth } from '@/lib/support/admin-guard';
import type { FaqEntry } from '@/lib/support/types';

export const dynamic = 'force-dynamic';

/**
 * Public GET: Search or list FAQ entries.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const results = query.trim() ? await searchFaqEntries(query) : await getFaqEntries();

    return NextResponse.json({
      success: true,
      total: results.length,
      faqs: results,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to retrieve FAQs' },
      { status: 500 },
    );
  }
}

/**
 * Admin POST: Inserts new FAQ entries.
 * Restricted to verified Firebase ID tokens with admin: true claim (401 unauth / 403 non-admin).
 */
export async function POST(request: NextRequest) {
  const authResult = await verifySupportAdminAuth(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const inserted: FaqEntry[] = [];

    if (Array.isArray(body.faqs)) {
      for (const item of body.faqs) {
        const sanitized = validateAndSanitizeFaqInput(item);
        const saved = await upsertFaqEntry(sanitized);
        inserted.push(saved);
      }
    } else {
      const sanitized = validateAndSanitizeFaqInput(body);
      const saved = await upsertFaqEntry(sanitized);
      inserted.push(saved);
    }

    return NextResponse.json({
      success: true,
      count: inserted.length,
      faqs: inserted,
    });
  } catch (err: unknown) {
    if (err instanceof ContentSecurityError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || 'Validation failed' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to insert FAQ' },
      { status: 500 },
    );
  }
}

/**
 * Admin PATCH: Updates an existing FAQ entry.
 * Restricted to verified Firebase ID tokens with admin: true claim (401 unauth / 403 non-admin).
 */
export async function PATCH(request: NextRequest) {
  const authResult = await verifySupportAdminAuth(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const sanitizedPatch = validateAndSanitizeFaqPatch(body);
    const existing = await getFaqEntryById(sanitizedPatch.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `FAQ entry with id "${sanitizedPatch.id}" not found.` },
        { status: 404 },
      );
    }

    const updated: FaqEntry = {
      ...existing,
      ...sanitizedPatch,
      id: sanitizedPatch.id,
    };

    const saved = await upsertFaqEntry(updated);

    return NextResponse.json({
      success: true,
      updated: saved,
      faq: saved,
    });
  } catch (err: unknown) {
    if (err instanceof ContentSecurityError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || 'Validation failed' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update FAQ' },
      { status: 500 },
    );
  }
}
