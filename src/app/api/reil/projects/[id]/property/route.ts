import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, upsertPropertyFacts, replaceComps } from "@/lib/db/projects";
import { defaultPropertyProvider } from "@/lib/providers/property";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/reil/projects/:id/property
// Fetches fresh property facts + comps and persists them to the DB.
// Body: { placeId?: string } — if omitted, falls back to project.placeId
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (project.createdById !== auth.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const lookupKey = body.placeId ?? project.placeId ?? project.addressLine;

  if (!lookupKey) {
    return NextResponse.json(
      { error: "No address or placeId available to look up property data." },
      { status: 422 },
    );
  }

  // Fetch from provider (mock in dev; swap to real vendor via defaultPropertyProvider)
  const [facts, comps] = await Promise.all([
    defaultPropertyProvider.getFacts(lookupKey),
    defaultPropertyProvider.getComps(lookupKey),
  ]);

  // Persist facts
  const savedFacts = await upsertPropertyFacts({
    projectId:          id,
    photoUrl:           facts.photoUrl ?? null,
    beds:               facts.beds ?? null,
    baths:              facts.baths ?? null,
    sqft:               facts.sqft ?? null,
    yearBuilt:          facts.yearBuilt ?? null,
    lotSqft:            facts.lotSqft ?? null,
    propertyType:       facts.propertyType ?? null,
    listPriceCents:     facts.listPriceCents  ? BigInt(Math.round(facts.listPriceCents))  : null,
    estRentCents:       facts.estRentCents    ? BigInt(Math.round(facts.estRentCents))    : null,
    lastSoldPriceCents: facts.lastSoldPriceCents ? BigInt(Math.round(facts.lastSoldPriceCents)) : null,
    lastSoldDate:       facts.lastSoldDate ?? null,
    sourceProvider:     facts.sourceProvider,
    fetchedAt:          facts.fetchedAt,
  });

  // Persist comps (replace all)
  await replaceComps(
    id,
    comps.map(c => ({
      addressLine:    c.addressLine,
      soldPriceCents: BigInt(Math.round(c.soldPriceCents)),
      soldDate:       c.soldDate,
      beds:           c.beds ?? null,
      baths:          c.baths ?? null,
      sqft:           c.sqft ?? null,
      distanceMiles:  c.distanceMiles ?? null,
    })),
  );

  return NextResponse.json({
    facts: savedFacts,
    compsCount: comps.length,
    sourceProvider: facts.sourceProvider,
    fetchedAt: facts.fetchedAt,
  });
}
