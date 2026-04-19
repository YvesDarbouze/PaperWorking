import { bridgeGuardrail } from '../bridgeGuardrail';
import { BridgeQueryBuilder } from '../../utils/BridgeQueryBuilder';

/**
 * 🧪 Bridge API Integration Tests
 * 
 * Uses the automatically approved 'test' dataset to verify OData utilities,
 * geospatial logic, and guardrails against real API responses.
 * 
 * NOTE: Set BRIDGE_API_KEY in your .env or CI secrets to enable these tests.
 */

// Force 'test' dataset for this specific test suite
process.env.BRIDGE_VIRTUAL_DATASET_ID = 'test';

describe('Bridge API Integration (Test Dataset)', () => {
  // Real network requests can be slow
  jest.setTimeout(30000);

  const hasApiKey = !!process.env.BRIDGE_API_KEY;

  if (!hasApiKey) {
    it('skipping integration tests (no BRIDGE_API_KEY)', () => {
      console.warn('⚠️ [TEST] BRIDGE_API_KEY missing. Skipping integration tests.');
    });
    // Exit describe early
    return;
  }

  it('successfully fetches properties from the "test" dataset', async () => {
    const query = new BridgeQueryBuilder().top(5);
    const properties = await bridgeGuardrail.fetchAll(query, 1);

    expect(Array.isArray(properties)).toBe(true);
    expect(properties.length).toBeGreaterThan(0);
    
    const first = properties[0];
    expect(first).toHaveProperty('ListingKey');
    expect(first).toHaveProperty('ListingId');
  });

  it('validates geospatial "near" (radius) queries', async () => {
    // Test dataset typically has properties in the California region
    const testLat = 34.0522;
    const testLon = -118.2437;
    const query = new BridgeQueryBuilder()
      .near(testLat, testLon, 100)
      .top(5);
    
    const properties = await bridgeGuardrail.fetchAll(query, 1);
    expect(Array.isArray(properties)).toBe(true);
  });

  it('validates "intersects" (polygon) queries', async () => {
    const poly = [
      { lat: 34.1, lon: -118.3 },
      { lat: 34.1, lon: -118.2 },
      { lat: 34.0, lon: -118.2 },
      { lat: 34.0, lon: -118.3 }
    ];
    const query = new BridgeQueryBuilder().intersects(poly).top(5);
    
    const properties = await bridgeGuardrail.fetchAll(query, 1);
    // Asserting success (no 400 Bad Request error)
    expect(Array.isArray(properties)).toBe(true);
  });

  it('validates "modifiedSince" (relative time) queries', async () => {
    // Using a large duration (10 years) to ensure match in test data
    const query = new BridgeQueryBuilder().modifiedSince('P10Y').top(5);
    
    const properties = await bridgeGuardrail.fetchAll(query, 1);
    expect(Array.isArray(properties)).toBe(true);
  });

  it('validates quarterly performance (date extraction) filters', async () => {
    const query = new BridgeQueryBuilder().quarter(2023, 1).top(5);
    
    const properties = await bridgeGuardrail.fetchAll(query, 1);
    expect(Array.isArray(properties)).toBe(true);
  });

  it('successfully traverses multi-page OData results (pagination)', async () => {
    // Requesting very small pages to force nextLink traversal
    const query = new BridgeQueryBuilder().top(2);
    const properties = await bridgeGuardrail.fetchAll(query, 2);

    expect(properties.length).toBeGreaterThan(2); 
  });
});
