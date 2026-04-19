import apiClient from '../apiClient';
import { 
  MarketReportSchema, 
  ZGEconResponseSchema,
  type MarketReport 
} from '../types/economicData';

/**
 * 📉 EconomicDataService
 * 
 * Specialized service for Zillow Group Economic Data (ZGEcon).
 * Provides macro-economic indicators for high-level market analysis.
 */
export class EconomicDataService {
  private readonly MARKET_REPORT_ENDPOINT = '/zgecon/marketreport';

  /**
   * Fetches the macro market report for a specific state.
   * @param stateCodeFips The 2-digit FIPS code for the state (e.g., '06' for California).
   */
  async fetchMarketReport(stateCodeFips: string): Promise<MarketReport[]> {
    if (!stateCodeFips) {
      throw new Error('❌ [ECONOMIC DATA] stateCodeFips is required.');
    }

    console.log(`📡 [ECONOMIC DATA] Fetching market report for state FIPS: ${stateCodeFips}`);

    const response = await apiClient.get<any>(this.MARKET_REPORT_ENDPOINT, {
      params: { 
        stateCodeFIPS: stateCodeFips
      }
    });

    // ZGEcon often returns results in a wrapper
    const parsed = ZGEconResponseSchema.parse(response.data);
    return parsed.results.map(r => MarketReportSchema.parse(r));
  }
}

export const economicDataService = new EconomicDataService();
