import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { getPropertyProvider } from '@/lib/providers/property';
import { logger } from '@/lib/logger';

/**
 * POST /api/property/enrich
 *
 * Fetches (or serves from Prisma cache) property facts + comps for a project address.
 * Uses the configured property provider (PROPERTY_DATA_PROVIDER env var).
 *
 * Security:
 *   - Requires a valid Firebase ID token (Authorization: Bearer <token>)
 *   - Caller must be a member of the target project
 *   - invitedByUid / caller identity always from the verified token, never the request body
 *
 * Body: { projectId: string; address: string; forceRefresh?: boolean }
 *
 * Response:
 *   200 { facts, comps, cached, asOf, provider }
 *   200 { noCoverage: true, address }        — address not covered by provider
 *   400 missing fields
 *   401 / 403 auth / permission errors
 *   500 unexpected errors
 *
 * Caching:
 *   - Provider-level: Firestore cache in rentcastPropertyCache/* (TTL per endpoint)
 *   - Route-level: Prisma reilPropertyFacts is the authoritative store;
 *     fresh = fetchedAt within 7 days. forceRefresh=true bypasses this check.
 */

const ROUTE_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const callerUid = auth.uid;

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let body: { projectId?: string; address?: string; forceRefresh?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectId, address, forceRefresh = false } = body;

  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'Missing required field: projectId' }, { status: 400 });
  }
  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    return NextResponse.json({ error: 'Missing or invalid field: address' }, { status: 400 });
  }

  // ── 3. Project membership check ────────────────────────────────────────────
  const projectSnap = await adminDb.collection('projects').doc(projectId).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const project = projectSnap.data()!;
  const members: Record<string, unknown> = project.members ?? {};

  const isMember    = callerUid in members;
  const isOwner     = project.ownerId === callerUid;
  const isOrgMember = !!project.organizationId && (
    await adminDb.collection('users').doc(callerUid).get()
  ).data()?.organizationId === project.organizationId;

  if (!isMember && !isOwner && !isOrgMember) {
    logger.warn('[property/enrich] Caller not a member of project', { callerUid, projectId });
    return NextResponse.json(
      { error: 'Forbidden: you are not a member of this project' },
      { status: 403 },
    );
  }

  try {
    // ── 4. Route-level cache check (Firestore project doc sub-collection) ──────
    if (!forceRefresh) {
      const cachedSnap = await adminDb
        .collection('projects')
        .doc(projectId)
        .collection('propertyFacts')
        .doc('current')
        .get();

      if (cachedSnap.exists) {
        const cached = cachedSnap.data()!;
        const fetchedAt: Date | null = cached.fetchedAt?.toDate?.() ?? null;
        const age = fetchedAt ? Date.now() - fetchedAt.getTime() : Infinity;

        if (age < ROUTE_CACHE_MS && cached.sourceProvider !== 'MockPropertyProvider v1') {
          logger.info('[property/enrich] Serving route-level cache', { projectId, age: Math.round(age / 3600000) + 'h' });
          return NextResponse.json({
            facts:    cached.facts,
            comps:    cached.comps ?? [],
            cached:   true,
            asOf:     fetchedAt?.toISOString() ?? null,
            provider: cached.sourceProvider,
          });
        }
      }
    }

    // ── 5. Live fetch via provider ─────────────────────────────────────────────
    const provider = getPropertyProvider();
    const normalizedAddress = address.trim();

    const [facts, comps] = await Promise.all([
      provider.getFacts(normalizedAddress),
      provider.getComps(normalizedAddress),
    ]);

    // ── 6. No-coverage honest state ────────────────────────────────────────────
    if (facts.noCoverage) {
      logger.info('[property/enrich] Provider has no coverage', { projectId, address: normalizedAddress });
      return NextResponse.json({ noCoverage: true, address: normalizedAddress });
    }

    // ── 7. Persist to Firestore (project sub-collection as durable cache) ──────
    await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('propertyFacts')
      .doc('current')
      .set({
        facts,
        comps,
        fetchedAt:      facts.fetchedAt,
        sourceProvider: facts.sourceProvider,
        address:        normalizedAddress,
      });

    // Activity log
    await adminDb.collection('projects').doc(projectId).collection('activity').add({
      type:      'property_enriched',
      actorUid:  callerUid,
      address:   normalizedAddress,
      provider:  facts.sourceProvider,
      cached:    facts.cached ?? false,
      timestamp: new Date(),
    });

    logger.info('[property/enrich] Enriched successfully', {
      projectId,
      provider: facts.sourceProvider,
      cached: facts.cached ?? false,
    });

    return NextResponse.json({
      facts,
      comps,
      cached:   facts.cached ?? false,
      asOf:     facts.asOf ?? facts.fetchedAt?.toISOString(),
      provider: facts.sourceProvider,
    });

  } catch (err) {
    logger.error('[property/enrich] Unexpected error', err instanceof Error ? err : undefined);
    return NextResponse.json({ error: 'Failed to fetch property data' }, { status: 500 });
  }
}
