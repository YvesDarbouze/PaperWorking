import { canonicalizeAddress, generateDealSlug } from '@/lib/identity/propertyIdentity';

describe('canonicalizeAddress', () => {
  it('normalizes street type abbreviations', () => {
    const result1 = canonicalizeAddress({
      streetNumber: '123', route: 'Main Street', city: 'Miami', state: 'FL', zip: '33101'
    });
    expect(result1).toBe('123 Main St, Miami, FL 33101');

    const result2 = canonicalizeAddress({
      streetNumber: '456', route: 'Oak Avenue', city: 'Miami', state: 'FL', zip: '33101'
    });
    expect(result2).toBe('456 Oak Ave, Miami, FL 33101');
  });

  it('four spellings resolve to one canonical form', () => {
    const baseComponents = { streetNumber: '123', city: 'Miami', state: 'FL', zip: '33101' };
    const r1 = canonicalizeAddress({ ...baseComponents, route: 'Main St' });
    const r2 = canonicalizeAddress({ ...baseComponents, route: 'Main Street' });
    const r3 = canonicalizeAddress({ ...baseComponents, route: 'Main St.' });
    const r4 = canonicalizeAddress({ ...baseComponents, route: 'main st' });

    expect(r1).toBe('123 Main St, Miami, FL 33101');
    expect(r2).toBe('123 Main St, Miami, FL 33101');
    expect(r3).toBe('123 Main St, Miami, FL 33101');
    expect(r4).toBe('123 Main St, Miami, FL 33101');
  });

  it('includes unit number when present', () => {
    const r = canonicalizeAddress({
      streetNumber: '123', route: 'Main St', unitNumber: 'Apt 2', city: 'Miami', state: 'FL', zip: '33101'
    });
    expect(r).toBe('123 Main St Apt 2, Miami, FL 33101');
  });

  it('normalizes unit type abbreviations', () => {
    const base = { streetNumber: '123', route: 'Main St', city: 'Miami', state: 'FL', zip: '33101' };
    
    expect(canonicalizeAddress({ ...base, unitNumber: 'apartment 5' })).toBe('123 Main St Apt 5, Miami, FL 33101');
    expect(canonicalizeAddress({ ...base, unitNumber: 'suite 100' })).toBe('123 Main St Ste 100, Miami, FL 33101');
    expect(canonicalizeAddress({ ...base, unitNumber: '#3' })).toBe('123 Main St Unit 3, Miami, FL 33101');
  });

  it('title-cases city name', () => {
    const base = { streetNumber: '123', route: 'Main St', state: 'FL', zip: '33101' };
    
    expect(canonicalizeAddress({ ...base, city: 'miami' })).toBe('123 Main St, Miami, FL 33101');
    expect(canonicalizeAddress({ ...base, city: 'new york' })).toBe('123 Main St, New York, FL 33101');
    expect(canonicalizeAddress({ ...base, city: 'SAN FRANCISCO' })).toBe('123 Main St, San Francisco, FL 33101');
  });

  it('uppercases state code', () => {
    const base = { streetNumber: '123', route: 'Main St', city: 'Miami', zip: '33101' };
    expect(canonicalizeAddress({ ...base, state: 'fl' })).toBe('123 Main St, Miami, FL 33101');
  });

  it('handles missing unit gracefully', () => {
    const r = canonicalizeAddress({
      streetNumber: '123', route: 'Main St', city: 'Miami', state: 'FL', zip: '33101'
    });
    expect(r).toBe('123 Main St, Miami, FL 33101');
  });

  it('handles empty/whitespace components', () => {
    const r = canonicalizeAddress({
      streetNumber: ' 123 ', route: '  Main St  ', city: ' Miami ', state: ' fl ', zip: ' 33101 '
    });
    expect(r).toBe('123 Main St, Miami, FL 33101');
  });
});

describe('generateDealSlug', () => {
  it('generates slug from canonical address', () => {
    expect(generateDealSlug('123 Main St, Miami, FL 33101', [])).toBe('123-main-st-miami-fl');
  });

  it('includes unit in slug', () => {
    expect(generateDealSlug('123 Main St Apt 2, Miami, FL 33101', [])).toBe('123-main-st-apt-2-miami-fl');
  });

  it('resolves collision with deterministic suffix', () => {
    expect(generateDealSlug('123 Main St, Miami, FL 33101', ['123-main-st-miami-fl'])).toBe('123-main-st-miami-fl-2');
  });

  it('resolves multiple collisions', () => {
    expect(generateDealSlug('123 Main St, Miami, FL 33101', ['123-main-st-miami-fl', '123-main-st-miami-fl-2'])).toBe('123-main-st-miami-fl-3');
  });

  it('strips special characters', () => {
    expect(generateDealSlug('123 Main St. Apt #2, Miami, FL 33101', [])).toBe('123-main-st-apt-2-miami-fl');
  });

  it('deduplicates consecutive hyphens', () => {
    expect(generateDealSlug('123   Main   St, Miami, FL 33101', [])).toBe('123-main-st-miami-fl');
  });

  it('handles empty existingSlugs', () => {
    expect(generateDealSlug('123 Main St, Miami, FL 33101', [])).toBe('123-main-st-miami-fl');
  });
});
