import apiClient from '../apiClient';
import bridgeConfig from '../../config/bridge';
import { BridgeMemberSchema, ODataResponseSchema, type BridgeMember } from '../types/bridge';
import { BridgeQueryBuilder } from '../utils/BridgeQueryBuilder';
import { bridgeWorkerService } from './bridgeWorkerService';

/**
 * 🧑‍💼 BridgeAgentService
 *
 * Queries the RESO Member resource (agents) from Bridge Interactive.
 * OData endpoint: /{dataset}/Member
 *
 * Ref: https://bridgedataoutput.com/docs/platform/
 */
class BridgeAgentService {
  private readonly COLLECTION = 'Member';

  private get basePath(): string {
    const vId = bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID;
    return vId ? `${vId}/${this.COLLECTION}` : this.COLLECTION;
  }

  /**
   * Search agents by name.
   * Uses case-insensitive 'contains' for flexible typeahead.
   */
  async searchAgents(name: string, top = 10): Promise<BridgeMember[]> {
    if (await bridgeWorkerService.isPaused()) {
      throw new Error('BRIDGE_SERVICE_PAUSED');
    }

    const filter = `contains(tolower(MemberFullName),'${name.toLowerCase().replace(/'/g, "''")}')`;
    const select = [
      'MemberKey', 'MemberMlsId', 'MemberFirstName', 'MemberLastName',
      'MemberFullName', 'MemberEmail', 'MemberDirectPhone', 'MemberMobilePhone',
      'MemberStateLicense', 'MemberDesignation',
      'OfficeName', 'OfficeKey', 'OfficeMlsId',
      'Media', 'ModificationTimestamp',
    ].join(',');

    try {
      const response = await apiClient.get(this.basePath, {
        params: {
          '$filter': filter,
          '$select': select,
          '$top': top,
          '$orderby': 'MemberFullName asc',
        },
      });

      const parsed = ODataResponseSchema.safeParse(response.data);
      if (!parsed.success) return [];

      return parsed.data.value.map(r => {
        const res = BridgeMemberSchema.safeParse(r);
        return res.success ? res.data : (r as BridgeMember);
      });
    } catch (error) {
      console.error('❌ [BRIDGE AGENT SERVICE] Search failed:', error);
      throw error;
    }
  }

  /**
   * Fetch a single agent by MemberKey.
   */
  async getAgent(memberKey: string): Promise<BridgeMember | null> {
    if (await bridgeWorkerService.isPaused()) {
      throw new Error('BRIDGE_SERVICE_PAUSED');
    }

    try {
      const response = await apiClient.get(`${this.basePath}('${memberKey}')`);
      const res = BridgeMemberSchema.safeParse(response.data);
      return res.success ? res.data : (response.data as BridgeMember);
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) return null;
      console.error(`❌ [BRIDGE AGENT SERVICE] Failed to fetch member ${memberKey}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all active listings by a specific agent's MemberKey.
   * Queries Property with ListAgentKey filter.
   */
  async getAgentListings(memberKey: string, top = 25): Promise<any[]> {
    const query = new BridgeQueryBuilder()
      .filter('ListAgentKey', 'eq', memberKey)
      .top(top)
      .select([
        'ListingKey', 'ListingId', 'UnparsedAddress', 'ListPrice',
        'BedroomsTotal', 'BathroomsFull', 'LivingArea', 'StandardStatus', 'Media',
      ])
      .orderBy('ListPrice', 'desc');

    const vId = bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID;
    const path = vId ? `${vId}/Property` : 'Property';

    try {
      const response = await apiClient.get(`${path}${query.build()}`);
      return response.data?.value || [];
    } catch (error) {
      console.error(`❌ [BRIDGE AGENT SERVICE] Failed to fetch listings for ${memberKey}:`, error);
      throw error;
    }
  }
}

export const bridgeAgentService = new BridgeAgentService();
