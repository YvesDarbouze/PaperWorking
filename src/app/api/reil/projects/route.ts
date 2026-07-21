import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { createProject, listProjectsForUser, upsertAppUser, mapPostgresProjectToFrontend } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

// POST /api/reil/projects — create a new draft project
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const body = await req.json().catch(() => ({}));

  // Ensure the caller's AppUser row exists in Postgres
  await upsertAppUser(
    auth.uid,
    auth.token.email ?? `${auth.uid}@unknown`,
    auth.token.name ?? null,
  );

  const project = await createProject({
    createdById:        auth.uid,
    addressLine:        body.addressLine,
    city:               body.city,
    state:              body.state,
    zip:                body.zip,
    lat:                body.lat  ?? null,
    lng:                body.lng  ?? null,
    placeId:            body.placeId ?? null,
    displayName:        body.displayName ?? null,
    acquisitionStatus:  body.acquisitionStatus,
    ownershipStructure: body.ownershipStructure ?? null,
    currentPhase:       body.currentPhase,
    dispositionType:    body.dispositionType,
    subStrategy:        body.subStrategy,
    entryStage:         body.entryStage,
    lastActiveStage:    body.lastActiveStage,
    overrideReason:     body.overrideReason,
    propertyType:       body.propertyType,
    units:              body.units,
    condition:          body.condition,
    retrospective:      body.retrospective,
  });

  return NextResponse.json(mapPostgresProjectToFrontend(project), { status: 201 });
}

// GET /api/reil/projects — list projects for the authenticated user
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const projects = await listProjectsForUser(auth.uid);
  const mapped = projects.map(mapPostgresProjectToFrontend);
  return NextResponse.json(mapped);
}
