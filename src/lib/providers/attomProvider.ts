import { PropertyDataProvider, PropertyFacts, Comp, RentalComp, ValueEstimate, PropertyNotFoundError } from './property';

export class AttomPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    console.log(`📡 [ATTOM] Fetching facts for: ${addressOrPlaceId}`);
    const url = `${this.baseUrl}/property/detail?address=${encodeURIComponent(addressOrPlaceId)}`;
    const res = await fetch(url, {
      headers: {
        'apikey': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`ATTOM API error: ${res.status} ${res.statusText}. ${errText}`);
    }

    const data = await res.json();
    const prop = data?.property?.[0];
    if (!prop) {
      throw new PropertyNotFoundError(`Could not find property data on ATTOM for address: ${addressOrPlaceId}`);
    }

    return {
      beds: prop.building?.rooms?.beds || undefined,
      baths: prop.building?.rooms?.bathstotal || undefined,
      sqft: prop.building?.size?.universalsize || undefined,
      yearBuilt: prop.building?.summary?.yearbuilt || undefined,
      lotSqft: prop.lot?.lotsize2 || undefined,
      propertyType: prop.summary?.propclass || undefined,
      lastSoldPriceCents: prop.sale?.amount?.saleamt ? Math.round(prop.sale.amount.saleamt * 100) : undefined,
      lastSoldDate: prop.sale?.recdate ? new Date(prop.sale.recdate) : undefined,
      annualPropertyTaxCents: prop.tax?.taxamt ? Math.round(prop.tax.taxamt * 100) : undefined,
      taxAssessedValueCents: prop.tax?.assdvalamt ? Math.round(prop.tax.assdvalamt * 100) : undefined,
      taxYear: prop.tax?.taxyr || undefined,
      sourceProvider: "ATTOM Property API",
      fetchedAt: new Date(),
    };
  }

  async getComps(addressOrPlaceId: string): Promise<Comp[]> {
    console.log(`📡 [ATTOM] Fetching comps for: ${addressOrPlaceId}`);
    const url = `${this.baseUrl}/salescomparison/address?address=${encodeURIComponent(addressOrPlaceId)}`;
    const res = await fetch(url, {
      headers: {
        'apikey': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`ATTOM API error: ${res.status} ${res.statusText}. ${errText}`);
    }

    const data = await res.json();
    const comps = data?.property?.[0]?.comparables || [];
    return comps.map((c: any) => ({
      addressLine: `${c.addressLine || c.address?.oneLine || 'Unknown Address'} (ATTOM Comp)`,
      beds: c.building?.rooms?.beds || undefined,
      baths: c.building?.rooms?.bathstotal || undefined,
      sqft: c.building?.size?.universalsize || undefined,
      soldPriceCents: c.sale?.amount?.saleamt ? Math.round(c.sale.amount.saleamt * 100) : undefined,
      soldDate: c.sale?.recdate ? new Date(c.sale.recdate) : undefined,
    }));
  }

  async getRentalComps(addressOrPlaceId: string): Promise<RentalComp[]> {
    return [];
  }

  async getValueEstimate(addressOrPlaceId: string): Promise<ValueEstimate> {
    console.log(`📡 [ATTOM] Fetching value estimate for: ${addressOrPlaceId}`);
    // Use the basic profile or valuation endpoint if one is configured
    const url = `${this.baseUrl}/valuation/address?address=${encodeURIComponent(addressOrPlaceId)}`;
    const res = await fetch(url, {
      headers: {
        'apikey': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`ATTOM API error: ${res.status} ${res.statusText}. ${errText}`);
    }

    const data = await res.json();
    const val = data?.property?.[0]?.valuation;
    if (!val) {
      throw new Error(`No valuation found on ATTOM for: ${addressOrPlaceId}`);
    }

    return {
      priceCents: Math.round((val.estimatedValue || 0) * 100),
      priceLowCents: Math.round((val.estimatedValueRangeLow || 0) * 100),
      priceHighCents: Math.round((val.estimatedValueRangeHigh || 0) * 100),
      source: 'attom',
      fetchedAt: new Date(),
    };
  }
}
