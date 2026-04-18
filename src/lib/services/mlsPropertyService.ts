import { zillowAuthService } from './zillowAuthService';
import { BridgeQueryBuilder } from '../utils/BridgeQueryBuilder';

/**
 * 🏠 MLS Property Service
 * 
 * Handles real-time property data fetching from Zillow Bridge. 
 * Implements automated pagination traversal via @odata.nextLink.
 */

interface ODataResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export class MlsPropertyService {
  private readonly BASE_URL = 'https://api.bridgeinteractive.com/v2/pub/realtymls/Property';
  private readonly DEFAULT_MAX_PAGES = 50;

  /**
   * Fetches all records for a given query by traversing all nextLinks.
   * @param query BridgeQueryBuilder instance.
   * @param maxPages Optional safety limit for page traversal.
   */
  async fetchAll<T>(query: BridgeQueryBuilder, maxPages = this.DEFAULT_MAX_PAGES): Promise<T[]> {
    const results: T[] = [];
    let nextUrl: string | undefined = `${this.BASE_URL}${query.build()}`;
    let pageCount = 0;

    console.log(`🚀 Starting automated fetch for: ${nextUrl}`);

    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      const response = await this.fetchPage<T>(nextUrl);
      
      results.push(...response.value);
      
      const nextLink = response['@odata.nextLink'];
      
      if (nextLink) {
        console.log(`📄 Page ${pageCount} complete. Moving to next page...`);
        nextUrl = nextLink;
      } else {
        console.log(`✅ All pages retrieved. Total records: ${results.length}`);
        nextUrl = undefined;
      }
    }

    if (pageCount >= maxPages && nextUrl) {
      console.warn(`⚠️ Reached maxPages limit (${maxPages}). Some records may have been truncated.`);
    }

    return results;
  }

  /**
   * Fetches a single page of results.
   */
  private async fetchPage<T>(url: string): Promise<ODataResponse<T>> {
    const token = await zillowAuthService.getAccessToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Bridge API Request Failed:', errorBody);
      throw new Error(`Bridge API request failed with status ${response.status}`);
    }

    return (await response.json()) as ODataResponse<T>;
  }

  /**
   * Convenience method to fetch a single property by its ListingId.
   */
  async getPropertyByListingId<T>(listingId: string): Promise<T | null> {
    const query = new BridgeQueryBuilder()
      .filter('ListingId', 'eq', listingId)
      .top(1);
    
    const results = await this.fetchAll<T>(query, 1);
    return results.length > 0 ? results[0] : null;
  }
}

// Export a singleton instance
export const mlsPropertyService = new MlsPropertyService();
