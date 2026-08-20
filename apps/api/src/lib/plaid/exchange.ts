export const VALID_PLAID_CONNECTION_PURPOSES = [
  'RENT_COLLECTION',
  'OPERATING_EXPENSES',
  'MORTGAGE_LIABILITY',
  'RESERVE_ACCOUNT',
  'CAPX_ACCOUNT',
] as const;

export type PlaidConnectionPurpose = (typeof VALID_PLAID_CONNECTION_PURPOSES)[number];

export interface ParsedPlaidExchangeBody {
  publicToken: string;
  projectId?: string;
  connectionPurpose: PlaidConnectionPurpose;
  consentedProducts: string[];
  consentedScopes: string[];
  consentedUseCases: string[];
  consentVersion?: string;
  metadata: Record<string, unknown>;
}

export function resolvePlaidConnectionPurpose(raw: unknown): PlaidConnectionPurpose {
  if (
    typeof raw === 'string' &&
    (VALID_PLAID_CONNECTION_PURPOSES as readonly string[]).includes(raw)
  ) {
    return raw as PlaidConnectionPurpose;
  }
  return 'OPERATING_EXPENSES';
}

export function parsePlaidExchangeBody(
  rawBody: Record<string, unknown>,
): { ok: true; value: ParsedPlaidExchangeBody } | { ok: false; error: string } {
  const publicToken = (rawBody.publicToken ?? rawBody.public_token) as string | undefined;
  if (!publicToken || typeof publicToken !== 'string') {
    return { ok: false, error: 'publicToken is required' };
  }

  const projectId = (rawBody.projectId ?? rawBody.project_id) as string | undefined;
  const rawPurpose = rawBody.connectionPurpose ?? rawBody.connection_purpose;
  const consentedProducts = (rawBody.consentedProducts ??
    rawBody.consented_products ??
    []) as string[];
  const consentedScopes = (rawBody.consentedScopes ?? rawBody.consented_scopes ?? []) as string[];
  const consentedUseCases = (rawBody.consentedUseCases ??
    rawBody.consented_use_cases ??
    []) as string[];
  const consentVersion = (rawBody.consentVersion ?? rawBody.consent_version) as
    | string
    | undefined;
  const metadata = (rawBody.metadata ?? {}) as Record<string, unknown>;

  return {
    ok: true,
    value: {
      publicToken,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      connectionPurpose: resolvePlaidConnectionPurpose(rawPurpose),
      consentedProducts: Array.isArray(consentedProducts) ? consentedProducts : [],
      consentedScopes: Array.isArray(consentedScopes) ? consentedScopes : [],
      consentedUseCases: Array.isArray(consentedUseCases) ? consentedUseCases : [],
      consentVersion: typeof consentVersion === 'string' ? consentVersion : undefined,
      metadata,
    },
  };
}

export interface PlaidExchangeSuccess {
  itemId: string;
  plaidConnectionId: string;
  connectionPurpose: PlaidConnectionPurpose;
  institutionName: string | null;
  accountMask: string | null;
}
