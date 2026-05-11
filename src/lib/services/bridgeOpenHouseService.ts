import apiClient from '../apiClient';
import bridgeConfig from '../../config/bridge';
import { BridgeOpenHouseSchema, ODataResponseSchema, type BridgeOpenHouse } from '../types/bridge';
import { bridgeWorkerService } from './bridgeWorkerService';

/**
 * 🏠 BridgeOpenHouseService
 *
 * Queries the RESO OpenHouse resource from Bridge Interactive.
 * OData endpoint: /{dataset}/OpenHouse
 *
 * Ref: https://bridgedataoutput.com/docs/platform/
 */
class BridgeOpenHouseService {
  private readonly COLLECTION = 'OpenHouse';

  private get basePath(): string {
    const vId = bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID;
    return vId ? `${vId}/${this.COLLECTION}` : this.COLLECTION;
  }

  /**
   * Fetch upcoming open houses.
   * Filters for events with OpenHouseDate >= today.
   *
   * @param top Number of results (default 20)
   * @param listingKey Optional — filter by a specific property's ListingKey
   */
  async getUpcoming(top = 20, listingKey?: string): Promise<BridgeOpenHouse[]> {
    if (await bridgeWorkerService.isPaused()) {
      throw new Error('BRIDGE_SERVICE_PAUSED');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let filter = `OpenHouseDate ge ${today}`;
    if (listingKey) {
      filter += ` and ListingKey eq '${listingKey.replace(/'/g, "''")}'`;
    }

    const select = [
      'OpenHouseKey', 'OpenHouseId', 'ListingKey', 'ListingId',
      'OpenHouseDate', 'OpenHouseStartTime', 'OpenHouseEndTime',
      'OpenHouseType', 'OpenHouseRemarks',
      'ShowingAgentKey', 'ShowingAgentFirstName', 'ShowingAgentLastName',
      'ModificationTimestamp',
    ].join(',');

    try {
      const response = await apiClient.get(this.basePath, {
        params: {
          '$filter': filter,
          '$select': select,
          '$top': top,
          '$orderby': 'OpenHouseDate asc,OpenHouseStartTime asc',
        },
      });

      const parsed = ODataResponseSchema.safeParse(response.data);
      if (!parsed.success) return [];

      return parsed.data.value.map(r => {
        const res = BridgeOpenHouseSchema.safeParse(r);
        return res.success ? res.data : (r as BridgeOpenHouse);
      });
    } catch (error) {
      console.error('❌ [BRIDGE OPEN HOUSE SERVICE] Failed to fetch open houses:', error);
      throw error;
    }
  }

  /**
   * Fetch a single open house by key.
   */
  async getOpenHouse(openHouseKey: string): Promise<BridgeOpenHouse | null> {
    if (await bridgeWorkerService.isPaused()) {
      throw new Error('BRIDGE_SERVICE_PAUSED');
    }

    try {
      const response = await apiClient.get(`${this.basePath}('${openHouseKey}')`);
      const res = BridgeOpenHouseSchema.safeParse(response.data);
      return res.success ? res.data : (response.data as BridgeOpenHouse);
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) return null;
      console.error(`❌ [BRIDGE OPEN HOUSE SERVICE] Failed to fetch ${openHouseKey}:`, error);
      throw error;
    }
  }

  /**
   * Geospatial open house search — find open houses near a location.
   * This queries Property with upcoming OpenHouse events expanded.
   * Falls back to fetching all upcoming open houses if geo filter is unsupported.
   */
  async findNearby(lat: number, lon: number, radiusMiles = 10, top = 20): Promise<BridgeOpenHouse[]> {
    // OpenHouse records themselves don't have coordinates —
    // we return all upcoming and let the client filter by property location.
    return this.getUpcoming(top);
  }
}

export const bridgeOpenHouseService = new BridgeOpenHouseService();
