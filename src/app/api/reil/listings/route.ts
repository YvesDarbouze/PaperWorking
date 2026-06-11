import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { defaultListingsProvider } from "@/lib/providers/listings";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/reil/listings
// Search active listings (sale or rental) with caching
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const url = new URL(req.url);
  const zipCode = url.searchParams.get("zipCode") || undefined;
  const city = url.searchParams.get("city") || undefined;
  const state = url.searchParams.get("state") || undefined;
  const listingType = (url.searchParams.get("listingType") || "sale").toLowerCase();
  
  const minPriceStr = url.searchParams.get("minPrice");
  const maxPriceStr = url.searchParams.get("maxPrice");
  const bedroomsStr = url.searchParams.get("bedrooms");
  const propertyType = url.searchParams.get("propertyType") || undefined;
  const limitStr = url.searchParams.get("limit");
  const offsetStr = url.searchParams.get("offset");

  const minPrice = minPriceStr ? Number(minPriceStr) : undefined;
  const maxPrice = maxPriceStr ? Number(maxPriceStr) : undefined;
  const bedrooms = bedroomsStr ? Number(bedroomsStr) : undefined;
  const limit = limitStr ? Number(limitStr) : 20;
  const offset = offsetStr ? Number(offsetStr) : 0;

  // Validate that we have at least location coordinates or a zip/city/state
  if (!zipCode && !city && !state) {
    return NextResponse.json(
      { error: "Must specify a zipCode, city, or state to search active listings." },
      { status: 400 }
    );
  }

  const params = {
    zipCode,
    city,
    state,
    limit,
    offset,
    bedrooms,
    propertyType,
    minPrice,
    maxPrice,
    status: "Active",
  };

  try {
    logger.info(`[Listings Route] Searching active listings`, { listingType, params });

    let listings = [];
    if (listingType === "rental") {
      listings = await defaultListingsProvider.getRentalListings(params);
    } else {
      listings = await defaultListingsProvider.getSaleListings(params);
    }

    return NextResponse.json({
      success: true,
      listings,
      count: listings.length,
    });
  } catch (err: any) {
    logger.error("[Listings Route] Error searching listings", err);
    return NextResponse.json(
      { error: "Failed to search active listings. Please try again." },
      { status: 502 }
    );
  }
}
