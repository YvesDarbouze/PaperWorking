import { BridgeQueryBuilder } from '../utils/BridgeQueryBuilder';
import { bridgeGuardrail } from './bridgeGuardrail';
import { bridgeWorkerService } from './bridgeWorkerService';
import { NormalizedProperty, normalizeMLSData } from './mlsShared';

export type { NormalizedProperty };
export { normalizeMLSData } from './mlsShared';

// processStatusChange moved to webhookProcessor — re-exported for backwards compat.
export { processWebhookPayload as processStatusChange } from './webhookProcessor';

export async function fetchMLSData(listingId: string): Promise<NormalizedProperty> {
  if (await bridgeWorkerService.isPaused()) {
    throw new Error('MLS_SERVICE_PAUSED');
  }

  try {
    const bridgeData = await bridgeGuardrail.fetchProperty(listingId);
    if (bridgeData) return normalizeMLSData(bridgeData);
    console.warn(`[MLS NOT FOUND] Listing ${listingId} not returned by Bridge.`);
  } catch (error) {
    console.error(`[MLS SERVICE ERROR] ${listingId}:`, error);
  }

  throw new Error(`[MLS NOT FOUND] Listing ${listingId} not returned by Bridge.`);
}

export interface QuarterlyPerformanceSummary {
  year: number;
  quarter: number;
  totalVolume: number;
  dealCount: number;
  averagePrice: number;
}

export async function getQuarterlyPerformance(year: number, quarter: 1 | 2 | 3 | 4): Promise<QuarterlyPerformanceSummary> {
  const query = new BridgeQueryBuilder()
    .quarter(year, quarter)
    .filter('StandardStatus', 'eq', 'Closed')
    .select(['ClosePrice']);

  const properties = await bridgeGuardrail.fetchAll(query);

  const totalVolume = properties.reduce((sum, p) => sum + (Number(p.ClosePrice) || 0), 0);
  const dealCount = properties.length;

  return {
    year,
    quarter,
    totalVolume,
    dealCount,
    averagePrice: dealCount > 0 ? totalVolume / dealCount : 0,
  };
}
