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

  // Development / demo fallback
  return {
    mls_id: listingId,
    address: '221B Baker St, London, NW1 6XE',
    beds: 3,
    baths: 2.5,
    sqft: 1850,
    lotSize: 0.15,
    yearBuilt: 1890,
    price: 45000000,
    status: 'Listed',
    description: 'A historic residence with classic Victorian architecture.',
    photos: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200',
    ],
  };
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
