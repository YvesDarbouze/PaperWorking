import {
  MockPropertyLookupProvider,
  getPropertyLookupProvider,
  MOCK_LOOKUP_FIXTURES,
} from '@/lib/deal-analyzer/propertyLookup';

describe('PROMPT 4 — Deal Analyzer Property Data Lookup Provider & Fixtures', () => {
  let provider: MockPropertyLookupProvider;

  beforeEach(() => {
    provider = new MockPropertyLookupProvider();
  });

  it('1. Full-Hit Fixture: returns taxes, rent, value, facts, and provenance badge source', async () => {
    const result = await provider.lookup('123 Main St, Austin, TX 78701');
    expect(result).not.toBeNull();
    expect(result?.propertyTaxesAnnual).toBe(4800);
    expect(result?.rentEstimate).toBe(2800);
    expect(result?.valueEstimate).toBe(450000);
    expect(result?.hoaMonthly).toBe(150);
    expect(result?.propertyFacts).toEqual({
      beds: 3,
      baths: 2,
      sqft: 1850,
      yearBuilt: 2012,
      propertyType: 'Single Family',
    });
    expect(result?.provenance.source).toBe('RentCast Public Records');
    expect(result?.provenance.confidence).toBe('high');
  });

  it('2. Taxes-Only Fixture: returns taxes and facts, leaves rent & value undefined', async () => {
    const result = await provider.lookup('456 Oak Ave, Dallas, TX 75201');
    expect(result).not.toBeNull();
    expect(result?.propertyTaxesAnnual).toBe(3600);
    expect(result?.rentEstimate).toBeUndefined();
    expect(result?.valueEstimate).toBeUndefined();
    expect(result?.propertyFacts?.beds).toBe(2);
    expect(result?.provenance.source).toBe('Dallas County Public Records');
  });

  it('3. Rent-Only Fixture: returns rent and facts, leaves taxes & value undefined', async () => {
    const result = await provider.lookup('789 Pine Rd, Houston, TX 77002');
    expect(result).not.toBeNull();
    expect(result?.rentEstimate).toBe(2100);
    expect(result?.propertyTaxesAnnual).toBeUndefined();
    expect(result?.valueEstimate).toBeUndefined();
    expect(result?.propertyFacts?.beds).toBe(3);
    expect(result?.provenance.source).toBe('RentCast AVM');
  });

  it('4. Not-Found Fixture: returns null cleanly', async () => {
    const result = await provider.lookup('999 Unknown Way, Nowhere, CA 90000');
    expect(result).toBeNull();
  });

  it('5. Provider-Error Fixture: throws an actionable error message', async () => {
    await expect(provider.lookup('500 Error Blvd, Failtown, NY 10001')).rejects.toThrow(
      'External property data provider temporary error (500)'
    );
  });

  it('Factory function returns MockPropertyLookupProvider when PROPERTY_DATA_PROVIDER is mock/unset', () => {
    const activeProvider = getPropertyLookupProvider();
    expect(activeProvider).toBeInstanceOf(MockPropertyLookupProvider);
  });
});
