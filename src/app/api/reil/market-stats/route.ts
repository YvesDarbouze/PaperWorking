import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { defaultMarketProvider, MarketStatsNotFoundError } from "@/lib/providers/market";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Auth Guard Verification
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const url = new URL(req.url);
  const zipCode = url.searchParams.get("zipCode");

  if (!zipCode || zipCode.trim().length !== 5) {
    return NextResponse.json(
      { error: "Invalid or missing zipCode query parameter. Expected a 5-digit US ZIP code." },
      { status: 400 },
    );
  }

  try {
    const stats = await defaultMarketProvider.getMarketStats(zipCode);
    return NextResponse.json({ stats });
  } catch (err: any) {
    if (err instanceof MarketStatsNotFoundError) {
      logger.info(`[Market Stats Route] No statistics found for ZIP: ${zipCode}`);
      return NextResponse.json(
        { error: `No market statistics available for zip code: ${zipCode}` },
        { status: 404 },
      );
    }
    logger.error("[Market Stats Route] Failed to fetch market statistics", err, { zipCode });
    return NextResponse.json(
      { error: err.message || "Failed to fetch market statistics" },
      { status: 502 },
    );
  }
}
