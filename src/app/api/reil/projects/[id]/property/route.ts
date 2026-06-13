import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, upsertPropertyFacts, replaceComps, replaceRentalComps, appendValuationSnapshot } from "@/lib/db/projects";
import { defaultPropertyProvider, PropertyNotFoundError } from "@/lib/providers/property";
import { logger } from "@/lib/logger";
import telemetry from "@/lib/telemetry";

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
  const { hasProjectAccess } = await import("@/lib/auth/scopeGuard");
  if (!(await hasProjectAccess(auth.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  const providerType = (process.env.PROPERTY_DATA_PROVIDER || "mock").toLowerCase();
  
  let lookupKey: string | undefined | null;
  if (providerType === "rentcast" || providerType === "attom" || providerType === "mashvisor") {
    // External APIs require a full address string, not a Google Maps placeId
    lookupKey = project.addressLine || body.placeId || project.placeId;
  } else {
    // Mock provider hashes the input, prioritizing placeId works fine
    lookupKey = body.placeId ?? project.placeId ?? project.addressLine;
  }

  if (!lookupKey) {
    return NextResponse.json(
      { error: "No address or placeId available to look up property data." },
      { status: 422 },
    );
  }

  // ── Fetch from provider ─────────────────────────────────────────────────────
  // RentCastNotFoundError is thrown when the address has no RentCast record.
  // In that case, return a 200 with { facts: null, manualEntryRequired: true }
  // so the UI can degrade gracefully to manual entry.
  let facts;
  let comps;
  let rentalComps;
  try {
    [facts, comps, rentalComps] = await Promise.all([
      defaultPropertyProvider.getFacts(lookupKey),
      defaultPropertyProvider.getComps(lookupKey),
      defaultPropertyProvider.getRentalComps(lookupKey),
    ]);
  } catch (err: any) {
    if (err instanceof PropertyNotFoundError || err?.name === "PropertyNotFoundError") {
      logger.info("[Property Route] Property not found — degrading to manual entry", {
        projectId: id,
        address: lookupKey,
      });
      // Telemetry: non-fatal, track manual-entry fallback
      try {
        await telemetry.capture({
          distinctId: auth.uid,
          event: "property_enrichment_not_found",
          properties: { projectId: id, provider: providerType, address: lookupKey },
        });
        await telemetry.flush();
      } catch { /* telemetry failures are non-fatal */ }

      return NextResponse.json({
        facts: null,
        compsCount: 0,
        rentalCompsCount: 0,
        manualEntryRequired: true,
        sourceProvider: providerType,
        message: "No property record found for this address. You can enter details manually.",
      });
    }
    // All other errors — log and rethrow as 502
    logger.error("[Property Route] Provider error", err, { projectId: id });
    return NextResponse.json(
      { error: "Property data provider error. Please try again." },
      { status: 502 },
    );
  }

  // ── Persist facts ───────────────────────────────────────────────────────────
  const savedFacts = await upsertPropertyFacts({
    projectId:              id,
    photoUrl:               facts.photoUrl ?? null,
    beds:                   facts.beds ?? null,
    baths:                  facts.baths ?? null,
    sqft:                   facts.sqft ?? null,
    yearBuilt:              facts.yearBuilt ?? null,
    lotSqft:                facts.lotSqft ?? null,
    propertyType:           facts.propertyType ?? null,
    listPriceCents:         facts.listPriceCents  ? BigInt(Math.round(facts.listPriceCents))  : null,
    estRentCents:           facts.estRentCents    ? BigInt(Math.round(facts.estRentCents))    : null,
    lastSoldPriceCents:     typeof facts.lastSoldPriceCents === "number" ? BigInt(Math.round(facts.lastSoldPriceCents)) : null,
    lastSoldDate:           facts.lastSoldDate ?? null,
    // Tax & HOA (Prompt 2)
    annualPropertyTaxCents: typeof facts.annualPropertyTaxCents === "number" ? BigInt(Math.round(facts.annualPropertyTaxCents)) : null,
    taxAssessedValueCents:  typeof facts.taxAssessedValueCents === "number" ? BigInt(Math.round(facts.taxAssessedValueCents)) : null,
    taxAssessedLandValCents: typeof facts.taxAssessedLandValCents === "number" ? BigInt(Math.round(facts.taxAssessedLandValCents)) : null,
    taxAssessedImprovementsValCents: typeof facts.taxAssessedImprovementsValCents === "number" ? BigInt(Math.round(facts.taxAssessedImprovementsValCents)) : null,
    taxYear:                facts.taxYear ?? null,
    hoaMonthlyCents:        typeof facts.hoaMonthlyCents === "number" ? BigInt(Math.round(facts.hoaMonthlyCents)) : null,
    taxSource:              facts.taxSource ?? null,
    // Rent AVM (Prompt 3)
    estRentLowCents:        typeof facts.estRentLowCents === "number" ? BigInt(Math.round(facts.estRentLowCents)) : null,
    estRentHighCents:       typeof facts.estRentHighCents === "number" ? BigInt(Math.round(facts.estRentHighCents)) : null,
    // Value AVM (Prompt 4)
    avmPriceCents:          typeof facts.avmPriceCents === "number" ? BigInt(Math.round(facts.avmPriceCents)) : null,
    avmPriceLowCents:       typeof facts.avmPriceLowCents === "number" ? BigInt(Math.round(facts.avmPriceLowCents)) : null,
    avmPriceHighCents:      typeof facts.avmPriceHighCents === "number" ? BigInt(Math.round(facts.avmPriceHighCents)) : null,
    sourceProvider:         facts.sourceProvider,
    fetchedAt:              facts.fetchedAt,
  });

  // ── Persist comps (replace all sale comps) ──────────────────────────────────
  await replaceComps(
    id,
    comps.map(c => ({
      addressLine:    c.addressLine,
      soldPriceCents: typeof c.soldPriceCents === "number" ? BigInt(Math.round(c.soldPriceCents)) : null,
      soldDate:       c.soldDate ?? null,
      beds:           c.beds ?? null,
      baths:          c.baths ?? null,
      sqft:           c.sqft ?? null,
      distanceMiles:  c.distanceMiles ?? null,
      compType:       "SALE",
      priceCents:     typeof c.priceCents === "number" ? BigInt(Math.round(c.priceCents)) : null,
      correlation:    c.correlation ?? null,
      daysOnMarket:   c.daysOnMarket ?? null,
      status:         c.status ?? null,
      listedDate:     c.listedDate ?? null,
    })),
  );

  // ── Persist rental comps (replace all rental comps) ─────────────────────────
  await replaceRentalComps(
    id,
    rentalComps.map(c => ({
      addressLine:    c.addressLine,
      beds:           c.beds ?? null,
      baths:          c.baths ?? null,
      sqft:           c.sqft ?? null,
      distanceMiles:  c.distanceMiles ?? null,
      compType:       "RENTAL",
      priceCents:     typeof c.rentPriceCents === "number" ? BigInt(Math.round(c.rentPriceCents)) : null,
      correlation:    c.correlation ?? null,
      daysOnMarket:   c.daysOnMarket ?? null,
      status:         c.status ?? null,
      listedDate:     c.listedDate ?? null,
    })),
  );

  // ── Append valuation snapshot (Prompt 4) ───────────────────────────────────
  if (facts.avmPriceCents) {
    try {
      await appendValuationSnapshot({
        projectId: id,
        valueCents: BigInt(Math.round(facts.avmPriceCents)),
        valueLowCents: facts.avmPriceLowCents ? BigInt(Math.round(facts.avmPriceLowCents)) : BigInt(0),
        valueHighCents: facts.avmPriceHighCents ? BigInt(Math.round(facts.avmPriceHighCents)) : BigInt(0),
        source: facts.taxSource ?? "rentcast",
        fetchedAt: facts.fetchedAt,
      });
      logger.info("[Property Route] Appended valuation snapshot", { projectId: id, value: facts.avmPriceCents });
    } catch (err) {
      logger.warn("[Property Route] Failed to append valuation snapshot (non-fatal)", { projectId: id, err });
    }
  }

  // ── Seed Firestore underwriting default with RentCast tax data ──────────────
  // If we got annualPropertyTaxCents from RentCast, write it as the default
  // monthly holding-cost tax into the Firestore project's financials.
  // The user can edit this later in the Hold Interview (Phase 3).
  if (facts.annualPropertyTaxCents) {
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      const monthlyTax = Math.round(facts.annualPropertyTaxCents / 100 / 12); // cents→dollars, annual→monthly
      const projectRef = adminDb.collection("projects").doc(id);
      const snap = await projectRef.get();
      if (snap.exists) {
        const existing = snap.data();
        const financials = existing?.financials ?? {};
        // Only set if user hasn't already entered a custom value
        if (!financials.holdingCostTaxes || financials.holdingCostTaxes === 0) {
          await projectRef.update({
            "financials.holdingCostTaxes": monthlyTax,
            "financials.operatingExpenseTaxes": monthlyTax,
            "financials.holdingCostTaxesSource": facts.taxSource ?? "rentcast",
            "financials.holdingCostTaxesYear": facts.taxYear ?? null,
          });
          logger.info("[Property Route] Seeded Firestore tax default from RentCast", {
            projectId: id,
            monthlyTax,
            taxYear: facts.taxYear,
          });
        }
      }
    } catch (err) {
      // Non-fatal: Firestore seeding failure shouldn't break property enrichment
      logger.warn("[Property Route] Failed to seed Firestore tax default (non-fatal)", { projectId: id });
    }
  }

  // ── Seed assessed land and improvement values into Firestore (Prompt 18) ─────
  if (facts.taxAssessedValueCents) {
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      const projectRef = adminDb.collection("projects").doc(id);
      const snap = await projectRef.get();
      if (snap.exists) {
        const existing = snap.data();
        const financials = existing?.financials ?? {};
        const updates: Record<string, any> = {};
        if (financials.taxAssessedLandValue === undefined || financials.taxAssessedLandValue === null) {
          if (facts.taxAssessedLandValCents) {
            updates["financials.taxAssessedLandValue"] = Math.round(facts.taxAssessedLandValCents / 100);
          }
        }
        if (financials.taxAssessedImprovementValue === undefined || financials.taxAssessedImprovementValue === null) {
          if (facts.taxAssessedImprovementsValCents) {
            updates["financials.taxAssessedImprovementValue"] = Math.round(facts.taxAssessedImprovementsValCents / 100);
          }
        }
        if (Object.keys(updates).length > 0) {
          await projectRef.update(updates);
          logger.info("[Property Route] Seeded assessed values to Firestore", { projectId: id, updates });
        }
      }
    } catch (err) {
      logger.warn("[Property Route] Failed to seed assessed values (non-fatal)", { projectId: id, err });
    }
  }

  // ── Seed Rent estimate default into underwriting (Prompt 3) ────────────────
  if (facts.estRentCents) {
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      const monthlyRent = Math.round(facts.estRentCents / 100);
      const projectRef = adminDb.collection("projects").doc(id);
      const snap = await projectRef.get();
      if (snap.exists) {
        const existing = snap.data();
        const financials = existing?.financials ?? {};
        // Seed grossMonthlyRent if not set
        if (!financials.projectedMonthlyRent || financials.projectedMonthlyRent === 0) {
          await projectRef.update({
            "financials.projectedMonthlyRent": monthlyRent,
            "financials.projectedMonthlyRentSource": "rentcast",
          });
          logger.info("[Property Route] Seeded Firestore projectedMonthlyRent default from RentCast", {
            projectId: id,
            monthlyRent,
          });
        }
      }
    } catch (err) {
      logger.warn("[Property Route] Failed to seed Firestore rent default (non-fatal)", { projectId: id });
    }
  }

  // ── Seed AVM value into financials (Prompt 4) ──────────────────────────────
  if (facts.avmPriceCents) {
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      const estValue = Math.round(facts.avmPriceCents / 100);
      const projectRef = adminDb.collection("projects").doc(id);
      const snap = await projectRef.get();
      if (snap.exists) {
        await projectRef.update({
          "financials.estimatedCurrentValue": estValue,
          "financials.estimatedCurrentValueSource": "rentcast",
          "financials.estimatedCurrentValueAsOf": facts.fetchedAt.toISOString(),
        });
        logger.info("[Property Route] Seeded Firestore estimatedCurrentValue from RentCast", {
          projectId: id,
          estValue,
        });
      }
    } catch (err) {
      logger.warn("[Property Route] Failed to seed Firestore estimated value (non-fatal)", { projectId: id });
    }
  }

  // ── Telemetry ───────────────────────────────────────────────────────────────
  try {
    await telemetry.capture({
      distinctId: auth.uid,
      event: "property_enrichment_success",
      properties: {
        projectId: id,
        provider: facts.sourceProvider,
        hasTaxData: !!facts.annualPropertyTaxCents,
        hasRentEstimate: !!facts.estRentCents,
        hasValueEstimate: !!facts.avmPriceCents,
        compsCount: comps.length,
        rentalCompsCount: rentalComps.length,
      },
    });
    await telemetry.flush();
  } catch (err) {
    logger.warn("[Property Route] Failed to emit telemetry success (non-fatal)", { projectId: id });
  }

  // ── Update sync timestamps ──────────────────────────────────────────────────
  try {
    const prismaModule = await import("@/lib/prisma");
    await prismaModule.default.reilProject.update({
      where: { id },
      data: {
        lastSyncedAt: facts.fetchedAt,
        valueSyncedAt: facts.fetchedAt,
        rentSyncedAt: facts.fetchedAt,
      },
    });

    const { adminDb } = await import("@/lib/firebase/admin");
    const projectRef = adminDb.collection("projects").doc(id);
    await projectRef.update({
      lastSyncedAt: facts.fetchedAt.toISOString(),
      valueSyncedAt: facts.fetchedAt.toISOString(),
      rentSyncedAt: facts.fetchedAt.toISOString(),
    });
  } catch (err) {
    logger.warn("[Property Route] Failed to update sync timestamps (non-fatal)", { projectId: id, err });
  }

  return NextResponse.json({
    facts: savedFacts,
    compsCount: comps.length,
    rentalCompsCount: rentalComps.length,
    sourceProvider: facts.sourceProvider,
    fetchedAt: facts.fetchedAt,
    // Signal to the UI that tax data was sourced
    taxData: facts.annualPropertyTaxCents ? {
      annualPropertyTaxCents: Number(facts.annualPropertyTaxCents),
      taxAssessedValueCents: facts.taxAssessedValueCents ? Number(facts.taxAssessedValueCents) : null,
      taxYear: facts.taxYear,
      hoaMonthlyCents: facts.hoaMonthlyCents ? Number(facts.hoaMonthlyCents) : null,
      source: facts.taxSource,
    } : null,
    rentEstimate: facts.estRentCents ? {
      rent: Number(facts.estRentCents),
      rangeLow: facts.estRentLowCents ? Number(facts.estRentLowCents) : null,
      rangeHigh: facts.estRentHighCents ? Number(facts.estRentHighCents) : null,
      source: 'rentcast',
    } : null,
    valueEstimate: facts.avmPriceCents ? {
      price: Number(facts.avmPriceCents),
      rangeLow: facts.avmPriceLowCents ? Number(facts.avmPriceLowCents) : null,
      rangeHigh: facts.avmPriceHighCents ? Number(facts.avmPriceHighCents) : null,
      source: 'rentcast',
      asOf: facts.fetchedAt,
    } : null,
  });
}
