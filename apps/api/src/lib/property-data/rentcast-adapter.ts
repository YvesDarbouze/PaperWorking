import type { PropertySnapshot } from "@paperworking/validation";

export interface PropertyDataRecord extends Partial<PropertySnapshot> {
  formattedAddress?: string;
  sourceProvider: string;
}

export interface RentalCompsResult {
  estimatedRent: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
  comps: Array<Record<string, unknown>>;
  sourceProvider: string;
}

export interface ValuationCompsResult {
  estimatedValue: number;
  valueRangeLow?: number;
  valueRangeHigh?: number;
  comps: Array<Record<string, unknown>>;
  sourceProvider: string;
}

export interface PropertyComparableSale {
  address: string;
  sale_price: number;
  sale_date?: string;
  sqft?: number;
  distance?: number;
  source: string;
  asOf: string;
  isStale?: boolean;
}

export interface UnifiedPropertyLookupResult {
  provider: string;
  configured: boolean;
  facts: PropertyDataRecord | null;
  estimatedRent?: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
  estimatedValue?: number;
  valueRangeLow?: number;
  valueRangeHigh?: number;
  comps: PropertyComparableSale[];
  requiresCredentials?: boolean;
  message?: string;
  source?: string;
  asOf?: string;
  as_of?: string;
  isStale?: boolean;
}

export interface IPropertyDataProvider {
  readonly providerId: string;
  readonly isConfigured: boolean;
  fetchPropertyFacts(address: string): Promise<PropertyDataRecord | null>;
  fetchRentalComps(address: string): Promise<RentalCompsResult>;
  fetchValuationComps(address: string): Promise<ValuationCompsResult>;
  fetchUnifiedPropertyData(address: string): Promise<UnifiedPropertyLookupResult>;
}

export class RequiresCredentialsError extends Error {
  readonly requiresCredentials = true;
  constructor(providerName: string, envVar: string) {
    super(
      `[${providerName} Property Adapter]: REQUIRES CREDENTIALS. "${envVar}" is not configured in the environment. Live property data cannot be fetched.`
    );
    this.name = "RequiresCredentialsError";
  }
}

export interface RentCastAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

/**
 * RentCastPropertyAdapter: Typed adapter for real-estate property facts, AVM valuation, and rental comps.
 * Follows Rule 5: Honest degradation when credentials are not configured.
 */
export class RentCastPropertyAdapter implements IPropertyDataProvider {
  readonly providerId = "rentcast";
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: RentCastAdapterOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.RENTCAST_API_KEY;
    this.baseUrl = options.baseUrl ?? "https://api.rentcast.io/v1";
    this.fetcher = options.fetchFn ?? globalThis.fetch;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new RequiresCredentialsError("RentCast", "RENTCAST_API_KEY");
    }
  }

  async fetchPropertyFacts(address: string): Promise<PropertyDataRecord | null> {
    this.assertConfigured();

    const url = new URL(`${this.baseUrl}/properties`);
    url.searchParams.set("address", address);

    const response = await this.fetcher(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Api-Key": this.apiKey!,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`RentCast API error (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as any;
    const raw = Array.isArray(data) ? data[0] : data;
    if (!raw) return null;

    return {
      sourceProvider: "rentcast",
      formattedAddress: raw.formattedAddress,
      address: raw.formattedAddress ?? address,
      city: raw.city ?? 'Unknown',
      state: (raw.state ?? 'TX').slice(0, 2),
      zipCode: raw.zipCode ?? '00000',
      beds: raw.bedrooms ?? raw.beds,
      baths: raw.bathrooms ?? raw.baths,
      squareFeet: raw.squareFootage ?? raw.sqft,
      yearBuilt: raw.yearBuilt,
      lotSizeSqFt: raw.lotSize,
      propertyType: this.normalizePropertyType(raw.propertyType),
      taxAssessment: raw.taxAssessment?.value,
      avmValue: raw.lastSalePrice,
      dataProvider: 'rentcast',
    };
  }

  async fetchRentalComps(address: string): Promise<RentalCompsResult> {
    this.assertConfigured();

    const url = new URL(`${this.baseUrl}/avm/rent/long-term`);
    url.searchParams.set("address", address);

    const response = await this.fetcher(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Api-Key": this.apiKey!,
      },
    });

    if (!response.ok) {
      throw new Error(`RentCast Rental AVM error (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as any;
    return {
      sourceProvider: "rentcast",
      estimatedRent: data.rent ?? 0,
      rentRangeLow: data.rentRangeLow,
      rentRangeHigh: data.rentRangeHigh,
      comps: Array.isArray(data.comparables) ? data.comparables : [],
    };
  }

  async fetchValuationComps(address: string): Promise<ValuationCompsResult> {
    this.assertConfigured();

    const url = new URL(`${this.baseUrl}/avm/value`);
    url.searchParams.set("address", address);

    const response = await this.fetcher(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Api-Key": this.apiKey!,
      },
    });

    if (!response.ok) {
      throw new Error(`RentCast Valuation AVM error (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as any;
    return {
      sourceProvider: "rentcast",
      estimatedValue: data.price ?? 0,
      valueRangeLow: data.priceRangeLow,
      valueRangeHigh: data.priceRangeHigh,
      comps: Array.isArray(data.comparables) ? data.comparables : [],
    };
  }

  async fetchUnifiedPropertyData(address: string): Promise<UnifiedPropertyLookupResult> {
    this.assertConfigured();

    const [facts, rental, valuation] = await Promise.all([
      this.fetchPropertyFacts(address),
      this.fetchRentalComps(address).catch(() => ({
        estimatedRent: 0,
        rentRangeLow: undefined,
        rentRangeHigh: undefined,
        sourceProvider: "rentcast",
        comps: [] as Array<Record<string, unknown>>,
      })),
      this.fetchValuationComps(address).catch(() => ({
        estimatedValue: 0,
        valueRangeLow: undefined,
        valueRangeHigh: undefined,
        sourceProvider: "rentcast",
        comps: [] as Array<Record<string, unknown>>,
      })),
    ]);

    const nowIso = new Date().toISOString();
    const rawComps = Array.isArray(valuation.comps) ? valuation.comps : [];
    const normalizedComps: PropertyComparableSale[] = rawComps.slice(0, 6).map((c: any) => {
      const salePrice = Number(c.price ?? c.lastSalePrice ?? c.salePrice ?? 0);
      const sqft = Number(c.squareFootage ?? c.sqft ?? c.squareFeet ?? 0);
      const dist = typeof c.distance === "number" ? Number(c.distance.toFixed(2)) : undefined;
      const rawDate = c.lastSaleDate ?? c.saleDate ?? c.date;
      const saleDate = rawDate ? String(rawDate).slice(0, 10) : undefined;
      const compAddress = String(c.formattedAddress ?? c.address ?? "Unknown Address");

      return {
        address: compAddress,
        sale_price: salePrice,
        sale_date: saleDate,
        sqft: sqft > 0 ? sqft : undefined,
        distance: dist,
        source: "rentcast",
        asOf: saleDate || nowIso.slice(0, 10),
        isStale: false,
      };
    });

    return {
      provider: "rentcast",
      source: "rentcast",
      asOf: nowIso,
      as_of: nowIso,
      isStale: false,
      configured: true,
      facts,
      estimatedRent: rental.estimatedRent > 0 ? rental.estimatedRent : facts?.rentEstimate,
      rentRangeLow: rental.rentRangeLow,
      rentRangeHigh: rental.rentRangeHigh,
      estimatedValue: valuation.estimatedValue > 0 ? valuation.estimatedValue : facts?.avmValue,
      valueRangeLow: valuation.valueRangeLow,
      valueRangeHigh: valuation.valueRangeHigh,
      comps: normalizedComps,
    };
  }

  private normalizePropertyType(rawType?: string): PropertySnapshot["propertyType"] {
    if (!rawType) return "single_family";
    const lower = rawType.toLowerCase();
    if (lower.includes("condo")) return "condo";
    if (lower.includes("townhouse") || lower.includes("townhome")) return "townhouse";
    if (lower.includes("multi") || lower.includes("duplex") || lower.includes("triplex")) return "multi_family_2_4";
    if (lower.includes("commercial")) return "commercial";
    if (lower.includes("land")) return "land";
    return "single_family";
  }
}
