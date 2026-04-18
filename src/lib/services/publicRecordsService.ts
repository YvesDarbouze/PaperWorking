import apiClient from '../apiClient';
import { 
  BridgeParcelSchema, 
  BridgeAssessmentSchema, 
  BridgePublicResponseSchema,
  type BridgeParcel, 
  type BridgeAssessment 
} from '../types/publicRecords';

/**
 * 🏛️ PublicRecordsService
 * 
 * Specialized service for interacting with Bridge /pub endpoints.
 * - Targeted for parcels and tax assessments.
 * - Uses limit/offset pagination (OData NOT supported).
 */
export class PublicRecordsService {
  private readonly PARCELS_ENDPOINT = '/pub/parcels';
  private readonly ASSESSMENTS_ENDPOINT = '/pub/assessments';

  /**
   * Fetches parcel records using limit/offset pagination.
   * @param limit Max records (capped at 200).
   * @param offset Starting point for results.
   */
  async fetchParcels(limit = 200, offset = 0): Promise<{ parcels: BridgeParcel[]; totalCount: number }> {
    const finalLimit = Math.min(limit, 200);
    
    console.log(`📡 [PUBLIC RECORDS] Fetching parcels: offset=${offset}, limit=${finalLimit}`);

    const response = await apiClient.get<any>(this.PARCELS_ENDPOINT, {
      params: { limit: finalLimit, offset }
    });

    const parsed = BridgePublicResponseSchema.parse(response.data);
    const parcels = parsed.results.map(r => BridgeParcelSchema.parse(r));

    return {
      parcels,
      totalCount: parsed.totalCount || 0
    };
  }

  /**
   * Fetches tax assessments for a specific property.
   * Requires either zpid or addressFull.
   */
  async fetchAssessments(params: { zpid?: string; addressFull?: string }): Promise<BridgeAssessment[]> {
    const { zpid, addressFull } = params;

    if (!zpid && !addressFull) {
      throw new Error('❌ [PUBLIC RECORDS] Either zpid or addressFull is required for assessments.');
    }

    const queryParams: Record<string, string> = {};
    if (zpid) queryParams['zpid'] = zpid;
    if (addressFull) queryParams['address.full'] = addressFull;

    console.log(`📡 [PUBLIC RECORDS] Fetching assessments for: ${zpid || addressFull}`);

    const response = await apiClient.get<any>(this.ASSESSMENTS_ENDPOINT, {
      params: queryParams
    });

    const parsed = BridgePublicResponseSchema.parse(response.data);
    return parsed.results.map(r => BridgeAssessmentSchema.parse(r));
  }

  /**
   * Fetches transaction history for a specific parcel.
   * Targets /pub/parcels/{id}/transactions.
   */
  async fetchTransactions(parcelId: string): Promise<BridgeTransaction[]> {
    if (!parcelId) {
      throw new Error('❌ [PUBLIC RECORDS] parcelId is required for transaction history.');
    }

    const endpoint = `${this.PARCELS_ENDPOINT}/${parcelId}/transactions`;
    console.log(`📡 [PUBLIC RECORDS] Fetching transactions for parcel: ${parcelId}`);

    const response = await apiClient.get<any>(endpoint);
    
    // Transactions often return a list in a non-OData 'results' wrapper
    const parsed = BridgePublicResponseSchema.parse(response.data);
    return parsed.results.map(r => BridgeTransactionSchema.parse(r));
  }

  /**
   * Convenience method to fetch ALL parcels by iterating through batches.
   * WARNING: Use only for targeted areas to avoid large request counts.
   */
  async fetchAllParcels(maxRecords = 1000): Promise<BridgeParcel[]> {
    const allParcels: BridgeParcel[] = [];
    let currentOffset = 0;
    const batchSize = 200;

    while (allParcels.length < maxRecords) {
      const { parcels, totalCount } = await this.fetchParcels(batchSize, currentOffset);
      
      if (parcels.length === 0) break;
      
      allParcels.push(...parcels);
      currentOffset += batchSize;

      if (currentOffset >= (totalCount || maxRecords)) break;
    }

    return allParcels;
  }
}

export const publicRecordsService = new PublicRecordsService();
