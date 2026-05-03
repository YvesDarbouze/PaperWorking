// Requires SOCRATA_APP_TOKEN in .env.local for higher rate limits (optional but recommended)
import { z } from 'zod';
import type { Permit } from '@/types/schema';

export const PermitLookupSchema = z.object({
  propertyAddress: z.string().min(1, 'Property address is required'),
  jurisdictionId: z.string().min(1, 'Jurisdiction ID is required'),
  permitNumber: z.string().optional(),
});

export type PermitLookupRequest = z.infer<typeof PermitLookupSchema>;
export type PermitLookupResponse = Permit;

export class JurisdictionNotSupportedError extends Error {
  readonly jurisdictionId: string;
  constructor(jurisdictionId: string) {
    super(`Jurisdiction '${jurisdictionId}' is not currently supported.`);
    this.name = 'JurisdictionNotSupportedError';
    this.jurisdictionId = jurisdictionId;
  }
}

export class ExternalApiError extends Error {
  readonly upstreamStatus?: number;
  constructor(message: string, upstreamStatus?: number) {
    super(message);
    this.name = 'ExternalApiError';
    this.upstreamStatus = upstreamStatus;
  }
}

interface IPermitAdapter {
  fetchPermit(request: PermitLookupRequest): Promise<PermitLookupResponse>;
}

interface SocrataConfig {
  domain: string;
  datasetId: string;
  permitNumberField: string;
  addressField: string;
  statusField: string;
  nameField: string;
  municipalityLabel: string;
  // Optional extended field mappings — populate when the dataset exposes them
  permitTypeField?: string;
  descriptionField?: string;
  issueDateField?: string;
  expirationDateField?: string;
  filedDateField?: string;
  inspectorNameField?: string;
  permitFeeField?: string;
}

function normalizeSocrataStatus(raw: string): Permit['status'] {
  const s = raw.toLowerCase();
  if (/approv|issued|final|complet/.test(s)) return 'Approved';
  if (/den|reject|void|cancel/.test(s)) return 'Denied';
  return 'Pending';
}

// Escapes a value for use inside a SoQL single-quoted string literal
function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

class OpenDataSocrataAdapter implements IPermitAdapter {
  private readonly config: SocrataConfig;

  constructor(config: SocrataConfig) {
    this.config = config;
  }

  async fetchPermit(request: PermitLookupRequest): Promise<PermitLookupResponse> {
    const { permitNumber, propertyAddress } = request;
    const {
      domain, datasetId,
      permitNumberField, addressField, statusField, nameField, municipalityLabel,
      permitTypeField, descriptionField,
      issueDateField, expirationDateField, filedDateField,
      inspectorNameField, permitFeeField,
    } = this.config;

    const whereClause = permitNumber
      ? `${permitNumberField}='${soqlEscape(permitNumber)}'`
      : `upper(${addressField}) like '%${soqlEscape(propertyAddress.toUpperCase())}%'`;

    const url = new URL(`https://${domain}/resource/${datasetId}.json`);
    url.searchParams.set('$where', whereClause);
    url.searchParams.set('$limit', '1');

    const headers: HeadersInit = { Accept: 'application/json' };
    const appToken = process.env.SOCRATA_APP_TOKEN;
    if (appToken) (headers as Record<string, string>)['X-App-Token'] = appToken;

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[PermitService] Network error fetching ${domain}/${datasetId}:`, detail);
      throw new ExternalApiError(`Permit registry unreachable: ${detail}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[PermitService] ${domain}/${datasetId} returned ${response.status}:`, body);
      throw new ExternalApiError(`Permit registry returned HTTP ${response.status}`, response.status);
    }

    const rows: Record<string, string>[] = await response.json();

    if (!rows?.length) {
      return {
        id: [permitNumber, propertyAddress].filter(Boolean).join('-'),
        name: permitNumber ?? propertyAddress,
        municipality: municipalityLabel,
        status: 'Pending',
        lastCheckedAt: new Date(),
      };
    }

    const row = rows[0];

    const parseDate = (field?: string): Date | undefined =>
      field && row[field] ? new Date(row[field]) : undefined;

    const parseNumber = (field?: string): number | undefined => {
      if (!field || !row[field]) return undefined;
      const n = parseFloat(row[field]);
      return isNaN(n) ? undefined : n;
    };

    return {
      id: row[permitNumberField] ?? String(Date.now()),
      name: row[nameField] ?? permitNumber ?? propertyAddress,
      municipality: municipalityLabel,
      status: normalizeSocrataStatus(row[statusField] ?? ''),
      lastCheckedAt: new Date(),
      propertyAddress: row[addressField] ?? propertyAddress,
      permitType: permitTypeField ? row[permitTypeField] : undefined,
      description: descriptionField ? row[descriptionField] : undefined,
      issueDate: parseDate(issueDateField),
      expirationDate: parseDate(expirationDateField),
      filedDate: parseDate(filedDateField),
      inspectorName: inspectorNameField ? row[inspectorNameField] : undefined,
      permitFee: parseNumber(permitFeeField),
    };
  }
}

class FallbackAdapter implements IPermitAdapter {
  async fetchPermit(request: PermitLookupRequest): Promise<never> {
    throw new JurisdictionNotSupportedError(request.jurisdictionId);
  }
}

// Registry of supported jurisdictions. Add new Socrata-based jurisdictions here.
const JURISDICTION_REGISTRY: Record<string, SocrataConfig> = {
  'miami-dade': {
    domain: 'opendata.miamidade.gov',
    datasetId: 'ggvb-7nkb',
    permitNumberField: 'processno',
    addressField: 'worklocationaddress',
    statusField: 'masterpermitstatus',
    nameField: 'worktypedescription',
    municipalityLabel: 'Miami-Dade County, FL',
    permitTypeField: 'permittype',
    descriptionField: 'projectdescription',
    issueDateField: 'issueddate',
    expirationDateField: 'expirationdate',
    filedDateField: 'applicationdate',
    inspectorNameField: 'inspectorname',
    permitFeeField: 'permitamount',
  },
};

function getPermitAdapter(jurisdictionId: string): IPermitAdapter {
  const config = JURISDICTION_REGISTRY[jurisdictionId.toLowerCase()];
  return config ? new OpenDataSocrataAdapter(config) : new FallbackAdapter();
}

export async function lookupPermit(request: PermitLookupRequest): Promise<PermitLookupResponse> {
  const adapter = getPermitAdapter(request.jurisdictionId);
  return adapter.fetchPermit(request);
}
