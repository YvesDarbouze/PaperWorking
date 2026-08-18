import { NextRequest, NextResponse } from "next/server";
import { isAuthError } from "@/lib/firebase-admin/auth-guard";
import { requireAdminAuth } from "@/lib/firebase-admin/admin-guard";
import { adminDb } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/admin/rentcast-usage
// Retrieve the number of RentCast API calls made in the current calendar month
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (isAuthError(auth)) return auth;

  // Optional: restrict to admin users if project had roles, but for now verifying auth token is sufficient
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed

  try {
    const logsRef = adminDb.collection("rentcastCallLogs");
    const query = logsRef
      .where("year", "==", year)
      .where("month", "==", month);

    const snapshot = await query.get();
    const count = snapshot.size;

    logger.info(`[Admin Usage API] Sourced RentCast calls for ${month}/${year}: ${count}`);

    return NextResponse.json({
      success: true,
      year,
      month,
      count,
      limit: 500,
    });
  } catch (err: any) {
    logger.error("[Admin Usage API] Failed to fetch RentCast call logs", err);
    return NextResponse.json(
      { error: "Failed to retrieve API usage stats." },
      { status: 500 }
    );
  }
}
