export function validatePropertyLookupBody(
  body: { address?: unknown },
): { ok: true; address: string } | { ok: false; error: string; status: number } {
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (!address) {
    return { ok: false, error: 'Address string is required for lookup.', status: 400 };
  }
  return { ok: true, address };
}

export function isE2ETestContext(headers: {
  cookie?: string | null;
  e2eHeader?: string | null;
}): boolean {
  if (headers.e2eHeader === '1') return true;
  if (headers.cookie?.includes('__e2e_test=1')) return true;
  return false;
}
