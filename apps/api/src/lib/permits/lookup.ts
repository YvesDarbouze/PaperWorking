export function validatePermitLookupQuery(input: {
  propertyAddress?: string | null;
  jurisdictionId?: string | null;
  permitNumber?: string | null;
}): { ok: true; data: { propertyAddress: string; jurisdictionId: string; permitNumber?: string } } | { ok: false; error: string } {
  const propertyAddress = input.propertyAddress?.trim() ?? '';
  const jurisdictionId = input.jurisdictionId?.trim() ?? '';
  if (!propertyAddress || !jurisdictionId) {
    return { ok: false, error: 'propertyAddress and jurisdictionId are required' };
  }
  const permitNumber = input.permitNumber?.trim();
  return {
    ok: true,
    data: {
      propertyAddress,
      jurisdictionId,
      ...(permitNumber ? { permitNumber } : {}),
    },
  };
}
