import { PropertyDataProvider, PropertyFacts, Comp, RentalComp, ValueEstimate, PropertyNotFoundError } from './property';

export class MashvisorPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.mashvisor.com/v1.1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    console.log(`📡 [Mashvisor] Fetching facts for: ${addressOrPlaceId}`);
    const url = `${this.baseUrl}/property/detail?address=${encodeURIComponent(addressOrPlaceId)}`;
    const res = await fetch(url, {
      headers: {
        'x-api-key': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Mashvisor API error: ${res.status} ${res.statusText}. ${errText}`);
    }

    const data = await res.json();
    const prop = data?.content;
    if (!prop) {
      throw new PropertyNotFoundError(`Could not find property data on Mashvisor for address: ${addressOrPlaceId}`);
    }

    return {
      beds: prop.bedrooms || undefined,
      baths: prop.bathrooms || undefined,
      sqft: prop.sqft || undefined,
      yearBuilt: prop.year_built || undefined,
      propertyType: prop.type || undefined,
      sourceProvider: "Mashvisor API",
      fetchedAt: new Date(),
    };
  }

  async getComps(addressOrPlaceId: string): Promise<Comp[]> {
    console.log(`📡 [Mashvisor] Fetching comps for: ${addressOrPlaceId}`);
    const url = `${this.baseUrl}/property/comps?address=${encodeURIComponent(addressOrPlaceId)}`;
    const res = await fetch(url, {
      headers: {
        'x-api-key': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Mashvisor API error: ${res.status} ${res.statusText}. ${errText}`);
    }

    const data = await res.json();
    const comps = data?.content?.comps || [];
    return comps.map((c: any) => ({
      addressLine: `${c.address || 'Unknown Address'} (Mashvisor Comp)`,
      beds: c.bedrooms || undefined,
      baths: c.bathrooms || undefined,
      sqft: c.sqft || undefined,
      soldPriceCents: c.sold_price ? Math.round(c.sold_price * 100) : undefined,
      soldDate: c.sold_date ? new Date(c.sold_date) : undefined,
    }));
  }

  async getRentalComps(addressOrPlaceId: string): Promise<RentalComp[]> {
    return [];
  }

  async getValueEstimate(addressOrPlaceId: string): Promise<ValueEstimate> {
    console.log(`📡 [Mashvisor] Fetching value estimate for: ${addressOrPlaceId}`);
    const url = `${this.baseUrl}/property/detail?address=${encodeURIComponent(addressOrPlaceId)}`;
    const res = await fetch(url, {
      headers: {
        'x-api-key': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Mashvisor API error: ${res.status} ${res.statusText}. ${errText}`);
    }

    const data = await res.json();
    const prop = data?.content;
    if (!prop || !prop.avm) {
      throw new Error(`No valuation found on Mashvisor for: ${addressOrPlaceId}`);
    }

    return {
      priceCents: Math.round((prop.avm.price || 0) * 100),
      priceLowCents: Math.round((prop.avm.price_low || 0) * 100),
      priceHighCents: Math.round((prop.avm.price_high || 0) * 100),
      source: 'mashvisor',
      fetchedAt: new Date(),
    };
  }
}
