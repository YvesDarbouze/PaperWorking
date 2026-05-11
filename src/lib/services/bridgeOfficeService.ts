import apiClient from '../apiClient';
import bridgeConfig from '../../config/bridge';
import { BridgeOfficeSchema, ODataResponseSchema, type BridgeOffice } from '../types/bridge';
import { bridgeWorkerService } from './bridgeWorkerService';

/**
 * 🏢 BridgeOfficeService
 *
 * Queries the RESO Office resource from Bridge Interactive.
 * OData endpoint: /{dataset}/Office
 *
 * Ref: https://bridgedataoutput.com/docs/platform/
 */
class BridgeOfficeService {
  private readonly COLLECTION = 'Office';

  private get basePath(): string {
    const vId = bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID;
    return vId ? `${vId}/${this.COLLECTION}` : this.COLLECTION;
  }

  /**
   * Search offices by name.
   */
  async searchOffices(name: string, top = 10): Promise<BridgeOffice[]> {
    if (await bridgeWorkerService.isPaused()) {
      throw new Error('BRIDGE_SERVICE_PAUSED');
    }

    const filter = `contains(tolower(OfficeName),'${name.toLowerCase().replace(/'/g, "''")}')`;
    const select = [
      'OfficeKey', 'OfficeMlsId', 'OfficeName', 'OfficePhone', 'OfficeEmail',
      'OfficeAddress1', 'OfficeCity', 'OfficeStateOrProvince', 'OfficePostalCode',
      'OfficeType', 'OfficeStatus', 'ModificationTimestamp',
    ].join(',');

    try {
      const response = await apiClient.get(this.basePath, {
        params: {
          '$filter': filter,
          '$select': select,
          '$top': top,
          '$orderby': 'OfficeName asc',
        },
      });

      const parsed = ODataResponseSchema.safeParse(response.data);
      if (!parsed.success) return [];

      return parsed.data.value.map(r => {
        const res = BridgeOfficeSchema.safeParse(r);
        return res.success ? res.data : (r as BridgeOffice);
      });
    } catch (error) {
      console.error('❌ [BRIDGE OFFICE SERVICE] Search failed:', error);
      throw error;
    }
  }

  /**
   * Fetch a single office by OfficeKey.
   */
  async getOffice(officeKey: string): Promise<BridgeOffice | null> {
    if (await bridgeWorkerService.isPaused()) {
      throw new Error('BRIDGE_SERVICE_PAUSED');
    }

    try {
      const response = await apiClient.get(`${this.basePath}('${officeKey}')`);
      const res = BridgeOfficeSchema.safeParse(response.data);
      return res.success ? res.data : (response.data as BridgeOffice);
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) return null;
      console.error(`❌ [BRIDGE OFFICE SERVICE] Failed to fetch office ${officeKey}:`, error);
      throw error;
    }
  }

  /**
   * Fetch agents belonging to a specific office.
   * Queries the Member resource filtered by OfficeKey.
   */
  async getOfficeAgents(officeKey: string, top = 50): Promise<any[]> {
    const vId = bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID;
    const path = vId ? `${vId}/Member` : 'Member';
    const filter = `OfficeKey eq '${officeKey.replace(/'/g, "''")}'`;
    const select = [
      'MemberKey', 'MemberFullName', 'MemberEmail', 'MemberDirectPhone',
      'MemberStateLicense', 'Media',
    ].join(',');

    try {
      const response = await apiClient.get(path, {
        params: {
          '$filter': filter,
          '$select': select,
          '$top': top,
          '$orderby': 'MemberFullName asc',
        },
      });
      return response.data?.value || [];
    } catch (error) {
      console.error(`❌ [BRIDGE OFFICE SERVICE] Failed to fetch agents for office ${officeKey}:`, error);
      throw error;
    }
  }
}

export const bridgeOfficeService = new BridgeOfficeService();
