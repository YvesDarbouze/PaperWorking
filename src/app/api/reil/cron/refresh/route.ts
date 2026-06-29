import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import prisma from "@/lib/prisma";
import { updateProjectSync, upsertPropertyFacts, appendValuationSnapshot } from "@/lib/db/projects";
import { getRentCastClient } from "@/lib/providers/rentcast";
import { adminDb } from "@/lib/firebase/admin";
import telemetry from "@/lib/telemetry";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Capped requests per cron run (Budget Guard)
const BUDGET_LIMIT = 10;

export async function POST(req: NextRequest) {
  let isAuthenticated = false;
  let userUid = "cron-job";

  // 1. Check CRON_SECRET from header or query param
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");
  const queryToken = req.nextUrl.searchParams.get("token");

  if (cronSecret) {
    if (
      (authHeader && authHeader === `Bearer ${cronSecret}`) ||
      (queryToken && queryToken === cronSecret)
    ) {
      isAuthenticated = true;
    }
  }

  // 2. If not authenticated via CRON_SECRET, require admin Firebase ID Token
  if (!isAuthenticated) {
    const auth = await requireAuth(req);
    if (!isAuthError(auth)) {
      const isAdmin = (auth.token as Record<string, unknown>)?.['admin'] === true;
      if (isAdmin) {
        isAuthenticated = true;
        userUid = auth.uid;
      }
    }
  }

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all active projects (exclude CLOSED and DEAD)
  const projects = await prisma.reilProject.findMany({
    where: {
      NOT: [
        { acquisitionStatus: "CLOSED" },
        { acquisitionStatus: "DEAD" },
      ],
    },
    include: {
      propertyFacts: true,
    },
  });

  const now = new Date();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
  const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

  const providerType = (process.env.PROPERTY_DATA_PROVIDER || "mock").toLowerCase();
  const client = getRentCastClient(); // null when RENTCAST_API_KEY is absent

  let apiCallsMade = 0;
  const syncedProjects: string[] = [];

  for (const project of projects) {
    // Stop if we hit the budget cap
    if (apiCallsMade >= BUDGET_LIMIT) {
      logger.info("[Cron Refresh] Budget limit of 10 API calls reached. Stopping current run.");
      break;
    }

    const address = project.addressLine;
    const zip = project.zip;
    if (!address) continue;

    const valueExpired = !project.valueSyncedAt || (now.getTime() - new Date(project.valueSyncedAt).getTime() > SEVEN_DAYS_MS);
    const rentExpired = !project.rentSyncedAt || (now.getTime() - new Date(project.rentSyncedAt).getTime() > SEVEN_DAYS_MS);
    const marketExpired = !project.marketSyncedAt || (now.getTime() - new Date(project.marketSyncedAt).getTime() > THIRTY_DAYS_MS);

    let needsDbUpdate = false;
    const updateData: {
      lastSyncedAt: Date;
      valueSyncedAt?: Date;
      rentSyncedAt?: Date;
      marketSyncedAt?: Date;
    } = {
      lastSyncedAt: now,
    };

    const firestoreUpdates: Record<string, any> = {
      lastSyncedAt: now.toISOString(),
    };

    try {
      // 1. Refresh Value AVM
      if (valueExpired && apiCallsMade < BUDGET_LIMIT) {
        logger.info(`[Cron Refresh] Refreshing Value AVM for project ${project.id} (${address})`);
        
        let avmPriceCents = 0;
        let avmPriceLowCents = 0;
        let avmPriceHighCents = 0;

        if (providerType === "rentcast" && client) {
          apiCallsMade++;
          const valueData = await client.getValueEstimate({ address }, true);
          avmPriceCents = Math.round(valueData.price * 100);
          avmPriceLowCents = Math.round(valueData.priceRangeLow * 100);
          avmPriceHighCents = Math.round(valueData.priceRangeHigh * 100);
        } else {
          // Mock generation (±15% range matches MockPropertyDataProvider)
          const price = 250000 + (project.id.charCodeAt(0) * 1500) % 500000;
          avmPriceCents = price * 100;
          avmPriceLowCents = Math.round(price * 0.85) * 100;
          avmPriceHighCents = Math.round(price * 1.15) * 100;
        }

        // Save Value AVM to Prisma PropertyFacts
        await upsertPropertyFacts({
          projectId: project.id,
          avmPriceCents: BigInt(avmPriceCents),
          avmPriceLowCents: BigInt(avmPriceLowCents),
          avmPriceHighCents: BigInt(avmPriceHighCents),
          sourceProvider: providerType === "rentcast" ? "RentCast API" : "MockPropertyProvider v1",
          fetchedAt: now,
        });

        // Append new valuation snapshot
        await appendValuationSnapshot({
          projectId: project.id,
          valueCents: BigInt(avmPriceCents),
          valueLowCents: BigInt(avmPriceLowCents),
          valueHighCents: BigInt(avmPriceHighCents),
          source: providerType === "rentcast" ? "rentcast" : "mock",
          fetchedAt: now,
        });

        // Replicate to Firestore
        firestoreUpdates["financials.estimatedCurrentValue"] = Math.round(avmPriceCents / 100);
        firestoreUpdates["financials.estimatedCurrentValueSource"] = providerType === "rentcast" ? "rentcast" : "mock";
        firestoreUpdates["financials.estimatedCurrentValueAsOf"] = now.toISOString();

        updateData.valueSyncedAt = now;
        firestoreUpdates.valueSyncedAt = now.toISOString();
        needsDbUpdate = true;
      }

      // 2. Refresh Rent AVM
      if (rentExpired && apiCallsMade < BUDGET_LIMIT) {
        logger.info(`[Cron Refresh] Refreshing Rent AVM for project ${project.id} (${address})`);

        let estRentCents = 0;
        let estRentLowCents = 0;
        let estRentHighCents = 0;

        if (providerType === "rentcast" && client) {
          apiCallsMade++;
          const rentData = await client.getRentEstimate({ address }, true);
          estRentCents = Math.round(rentData.rent * 100);
          estRentLowCents = Math.round(rentData.rentRangeLow * 100);
          estRentHighCents = Math.round(rentData.rentRangeHigh * 100);
        } else {
          // Mock generation (±15% range matches MockPropertyDataProvider)
          const rent = 1200 + (project.id.charCodeAt(0) * 10) % 2500;
          estRentCents = rent * 100;
          estRentLowCents = Math.round(rent * 0.85) * 100;
          estRentHighCents = Math.round(rent * 1.15) * 100;
        }

        // Save Rent AVM to Prisma PropertyFacts
        await upsertPropertyFacts({
          projectId: project.id,
          estRentCents: BigInt(estRentCents),
          estRentLowCents: BigInt(estRentLowCents),
          estRentHighCents: BigInt(estRentHighCents),
          sourceProvider: providerType === "rentcast" ? "RentCast API" : "MockPropertyProvider v1",
          fetchedAt: now,
        });

        // Replicate to Firestore financials
        firestoreUpdates["financials.projectedMonthlyRent"] = Math.round(estRentCents / 100);
        firestoreUpdates["financials.projectedMonthlyRentSource"] = providerType === "rentcast" ? "rentcast" : "mock";

        updateData.rentSyncedAt = now;
        firestoreUpdates.rentSyncedAt = now.toISOString();
        needsDbUpdate = true;
      }

      // 3. Refresh Market Stats
      if (marketExpired && zip && apiCallsMade < BUDGET_LIMIT) {
        logger.info(`[Cron Refresh] Refreshing Market Stats for zip ${zip} (project ${project.id})`);

        if (providerType === "rentcast" && client) {
          apiCallsMade++;
          // Fetch market stats (updates vendor cache in Firestore)
          await client.getMarketStats({ zipCode: zip }, true);
        }

        updateData.marketSyncedAt = now;
        firestoreUpdates.marketSyncedAt = now.toISOString();
        needsDbUpdate = true;
      }

      // Write updates to DBs if any sync occurred
      if (needsDbUpdate) {
        // Update Prisma
        await updateProjectSync(project.id, updateData);

        // Replicate to Firestore
        const projectRef = adminDb.collection("projects").doc(project.id);
        const snap = await projectRef.get();
        if (snap.exists) {
          await projectRef.update(firestoreUpdates);
        }

        syncedProjects.push(project.id);
      }
    } catch (err) {
      logger.error(`[Cron Refresh] Error syncing project ${project.id}`, err);
    }
  }

  // Telemetry event
  try {
    await telemetry.capture({
      distinctId: userUid,
      event: "cron_refresh_run",
      properties: {
        projectsScanned: projects.length,
        projectsSyncedCount: syncedProjects.length,
        apiCallsMade,
        providerType,
      },
    });
    await telemetry.flush();
  } catch (err) {
    logger.warn("[Cron Refresh] Telemetry failure (non-fatal)", {
      error: err instanceof Error ? err.message : String(err)
    });
  }

  return NextResponse.json({
    success: true,
    scanned: projects.length,
    refreshed: syncedProjects.length,
    apiCallsMade,
  });
}
