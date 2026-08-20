export function oDataString(value: string): string {
  const escaped = value.replace(/'/g, "''");
  return `'${encodeURIComponent(escaped).replace(/'/g, '%27')}'`;
}

export function validateMlsSearchQuery(q: string | null | undefined): { ok: true; q: string } | { ok: false; status: number; body: unknown } {
  const trimmed = q?.trim() ?? '';
  if (trimmed.length < 2) {
    return { ok: false, status: 200, body: [] };
  }
  return { ok: true, q: trimmed };
}

export function buildMlsSearchFilter(q: string): string {
  const sv = oDataString(q);
  return `StandardStatus eq 'Active' and (contains(UnparsedAddress,${sv}) or contains(City,${sv}) or contains(PostalCode,${sv}))`;
}

export function mapMlsPropertyResults(raw: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return raw.map((p) => ({
    id: p.ListingKey ?? p.ListingId ?? '',
    address: p.UnparsedAddress ?? p.FullAddress ?? '',
    city: p.City ?? '',
    state: p.StateOrProvince ?? '',
    zip: p.PostalCode ?? '',
    beds: p.BedroomsTotal ?? 0,
    baths: p.BathroomsFull ?? 0,
    sqft: p.LivingArea ?? 0,
    askingPrice: p.ListPrice ?? 0,
    yearBuilt: p.YearBuilt ?? 0,
    imageUrl: Array.isArray(p.Media) ? (p.Media as Array<{ MediaURL?: string }>)[0]?.MediaURL : undefined,
  }));
}
