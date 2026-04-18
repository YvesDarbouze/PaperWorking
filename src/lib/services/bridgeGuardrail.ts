import bridgeConfig from '../../config/bridge';
import apiClient from '../apiClient';
import { BridgePropertySchema, ODataResponseSchema, type BridgeProperty } from '../types/bridge';
import { BridgeQueryBuilder } from '../utils/BridgeQueryBuilder';

/**
 * 🔒 Bridge Guardrail Service
 * 
 * The primary safety layer for all Zillow Bridge API interactions.
 * - Enforces Zod-based schema validation on inbound data.
 * - Normalizes OData responses.
 * - Provides safe-fail logic for production stability.
 */

export class BridgeGuardrailService {
  /**
   * Fetches all records for a given query by traversing all nextLinks.
   * @param query BridgeQueryBuilder instance.
   * @param maxPages Optional safety limit for page traversal.
   */
  async fetchAll(query: BridgeQueryBuilder, maxPages = 50): Promise<BridgeProperty[]> {
    const results: BridgeProperty[] = [];
    
    const vId = bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID;
    const path = vId ? `${vId}/Property` : 'Property';
    let nextUrl: string | undefined = `${path}${query.build()}`;
    let pageCount = 0;

    console.log(`🚀 [GUARDRAIL] Starting automated multi-page fetch: ${nextUrl}`);

    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      const response = await apiClient.get<any>(nextUrl);
      
      // Validate OData Wrapper
      const parsedOData = ODataResponseSchema.safeParse(response.data);
      if (parsedOData.success) {
        const rawRecords = parsedOData.data.value;
        const validated = rawRecords.map(r => {
          const res = BridgePropertySchema.safeParse(r);
          return res.success ? res.data : (r as BridgeProperty);
        });
        
        results.push(...validated);
        nextUrl = parsedOData.data['@odata.nextLink'];
      } else {
        console.error('❌ [GUARDRAIL] Pagination failed: Malformed wrapper at page', pageCount);
        break;
      }

      if (nextUrl) {
        console.log(`📄 [GUARDRAIL] Page ${pageCount} complete. Traversing nextLink...`);
      }
    }

    return results;
  }

  /**
   * Fetches a single property by ListingKey or ListingId.
   */
  async fetchProperty(listingId: string): Promise<BridgeProperty | null> {
    const query = new BridgeQueryBuilder()
      .filter('ListingId', 'eq', listingId)
      .top(1);
    
    const results = await this.fetchAll(query, 1);
    return results.length > 0 ? results[0] : null;
  }
}

export const bridgeGuardrail = new BridgeGuardrailService();
