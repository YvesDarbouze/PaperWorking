export function validateGeocodeQuery(address: string | null | undefined): { ok: true; address: string } | { ok: false; error: string; status: number } {
  const value = address?.trim() ?? '';
  if (!value) {
    return { ok: false, error: 'address parameter is required', status: 400 };
  }
  return { ok: true, address: value };
}

export function parseGeocodeApiResponse(data: {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
}): { lat: number | null; lng: number | null; formattedAddress: string | null } {
  if (data.status !== 'OK' || !data.results?.length) {
    return { lat: null, lng: null, formattedAddress: null };
  }
  const result = data.results[0];
  return {
    lat: result.geometry?.location?.lat ?? null,
    lng: result.geometry?.location?.lng ?? null,
    formattedAddress: result.formatted_address ?? null,
  };
}
