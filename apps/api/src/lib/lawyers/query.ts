export const LAWYER_MAX_RESULTS = 50;

export function validateLawyerStateQuery(stateCode: string | null | undefined): {
  ok: true;
  state: string;
} | { ok: false; error: string; status: number } {
  if (!stateCode) {
    return { ok: false, error: 'State code is required', status: 400 };
  }
  const normalizedState = stateCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedState)) {
    return {
      ok: false,
      error: 'Invalid state code. Must be a 2-letter US state abbreviation.',
      status: 400,
    };
  }
  return { ok: true, state: normalizedState };
}

export function mergeLawyerQueryResults(
  vendorDocs: Array<{ id: string; data: () => Record<string, unknown> }>,
  legacyDocs: Array<{ id: string; data: () => Record<string, unknown> }>,
): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  return [...vendorDocs, ...legacyDocs]
    .filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    })
    .map((doc) => ({ uid: doc.id, ...doc.data() }));
}
