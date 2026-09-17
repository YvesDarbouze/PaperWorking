import { NextResponse } from 'next/server';
import { normalizeToStructuredError } from '@paperworking/shared';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { resolveCallerOrganization, requireOrgRole } from '@/lib/auth/org-membership';

import {
  saveCalculatorSnapshot,
  getCalculatorSnapshots,
  ImmutableSnapshotError,
  type StoredCalculatorSnapshot,
} from '@/lib/calculator/snapshots-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let requestedOrgId: string | undefined;
  let excludeSuperseded = false;
  if (request && request.url) {
    try {
      const url = new URL(request.url);
      requestedOrgId = url.searchParams.get('organizationId') || undefined;
      const excludeParam = url.searchParams.get('excludeSuperseded');
      const lineageParam = url.searchParams.get('lineage');
      if (excludeParam === 'true' || lineageParam === 'true') {
        excludeSuperseded = true;
      }
    } catch {
      // ignore URL parse error
    }
  }

  // Server-side membership resolution:
  // If ?organizationId= is supplied, it must be in the caller's membership set, else 403.
  const resolvedOrg = resolveCallerOrganization({ uid: auth.uid }, requestedOrgId);
  if (!resolvedOrg.ok) {
    return NextResponse.json(resolvedOrg.body, { status: resolvedOrg.status });
  }

  const orgFilter = requestedOrgId ? resolvedOrg.organizationId : undefined;

  const snapshots = await getCalculatorSnapshots(auth.uid, orgFilter, { excludeSuperseded });
  return NextResponse.json({ snapshots });
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const body = (await request.json()) as Partial<StoredCalculatorSnapshot>;
    if (!body.inputs || !body.outputs) {
      return NextResponse.json(
        normalizeToStructuredError('Inputs and outputs are required to persist a calculator snapshot', 400),
        { status: 400 },
      );
    }

    const targetOrgId = body.organizationId || (auth as any).organizationId || 'org-1';

    // RBAC: snapshot creation requires at least 'member' role (viewers rejected with 403)
    const roleCheck = requireOrgRole({ uid: auth.uid }, targetOrgId, 'member');
    if (!roleCheck.ok) {
      return NextResponse.json(roleCheck.body, { status: roleCheck.status });
    }
    const actorRole = roleCheck.role;

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || undefined;

    const saved = await saveCalculatorSnapshot(auth.uid, {
      id: body.id,
      version: body.version,
      engineVersion: body.engineVersion,
      organizationId: targetOrgId,
      projectId: body.projectId,
      dealId: body.dealId,
      source: body.source ?? 'deal_calculator',
      calculatorVersion: body.calculatorVersion ?? '1.0.0',
      inputs: body.inputs as any,
      outputs: body.outputs as any,
      assumptions: body.assumptions ?? {},
      auditContext: {
        actorRole,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ snapshot: saved }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid snapshot payload';
    const status = (error as any)?.statusCode ?? 400;
    const code = (error as any)?.code ?? (status === 422 ? 'SNAPSHOT_INTEGRITY_MISMATCH' : undefined);
    const structured = normalizeToStructuredError(message, status, undefined, code);
    return NextResponse.json({ ...structured, code: structured.error.code }, { status });
  }
}

export async function PUT(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let snapshotId = 'unknown';
  try {
    const body = (await request.json()) as { id?: string };
    if (body?.id) snapshotId = body.id;
  } catch {
    // ignore
  }

  const err = new ImmutableSnapshotError(snapshotId);
  const structured = normalizeToStructuredError(err.message, err.statusCode, undefined, err.code);
  return NextResponse.json(
    { ...structured, code: structured.error.code },
    { status: err.statusCode },
  );
}

export async function PATCH(request: Request) {
  return PUT(request);
}
