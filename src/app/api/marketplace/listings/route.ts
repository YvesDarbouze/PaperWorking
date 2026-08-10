import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export async function GET(req: NextRequest) {
  try {
    let isAuthenticated = false;

    // Check if auth token or cookie is present
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const sessionCookie = req.cookies.get('__session')?.value;

    if (authHeader || sessionCookie) {
      try {
        const auth = await requireAuth(req);
        if (!isAuthError(auth)) {
          isAuthenticated = true;
        }
      } catch (err) {
        isAuthenticated = false;
      }
    }

    // Fetch listings from Firestore
    const snap = await adminDb.collection('dealListings').get();
    let listings = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // Filter by visibility mode
    if (!isAuthenticated) {
      listings = listings.filter((l) => l.visibility === 'PUBLIC' || l.visibilityMode === 'PUBLIC');
    }

    // Sort listings: New listings first, then by createdAt descending
    listings.sort((a, b) => {
      if (a.isNewListing && !b.isNewListing) return -1;
      if (!a.isNewListing && b.isNewListing) return 1;

      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      isAuthenticated,
      count: listings.length,
      listings,
    });
  } catch (err: any) {
    console.error('[MarketplaceListings GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace listings', message: err.message },
      { status: 500 }
    );
  }
}
