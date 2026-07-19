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
    disposition_type:   body.disposition_type || body.dispositionType,
    subStrategy:        body.subStrategy,
    entryStage:         body.entryStage,
    project_entry_point: body.project_entry_point || body.entryStage,
    lastActiveStage:    body.lastActiveStage,
    overrideReason:     body.overrideReason,
    propertyType:       body.propertyType,
    property_type:      body.property_type || body.propertyType,
    units:              body.units,
    unit_count:         body.unit_count || body.units,
    condition:          body.condition,
    retrospective:      body.retrospective,
    list_price:         body.list_price ?? body.askingPriceCents,
    askingPriceCents:   body.askingPriceCents ?? body.list_price,
    gross_annual_rent:  body.gross_annual_rent ?? body.firstPassRentCents,
    firstPassRentCents: body.firstPassRentCents ?? body.gross_annual_rent,
    beds:               body.beds,
    baths:              body.baths,
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
