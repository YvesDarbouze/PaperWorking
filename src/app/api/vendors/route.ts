import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = "force-dynamic";

/**
 * Normalizes and filters vendor records against an investor's search query (ZIP or City/State/Text).
 */
export function filterVendorsBySearch(vendors: any[], rawSearch: string): any[] {
  const clean = rawSearch.trim();
  if (!clean) return vendors;

  const isZip = /^\d{5}(-\d{4})?$/.test(clean);

  if (isZip) {
    return vendors.filter((v: any) => {
      const zips = Array.isArray(v.serviceAreas) ? v.serviceAreas : [];
      const zipCode = v.zip || v.zipCode || '';
      const loc = v.location || '';
      return zips.includes(clean) || zipCode === clean || loc.includes(clean);
    });
  }

  const lowerSearch = clean.toLowerCase();

  // Parse "City, ST" format if a comma exists (e.g. "Miami, FL")
  let targetCity = lowerSearch;
  let targetState: string | null = null;
  if (clean.includes(',')) {
    const parts = clean.split(',').map((s) => s.trim().toLowerCase());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      targetCity = parts[0];
      targetState = parts[1];
    }
  }

  return vendors.filter((v: any) => {
    const city = (v.city || '').toLowerCase();
    const location = (v.location || '').toLowerCase();
    const address = (v.address || '').toLowerCase();
    const companyName = (v.companyName || v.name || '').toLowerCase();
    const states: string[] = Array.isArray(v.licensingStates)
      ? v.licensingStates.map((s: string) => s.toLowerCase())
      : [];

    if (targetState) {
      const cityMatches = city.includes(targetCity) || location.includes(targetCity) || address.includes(targetCity);
      const stateMatches = states.includes(targetState) || location.includes(targetState);
      return cityMatches && stateMatches;
    }

    const isCityMatch = city.includes(lowerSearch);
    const isLocationMatch = location.includes(lowerSearch);
    const isAddressMatch = address.includes(lowerSearch);
    const isNameMatch = companyName.includes(lowerSearch);
    const isServiceAreaMatch = Array.isArray(v.serviceAreas) && v.serviceAreas.some((a: string) => a.toLowerCase().includes(lowerSearch));

    return isCityMatch || isLocationMatch || isAddressMatch || isNameMatch || isServiceAreaMatch;
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const stateCode = searchParams.get('state');
  const type = searchParams.get('type');
  const rawSearch =
    searchParams.get('search') ||
    searchParams.get('query') ||
    searchParams.get('location') ||
    searchParams.get('city') ||
    searchParams.get('zip') ||
    '';
  const id = searchParams.get('id');

  try {
    if (id) {
      const doc = await adminDb.collection('users').doc(id).get();
      if (doc.exists) {
        const data = doc.data();
        if (data && data.accountType === 'vendor' && data.subscriptionStatus === 'active') {
          return NextResponse.json({ success: true, vendors: [{ id: doc.id, ...data }] });
        }
      }
      return NextResponse.json({ success: true, vendors: [] });
    }

    let query = adminDb
      .collection('users')
      .where('accountType', '==', 'vendor')
      .where('subscriptionStatus', '==', 'active');
      
    if (stateCode && stateCode !== 'All') {
      query = query.where('licensingStates', 'array-contains', stateCode);
    }
    
    if (type && type !== 'All') {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();

    let vendors = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });

    if (rawSearch.trim()) {
      vendors = filterVendorsBySearch(vendors, rawSearch.trim());
    }

    return NextResponse.json({ success: true, vendors });
  } catch (error) {
    console.error('Vendor query failed:', error);
    return NextResponse.json({ error: 'Failed to query vendors' }, { status: 500 });
  }
}
