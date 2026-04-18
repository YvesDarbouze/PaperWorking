import apiClient from '../apiClient';
import { z } from 'zod';

/**
 * 🏠 ZestimatesService
 * 
 * Provides official Zillow valuation data (Zestimates) for the PaperWorking ecosystem.
 * Targets: https://api.bridgedataoutput.com/api/v2/zestimates_v2/zestimates
 * 
 * Requirement: Prompt 31 from the Zillow Bridge API integration suite.
 */

export const ZestimateResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  bundle: z.array(z.object({
    zpid: z.string().optional(),
    zestimate: z.number().optional(),
    rentZestimate: z.number().optional(),
    address: z.object({
      full: z.string()
    }).optional()
  })).optional()
});

export type ZestimateResponse = z.infer<typeof ZestimateResponseSchema>;

export class ZestimatesService {
  private readonly ENDPOINT = '/zestimates_v2/zestimates';

  /**
   * Retrieves the current Zillow valuation for a specific property address.
   * Documentation requires either 'zpid' or 'address.full'. 
   * This implementation focuses on 'address.full' for flexible deal analysis.
   */
  async fetchZestimate(address: string): Promise<ZestimateResponse> {
    if (!address) {
      throw new Error('❌ [ZESTIMATES SERVICE] Property address is required.');
    }

    console.log(`📡 [ZESTIMATES] Requesting proprietary valuation for: ${address}`);

    try {
      const response = await apiClient.get<ZestimateResponse>(this.ENDPOINT, {
        params: { 
          'address.full': address 
        }
      });

      return ZestimateResponseSchema.parse(response.data);
    } catch (error) {
      console.error(`❌ [ZESTIMATES SERVICE] Failed to fetch valuation for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Alternative fetch using the unique Zillow Property ID (zpid).
   */
  async fetchByZpid(zpid: string): Promise<ZestimateResponse> {
    if (!zpid) {
      throw new Error('❌ [ZESTIMATES SERVICE] zpid is required.');
    }

    const response = await apiClient.get<ZestimateResponse>(this.ENDPOINT, {
      params: { zpid }
    });

    return ZestimateResponseSchema.parse(response.data);
  }
}

export const zestimatesService = new ZestimatesService();
