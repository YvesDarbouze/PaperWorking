import { NextResponse } from 'next/server';
import {
  appendProjectSubDoc,
  listProjectSubcollection,
  requireAuthOrJson,
  type ProjectSubcollectionName,
} from '@/lib/membership/p1-seed-store';

const ALLOWED: ProjectSubcollectionName[] = [
  'vendorRequests',
  'commitments',
  'activityLog',
  'phaseSnapshots',
];

function parseName(raw: string): ProjectSubcollectionName | null {
  return (ALLOWED as string[]).includes(raw) ? (raw as ProjectSubcollectionName) : null;
}

/**
 * GET /api/projects/[id]/sub/[name]
 * Reads one of the 4 approved project subcollections.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; name: string }> },
) {
  const auth = await requireAuthOrJson();
  if (!auth.ok) return auth.response;

  const { id, name: raw } = await context.params;
  const name = parseName(raw);
  if (!name) {
    return NextResponse.json(
      { error: `Unknown subcollection. Allowed: ${ALLOWED.join(', ')}` },
      { status: 404 },
    );
  }

  const docs = listProjectSubcollection(id, name);
  return NextResponse.json({
    success: true,
    path: `projects/${id}/${name}`,
    count: docs.length,
    docs,
  });
}

/**
 * POST /api/projects/[id]/sub/[name]
 * Appends a document into an approved project subcollection.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; name: string }> },
) {
  const auth = await requireAuthOrJson();
  if (!auth.ok) return auth.response;

  const { id, name: raw } = await context.params;
  const name = parseName(raw);
  if (!name) {
    return NextResponse.json(
      { error: `Unknown subcollection. Allowed: ${ALLOWED.join(', ')}` },
      { status: 404 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const doc = appendProjectSubDoc(id, name, {
    ...body,
    id: typeof body.id === 'string' ? body.id : undefined,
    createdAt: new Date().toISOString(),
    createdBy: auth.uid,
  });

  return NextResponse.json({ success: true, doc });
}
