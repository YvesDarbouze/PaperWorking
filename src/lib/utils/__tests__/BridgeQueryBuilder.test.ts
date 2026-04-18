import { BridgeQueryBuilder } from '../BridgeQueryBuilder';

/**
 * 🧪 BridgeQueryBuilder Unit Tests
 * 
 * Verifies RESO-compliant OData v4 query construction, 
 * focusing on the automated $expand and $select synchronization logic.
 */

describe('BridgeQueryBuilder', () => {
  it('correctly builds a basic filter with standard status defaults', () => {
    const builder = new BridgeQueryBuilder();
    const query = builder.build();
    expect(query).toBe('?$filter=StandardStatus eq \'Active\'');
  });

  it('handles field selection ($select) without expansion', () => {
    const builder = new BridgeQueryBuilder().select(['ListingId', 'ListPrice']).ignoreDefaults();
    const query = builder.build();
    expect(query).toBe('?$select=ListingId,ListPrice');
  });

  it('handles navigation property expansion ($expand) without selection', () => {
    const builder = new BridgeQueryBuilder().expand('ListOffice').ignoreDefaults();
    const query = builder.build();
    expect(query).toBe('?$expand=ListOffice');
  });

  it('automatically synchronizes $expand into $select for OData v4 compliance', () => {
    /**
     * 🛡️ REQUIREMENT:
     * If $select is used to limit fields, and $expand is used (e.g., for ListOffice), 
     * the expanded field name MUST be explicitly included in the $select string 
     * as required by the Bridge API documentation.
     */
    const builder = new BridgeQueryBuilder()
      .select(['ListingId', 'ListPrice'])
      .expand('ListOffice')
      .ignoreDefaults();
    
    const query = builder.build();
    
    // Verify $expand is present
    expect(query).toContain('$expand=ListOffice');
    
    // Verify $select contains both original fields AND the expanded field
    const selectPart = query.split('&').find(p => p.startsWith('$select=')) || '';
    expect(selectPart).toContain('ListingId');
    expect(selectPart).toContain('ListPrice');
    expect(selectPart).toContain('ListOffice');
  });

  it('prevents duplicate fields in the synchronized $select list', () => {
    const builder = new BridgeQueryBuilder()
      .select(['ListingId', 'ListOffice']) // ListOffice already manually included
      .expand('ListOffice')
        .ignoreDefaults();
    
    const query = builder.build();
    const selectPart = query.split('&').find(p => p.startsWith('$select=')) || '';
    
    // Verify ListOffice appears exactly once in the select list
    const occurrences = (selectPart.match(/ListOffice/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it('handles multiple expansions with full $select-sync', () => {
    const builder = new BridgeQueryBuilder()
      .select(['ListingId'])
      .expand('ListOffice')
      .expand('ListAgent')
      .ignoreDefaults();
    
    const query = builder.build();
    
    expect(query).toContain('$expand=ListOffice,ListAgent');
    expect(query).toContain('ListOffice');
    expect(query).toContain('ListAgent');
    expect(query).toContain('ListingId');
  });

  it('enforces the Media guardrail (Media expansion is blocked)', () => {
    const builder = new BridgeQueryBuilder().expand('Media').ignoreDefaults();
    const query = builder.build();
    
    // Media is embedded by default in Bridge Property records
    expect(query).not.toContain('$expand=Media');
  });

  it('validates Simple Web API proximity parameters (near & radius) formatting', () => {
    // REQUIREMENT: near=lon,lat&radius=Nmi
    const lat = 37.79;
    const lon = -122.39;
    const radius = 5;
    
    const builder = new BridgeQueryBuilder().nearSimple(lat, lon, radius).ignoreDefaults();
    const query = builder.build();
    
    // Check for exact formatting and lon/lat order
    expect(query).toContain('near=-122.39,37.79');
    expect(query).toContain('radius=5mi');
  });

  it('properly quotes and encodes string literals with spaces', () => {
    // REQUIREMENT: PropertyType eq 'Residential Lease'
    const builder = new BridgeQueryBuilder().filter('PropertyType', 'eq', 'Residential Lease').ignoreDefaults();
    const query = builder.build();
    
    // OData requires single quotes. Spaces become %20.
    expect(query).toContain("PropertyType eq 'Residential%20Lease'");
  });

  it('correctly escapes internal single quotes in string literals', () => {
    /** 
     * 🛡️ Logic Guardrail:
     * OData standard escapes internal single quotes by doubling them ('').
     * Example: "St. John's" should become 'St.%20John%27%27s' 
     * (where '' is encoded to %27%27)
     */
    const builder = new BridgeQueryBuilder().filter('City', 'eq', "St. John's").ignoreDefaults();
    const query = builder.build();
    
    expect(query).toContain("City eq 'St.%20John%27%27s'");
  });

  it('correctly formats startswith for autocomplete', () => {
    // Prompt 43: startswith(City, 'San')
    const builder = new BridgeQueryBuilder().startsWith('City', 'San').ignoreDefaults();
    const query = builder.build();
    
    expect(query).toContain("startswith(City, 'San')");
  });

  it('correctly formats endswith for autocomplete', () => {
    // Prompt 43: endswith(Neighborhood, 'Hills')
    const builder = new BridgeQueryBuilder().endsWith('Neighborhood', 'Hills').ignoreDefaults();
    const query = builder.build();
    
    expect(query).toContain("endswith(Neighborhood, 'Hills')");
  });
});
