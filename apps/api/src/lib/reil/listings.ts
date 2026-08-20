export function validateReilListingsQuery(input: {
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  listingType?: string | null;
}): { ok: true } | { ok: false; error: string; status: number } {
  if (!input.zipCode && !input.city && !input.state) {
    return {
      ok: false,
      error: 'Must specify a zipCode, city, or state to search active listings.',
      status: 400,
    };
  }
  return { ok: true };
}

export function parseReilListingsParams(searchParams: URLSearchParams): Record<string, unknown> {
  const minPriceStr = searchParams.get('minPrice');
  const maxPriceStr = searchParams.get('maxPrice');
  const bedroomsStr = searchParams.get('bedrooms');
  const limitStr = searchParams.get('limit');
  const offsetStr = searchParams.get('offset');
  return {
    zipCode: searchParams.get('zipCode') || undefined,
    city: searchParams.get('city') || undefined,
    state: searchParams.get('state') || undefined,
    listingType: (searchParams.get('listingType') || 'sale').toLowerCase(),
    minPrice: minPriceStr ? Number(minPriceStr) : undefined,
    maxPrice: maxPriceStr ? Number(maxPriceStr) : undefined,
    bedrooms: bedroomsStr ? Number(bedroomsStr) : undefined,
    propertyType: searchParams.get('propertyType') || undefined,
    limit: limitStr ? Number(limitStr) : 20,
    offset: offsetStr ? Number(offsetStr) : 0,
    status: 'Active',
  };
}

export function validateReilMarketStatsZip(zipCode: string | null | undefined): {
  ok: true;
  zipCode: string;
} | { ok: false; error: string; status: number } {
  const zip = zipCode?.trim() ?? '';
  if (zip.length !== 5) {
    return {
      ok: false,
      error: 'Invalid or missing zipCode query parameter. Expected a 5-digit US ZIP code.',
      status: 400,
    };
  }
  return { ok: true, zipCode: zip };
}

export const REIL_PROPERTY_STALE_MS = 60 * 60 * 1000;

export function shouldReturnCachedProperty(lastSyncedAt: string | Date | null | undefined, forceRefresh: boolean): boolean {
  if (forceRefresh || !lastSyncedAt) return false;
  const age = Date.now() - new Date(lastSyncedAt).getTime();
  return age < REIL_PROPERTY_STALE_MS;
}

export function resolvePropertyLookupKey(input: {
  providerType: string;
  project: { addressLine?: string | null; placeId?: string | null };
  bodyPlaceId?: string;
}): string | null {
  if (['rentcast', 'attom', 'mashvisor'].includes(input.providerType)) {
    return input.project.addressLine || input.bodyPlaceId || input.project.placeId || null;
  }
  return input.bodyPlaceId ?? input.project.placeId ?? input.project.addressLine ?? null;
}

export function serializeValuationSnapshots(
  snapshots: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return snapshots.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    valueCents: Number(s.valueCents),
    valueLowCents: Number(s.valueLowCents),
    valueHighCents: Number(s.valueHighCents),
    source: s.source,
    fetchedAt: s.fetchedAt,
    createdAt: s.createdAt,
  }));
}
