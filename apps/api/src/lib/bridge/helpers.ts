export interface BridgeSearchResult {
  listingKey: string;
  listingId: string;
  address: string;
  listPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  standardStatus: string | null;
  thumbnailUrl: string | null;
}

const ADDRESS_QUERY_PATTERN = /^[\w\s,.\-#/]+$/i;
const NAME_QUERY_PATTERN = /^[\w\s.\-']+$/i;
const OFFICE_QUERY_PATTERN = /^[\w\s.\-&']+$/i;

export function validateBridgeAddressQuery(
  q: string | null | undefined,
): { ok: true; query: string } | { ok: false; error: string; status: number; results: [] } {
  const query = q?.trim() || '';
  if (!query || query.length < 3) {
    return { ok: false, error: '', status: 200, results: [] };
  }
  if (!ADDRESS_QUERY_PATTERN.test(query)) {
    return { ok: false, error: 'Invalid search query', status: 400, results: [] };
  }
  return { ok: true, query };
}

export function validateBridgeNameQuery(
  q: string | null | undefined,
  pattern: RegExp = NAME_QUERY_PATTERN,
): { ok: true; query: string } | { ok: false; error: string; status: number; results: [] } {
  const query = q?.trim() || '';
  if (!query || query.length < 2) {
    return { ok: false, error: '', status: 200, results: [] };
  }
  if (!pattern.test(query)) {
    return { ok: false, error: 'Invalid search query', status: 400, results: [] };
  }
  return { ok: true, query };
}

export function validateBridgeLookupParams(input: {
  q?: string | null;
  key?: string | null;
}): { ok: true; mode: 'search' | 'lookup'; q?: string; key?: string } | { ok: false; error: string; status: number } {
  const q = input.q?.trim();
  const key = input.key?.trim();
  if (!q && !key) {
    return {
      ok: false,
      error: 'Provide ?q=<name> for search or ?key=<memberKey> for lookup.',
      status: 400,
    };
  }
  if (key) return { ok: true, mode: 'lookup', key };
  return { ok: true, mode: 'search', q };
}

export function validateBridgeOfficeLookupParams(input: {
  q?: string | null;
  key?: string | null;
}): { ok: true; mode: 'search' | 'lookup'; q?: string; key?: string } | { ok: false; error: string; status: number } {
  const result = validateBridgeLookupParams(input);
  if (!result.ok) {
    return {
      ok: false,
      error: 'Provide ?q=<name> for search or ?key=<officeKey> for lookup.',
      status: 400,
    };
  }
  return result;
}

export function parseBridgeOpenHouseTop(topParam: string | null | undefined): number {
  return Math.min(parseInt(topParam ?? '20', 10) || 20, 100);
}

export function mapBridgeSearchRecords(records: Array<Record<string, unknown>>): BridgeSearchResult[] {
  return records.map((record) => ({
    listingKey: String(record.ListingKey ?? ''),
    listingId: String(record.ListingId ?? ''),
    address: String(record.UnparsedAddress ?? ''),
    listPrice: record.ListPrice != null ? Number(record.ListPrice) : null,
    beds: record.BedroomsTotal != null ? Number(record.BedroomsTotal) : null,
    baths: record.BathroomsFull != null ? Number(record.BathroomsFull) : null,
    sqft: record.LivingArea != null ? Number(record.LivingArea) : null,
    standardStatus: record.StandardStatus != null ? String(record.StandardStatus) : null,
    thumbnailUrl:
      Array.isArray(record.Media) && record.Media.length > 0
        ? String((record.Media[0] as { MediaURL?: string })?.MediaURL ?? '') || null
        : null,
  }));
}

export function mapBridgeAgentResults(
  agents: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return agents.map((agent) => ({
    memberKey: agent.MemberKey,
    name:
      agent.MemberFullName ??
      `${agent.MemberFirstName ?? ''} ${agent.MemberLastName ?? ''}`.trim(),
    email: agent.MemberEmail ?? null,
    phone: agent.MemberDirectPhone ?? agent.MemberMobilePhone ?? null,
    license: agent.MemberStateLicense ?? null,
    officeName: agent.OfficeName ?? null,
    photoUrl: (agent.Media as Array<{ MediaURL?: string }> | undefined)?.[0]?.MediaURL ?? null,
  }));
}

export function mapBridgeOfficeResults(
  offices: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return offices.map((office) => ({
    officeKey: office.OfficeKey,
    name: office.OfficeName ?? '',
    phone: office.OfficePhone ?? null,
    email: office.OfficeEmail ?? null,
    address: [office.OfficeAddress1, office.OfficeCity, office.OfficeStateOrProvince, office.OfficePostalCode]
      .filter(Boolean)
      .join(', '),
    type: office.OfficeType ?? null,
    status: office.OfficeStatus ?? null,
  }));
}

export function mapBridgeOpenHouseResults(
  records: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return records.map((oh) => ({
    openHouseKey: oh.OpenHouseKey,
    listingKey: oh.ListingKey ?? null,
    listingId: oh.ListingId ?? null,
    date: oh.OpenHouseDate ?? null,
    startTime: oh.OpenHouseStartTime ?? null,
    endTime: oh.OpenHouseEndTime ?? null,
    type: oh.OpenHouseType ?? null,
    remarks: oh.OpenHouseRemarks ?? null,
    showingAgent: oh.ShowingAgentFirstName
      ? `${oh.ShowingAgentFirstName} ${oh.ShowingAgentLastName ?? ''}`.trim()
      : null,
  }));
}

export function buildBridgeMetadataResponse(fields: string[]): Record<string, unknown> {
  const sorted = [...fields].sort();
  return {
    success: true,
    metadata: {
      entityType: 'Property',
      fieldCount: sorted.length,
      fields: sorted,
    },
  };
}

export function isBridgeCredentialIssue(message: string, status?: number): boolean {
  return (
    message.includes('BRIDGE_CONFIG_FAILURE') ||
    message.includes('Missing') ||
    message.includes('access_token') ||
    message.includes('Authentication Failure') ||
    status === 401 ||
    status === 403 ||
    message.includes('401') ||
    message.includes('403')
  );
}

export function isBridgeServicePaused(message: string): boolean {
  return message.includes('BRIDGE_CONFIG_FAILURE') || message.includes('BRIDGE_SERVICE_PAUSED');
}

export function isAdminBridgeSyncCaller(token: Record<string, unknown> | undefined): boolean {
  return token?.admin === true;
}

export { OFFICE_QUERY_PATTERN, NAME_QUERY_PATTERN };
