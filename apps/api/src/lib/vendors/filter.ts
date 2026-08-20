export interface VendorRecord {
  id?: string;
  name?: string;
  companyName?: string;
  displayName?: string;
  zip?: string;
  zipCode?: string;
  city?: string;
  location?: string;
  address?: string;
  serviceAreas?: string[];
  licensingStates?: string[];
  [key: string]: unknown;
}

/**
 * Filters vendor records against ZIP or city/state/text search.
 * Source: PaperWorking src/app/api/vendors/route.ts
 */
export function filterVendorsBySearch(vendors: VendorRecord[], rawSearch: string): VendorRecord[] {
  const clean = rawSearch.trim();
  if (!clean) return vendors;

  const isZip = /^\d{5}(-\d{4})?$/.test(clean);

  if (isZip) {
    return vendors.filter((v) => {
      const zips = Array.isArray(v.serviceAreas) ? v.serviceAreas : [];
      const zipCode = v.zip || v.zipCode || '';
      const loc = v.location || '';
      return zips.includes(clean) || zipCode === clean || loc.includes(clean);
    });
  }

  const lowerSearch = clean.toLowerCase();

  let targetCity = lowerSearch;
  let targetState: string | null = null;
  if (clean.includes(',')) {
    const parts = clean.split(',').map((s) => s.trim().toLowerCase());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      targetCity = parts[0];
      targetState = parts[1];
    }
  }

  return vendors.filter((v) => {
    const city = (v.city || '').toLowerCase();
    const location = (v.location || '').toLowerCase();
    const address = (v.address || '').toLowerCase();
    const companyName = (v.companyName || v.name || '').toLowerCase();
    const states: string[] = Array.isArray(v.licensingStates)
      ? v.licensingStates.map((s: string) => s.toLowerCase())
      : [];

    if (targetState) {
      const cityMatches =
        city.includes(targetCity) || location.includes(targetCity) || address.includes(targetCity);
      const stateMatches = states.includes(targetState) || location.includes(targetState);
      return cityMatches && stateMatches;
    }

    const isCityMatch = city.includes(lowerSearch);
    const isLocationMatch = location.includes(lowerSearch);
    const isAddressMatch = address.includes(lowerSearch);
    const isNameMatch = companyName.includes(lowerSearch);
    const isServiceAreaMatch =
      Array.isArray(v.serviceAreas) &&
      v.serviceAreas.some((a: string) => a.toLowerCase().includes(lowerSearch));

    return isCityMatch || isLocationMatch || isAddressMatch || isNameMatch || isServiceAreaMatch;
  });
}
