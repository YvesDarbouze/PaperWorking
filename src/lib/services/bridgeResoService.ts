import apiClient from '../apiClient';
import { BridgeQueryBuilder } from '../utils/BridgeQueryBuilder';
import { bridgeWorkerService } from './bridgeWorkerService';
import { ODataMetadataParser } from '../utils/ODataMetadataParser';
import { BridgeFeedHandler } from '../utils/BridgeFeedHandler';

/**
 * 🌉 BridgeResoService
 * 
 * The primary transport layer for standard MLS listing data.
 * Targets the RESO-compliant OData v2 endpoint and leverages the 
 * circuit-breaker protected apiClient.
 */
class BridgeResoService {
  private readonly PROPERTY_COLLECTION = 'Property';

  /**
   * Fetches a single property by its ListingKey or ListingId.
   */
  async getProperty(listingId: string): Promise<any | null> {
    if (await bridgeWorkerService.isPaused()) {
      throw new Error('BRIDGE_SERVICE_PAUSED');
    }

    const query = new BridgeQueryBuilder()
      .filter('ListingId', 'eq', listingId)
      .top(1)
      .build();

    try {
      const response = await apiClient.get(`${this.PROPERTY_COLLECTION}${query}`);
      const data = response.data?.value;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error(`❌ [BRIDGE RESO SERVICE] Failed to fetch property ${listingId}:`, error);
      throw error;
    }
  }

  /**
   * Performs a filtered search across the Property collection.
   * @param queryBuilder An instance of BridgeQueryBuilder.
   */
  async searchProperties(queryBuilder: BridgeQueryBuilder): Promise<any[]> {
    if (await bridgeWorkerService.isPaused()) {
      throw new Error('BRIDGE_SERVICE_PAUSED');
    }

    const queryString = queryBuilder.build();
    
    try {
      const response = await apiClient.get(`${this.PROPERTY_COLLECTION}${queryString}`);
      const results = response.data?.value || [];
      
      // Perform automated license audit
      BridgeFeedHandler.logSourceBreakdown(results);
      
      return results;
    } catch (error) {
      console.error('❌ [BRIDGE RESO SERVICE] Property search failed:', error);
      throw error;
    }
  }

  /**
   * Performs a geospatial search to find properties within a specific radius.
   * @param lat Latitude of the center point.
   * @param lon Longitude of the center point.
   * @param radiusInMiles The search radius in miles.
   */
  async findNearbyProperties(lat: number, lon: number, radiusInMiles: number): Promise<any[]> {
    const query = new BridgeQueryBuilder()
      .near(lat, lon, radiusInMiles);
    
    return this.searchProperties(query);
  }

  /**
   * 🔄 Automated Pagination Handler (On-Demand)
   * 
   * Traverses all records for a query using $top (200) and $skip offset.
   * Continues fetching until the response returns fewer than 200 records.
   */
  async fetchAll(queryBuilder: BridgeQueryBuilder, maxSafetyLimit = 5000): Promise<any[]> {
    const allRecords: any[] = [];
    let skip = 0;
    const pageSize = 200;
    let hasMore = true;

    console.log('🚀 [BRIDGE RESO SERVICE] Starting automated fetch sequence...');

    while (hasMore && allRecords.length < maxSafetyLimit) {
      // Respect Circuit Breaker
      if (await bridgeWorkerService.isPaused()) {
        console.warn('🛑 [PAGINATION] Circuit breaker tripped. Halting fetch sequence.');
        break;
      }

      // Clone builder or update parameters for the current page
      queryBuilder.top(pageSize).skip(skip);
      
      try {
        const page = await this.searchProperties(queryBuilder);
        allRecords.push(...page);
        
        console.log(`📄 [PAGINATION] Retrieved ${page.length} records. Total: ${allRecords.length}. Offset: ${skip}`);

        if (page.length < pageSize) {
          hasMore = false;
          console.log('✅ [PAGINATION] End of dataset reached.');
        } else {
          skip += pageSize;
        }
      } catch (error) {
        console.error('❌ [PAGINATION ERROR] Failed to fetch page at offset:', skip, error);
        throw error;
      }
    }

    // Audit the total combined result set
    if (allRecords.length > 200) {
      console.log('📊 [PAGINATION] Final audit for combined results:');
      BridgeFeedHandler.logSourceBreakdown(allRecords);
    }

    return allRecords;
  }

  /**
   * Fetches the raw metadata for the OData service definition ($metadata).
   * Useful for auditing available fields and resource collections.
   */
  async getMetadata(): Promise<string> {
    try {
      const response = await apiClient.get('$metadata', { responseType: 'text' });
      return response.data;
    } catch (error) {
      console.error('❌ [BRIDGE RESO SERVICE] Failed to fetch OData metadata:', error);
      throw error;
    }
  }

  /**
   * Returns a structured list of all fields granted by the MLS.
   * Leverages the ODataMetadataParser to analyze the service definition.
   */
  async getAccessibleFields(): Promise<string[]> {
    try {
      const xml = await this.getMetadata();
      return ODataMetadataParser.extractPropertyFields(xml);
    } catch (error) {
      console.error('❌ [BRIDGE RESO SERVICE] Metadata field extraction failed:', error);
      return [];
    }
  }
}

export const bridgeResoService = new BridgeResoService();
