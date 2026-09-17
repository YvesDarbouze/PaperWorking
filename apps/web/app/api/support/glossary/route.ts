import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getGlossaryTerms,
  searchGlossaryTerms,
  upsertGlossaryTerm,
  groupGlossaryByLetter,
  slugifyTerm,
} from '@/lib/support/firestore-support-store';
import {
  validateAndSanitizeGlossaryInput,
  validateAndSanitizeGlossaryPatch,
  ContentSecurityError,
} from '@/lib/support/content-filter';
import { verifySupportAdminAuth } from '@/lib/support/admin-guard';
import type { GlossaryTerm } from '@/lib/support/types';

export const dynamic = 'force-dynamic';

/**
 * Public GET: Search or list glossary terms grouped alphabetically.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const terms = query.trim() ? await searchGlossaryTerms(query) : await getGlossaryTerms();
    const groups = groupGlossaryByLetter(terms);

    return NextResponse.json({
      success: true,
      total: terms.length,
      terms,
      groups,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to retrieve glossary terms' },
      { status: 500 },
    );
  }
}

/**
 * Admin POST: Inserts new glossary terms.
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

    const inserted: GlossaryTerm[] = [];

    if (Array.isArray(body.terms)) {
      for (const item of body.terms) {
        const sanitized = validateAndSanitizeGlossaryInput(item);
        const saved = await upsertGlossaryTerm(sanitized);
        inserted.push(saved);
      }
    } else {
      const sanitized = validateAndSanitizeGlossaryInput(body);
      const saved = await upsertGlossaryTerm(sanitized);
      inserted.push(saved);
    }

    return NextResponse.json({
      success: true,
      count: inserted.length,
      terms: inserted,
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
      { success: false, error: err instanceof Error ? err.message : 'Failed to insert glossary terms' },
      { status: 500 },
    );
  }
}

/**
 * Admin PATCH: Updates an existing glossary term.
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

    const sanitizedPatch = validateAndSanitizeGlossaryPatch(body);
    const targetIdentifier = sanitizedPatch.id || (sanitizedPatch.term ? slugifyTerm(sanitizedPatch.term) : null);

    if (!targetIdentifier) {
      return NextResponse.json(
        { success: false, error: 'id or term is required to update a glossary term.' },
        { status: 400 },
      );
    }

    const terms = await getGlossaryTerms();
    const existing = terms.find((t) => t.id === targetIdentifier || slugifyTerm(t.term) === targetIdentifier);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Glossary term "${targetIdentifier}" not found.` },
        { status: 404 },
      );
    }

    const updated: GlossaryTerm = {
      ...existing,
      ...sanitizedPatch,
      term: sanitizedPatch.term || existing.term,
      id: existing.id || targetIdentifier,
    };

    const saved = await upsertGlossaryTerm(updated);

    return NextResponse.json({
      success: true,
      updated: saved,
      term: saved,
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
      { success: false, error: err instanceof Error ? err.message : 'Failed to update glossary term' },
      { status: 500 },
    );
  }
}
