import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, appendValuationSnapshot, getValuationSnapshots } from "@/lib/db/projects";
import { defaultPropertyProvider } from "@/lib/providers/property";
import { logger } from "@/lib/logger";
import telemetry from "@/lib/telemetry";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/reil/projects/:id/valuation
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  
  const { hasProjectAccess } = await import("@/lib/auth/scopeGuard");
  if (!(await hasProjectAccess(auth.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snapshots = await getValuationSnapshots(id);
  
  // BigInt serialization to number for JSON response
  const serialized = snapshots.map(s => ({
    id: s.id,
    projectId: s.projectId,
    valueCents: Number(s.valueCents),
    valueLowCents: Number(s.valueLowCents),
    valueHighCents: Number(s.valueHighCents),
    source: s.source,
    fetchedAt: s.fetchedAt,
    createdAt: s.createdAt,
  }));

  return NextResponse.json({ snapshots: serialized });
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const { hasProjectAccess } = await import("@/lib/auth/scopeGuard");
  if (!(await hasProjectAccess(auth.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const providerType = (process.env.PROPERTY_DATA_PROVIDER || "mock").toLowerCase();
  const lookupKey = project.addressLine || project.placeId;

  if (!lookupKey) {
    return NextResponse.json(
      { error: "No address available to look up valuation." },
      { status: 422 },
    );
  }

  try {
    const avm = await defaultPropertyProvider.getValueEstimate(lookupKey);
    const snapshot = await appendValuationSnapshot({
      projectId: id,
      valueCents: BigInt(avm.priceCents),
      valueLowCents: BigInt(avm.priceLowCents),
      valueHighCents: BigInt(avm.priceHighCents),
      source: avm.source,
      fetchedAt: avm.fetchedAt,
    });

    // Seed/update Firestore estimatedCurrentValue
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      const estValue = Math.round(avm.priceCents / 100);
      const projectRef = adminDb.collection("projects").doc(id);
      await projectRef.update({
        "financials.estimatedCurrentValue": estValue,
        "financials.estimatedCurrentValueSource": avm.source,
        "financials.estimatedCurrentValueAsOf": avm.fetchedAt.toISOString(),
      });
    } catch (err) {
      logger.warn("[Valuation Route] Failed to update Firestore estimated value (non-fatal)", { projectId: id });
    }

    // Telemetry
    try {
      await telemetry.capture({
        distinctId: auth.uid,
        event: "valuation_snapshot_created",
        properties: {
          projectId: id,
          value: avm.priceCents,
          source: avm.source,
        },
      });
      await telemetry.flush();
    } catch {}

    return NextResponse.json({
      snapshot: {
        id: snapshot.id,
        projectId: snapshot.projectId,
        valueCents: Number(snapshot.valueCents),
        valueLowCents: Number(snapshot.valueLowCents),
        valueHighCents: Number(snapshot.valueHighCents),
        source: snapshot.source,
        fetchedAt: snapshot.fetchedAt,
        createdAt: snapshot.createdAt,
      }
    });
  } catch (err: any) {
    logger.error("[Valuation Route] Failed to fetch value AVM", err, { projectId: id });
    return NextResponse.json(
      { error: err.message || "Failed to trigger valuation update" },
      { status: 502 },
    );
  }
}
