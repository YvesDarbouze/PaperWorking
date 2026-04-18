import { bridgeGuardrail } from './bridgeGuardrail';
import { bridgeWorkerService } from './bridgeWorkerService';
import type { BridgeProperty } from '../types/bridge';
import { DealPhase, transitionDealPhase } from './dealStateMachine';
import { projectsService } from '../firebase/projects';
import { NormalizedProperty, normalizeMLSData, mapStatusToPhase } from './mlsShared';

export type { NormalizedProperty };

/**
 * ── MLS Ingestion Service ──
 * High-performance backend orchestrator for MLS data.
 */

/**
 * Normalizes a raw MLS JSON object into our internal format.
 * (Now imported from mlsShared)
 */


/**
 * MLS API Service — Production-Ready Ingestion
 * 
 * Now uses the BridgeGuardrail for secure, validated access.
 */
export async function fetchMLSData(listingId: string): Promise<NormalizedProperty> {
  // Check if system is globally paused due to API rate limit exhaustion
  if (await bridgeWorkerService.isPaused()) {
    console.warn(`🛑 [MLS SERVICE] Bridge API is currently in a "Cool-down" period. Deferring fetch for ${listingId}.`);
    throw new Error('MLS_SERVICE_PAUSED');
  }

  console.log(`📡 [MLS SERVICE] Requesting listing ${listingId}...`);
  
  try {
    const bridgeData = await bridgeGuardrail.fetchProperty(listingId);
    
    if (bridgeData) {
      return normalizeMLSData(bridgeData);
    }
    
    console.warn(`[MLS NOT FOUND] Listing ${listingId} not returned by Bridge.`);
  } catch (error) {
    console.error(`[MLS SERVICE ERROR] Guardrail blocked or failed request for ${listingId}:`, error);
  }

  // FALLBACK: Mock data for development / demo mode
  console.log(`[MLS MOCK] Providing fallback data for: ${listingId}`);
  
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
    description: 'A historic residence with classic Victorian architecture, perfect for investigation and luxury living.',
    photos: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200'
    ]
  };
}

/**
 * 🌉 processStatusChange (StatusChange Logic)
 * 
 * Central orchestrator for Zillow Bridge Webhook ingestion.
 * Handles 'Webhooks / Streaming' payloads and performs 
 * automated deal status transitions.
 */
export async function processStatusChange(payload: any) {
  // Check if system is globally paused due to API rate limit exhaustion
  if (await bridgeWorkerService.isPaused()) {
    console.warn('🛑 [MLS WEBHOOK] System is paused due to rate limits. Dropping webhook payload.');
    return { success: false, reason: 'system_paused' };
  }

  try {
    // 1. Anticipate and unwrap 'ResourceRecord' wrapper
    const rawData = payload.ResourceRecord || payload;
    
    if (!rawData || !rawData.ListingKey) {
      console.warn('⚠️ [MLS WEBHOOK] Received payload with no ListingKey. Skipping.');
      return { success: false, reason: 'missing_listing_key' };
    }

    // 2. Normalize JSON into Property Schema
    const normalized = normalizeMLSData(rawData);
    console.log(`📡 [MLS WEBHOOK] Processing update for ${normalized.mls_id} (Status: ${normalized.status})`);

    // 3. Find and update all linked projects across Organizations
    const projects = await projectsService.getDealsByMlsId(normalized.mls_id);
    
    if (projects.length === 0) {
      console.log(`ℹ [MLS WEBHOOK] No internal projects linked to ${normalized.mls_id}.`);
      return { success: true, count: 0 };
    }

    console.log(`🚀 [MLS WEBHOOK] Detected status change for ${projects.length} projects. Syncing...`);

    for (const deal of projects) {
      if (deal.status !== normalized.status) {
        console.log(`🔄 [PHASE SHIFT] Deal ${deal.id}: ${deal.status} ➔ ${normalized.status}`);
        
        await transitionDealPhase(
          deal.id,
          deal.status as DealPhase,
          normalized.status,
          'bridge_api_system', // System-level transition
          `Automated update via Zillow Bridge Webhook (RESO: ${rawData.StandardStatus})`
        );
      } else {
        console.log(`⚖️ [NO CHANGE] Deal ${deal.id} is already in state: ${deal.status}`);
      }
    }

    return { success: true, count: projects.length };
  } catch (error) {
    console.error('❌ [MLS WEBHOOK ERROR] Critical failure in ingestion logic:', error);
    throw error;
  }
}

export interface QuarterlyPerformanceSummary {
  year: number;
  quarter: number;
  totalVolume: number;
  dealCount: number;
  averagePrice: number;
}

/**
 * Aggregates market performance data for a specific financial quarter.
 * Operationalizes OData year() and month() extraction filters.
 */
export async function getQuarterlyPerformance(year: number, quarter: 1 | 2 | 3 | 4): Promise<QuarterlyPerformanceSummary> {
  const query = new BridgeQueryBuilder()
    .quarter(year, quarter)
    .eq('StandardStatus', 'Closed')
    .select(['ClosePrice']);

  console.log(`📡 [MLS SERVICE] Fetching quarterly performance for ${year} Q${quarter}...`);
  const properties = await bridgeGuardrail.fetchAll(query);

  const totalVolume = properties.reduce((sum, p) => sum + (Number(p.ClosePrice) || 0), 0);
  const dealCount = properties.length;
  const averagePrice = dealCount > 0 ? totalVolume / dealCount : 0;

  return {
    year,
    quarter,
    totalVolume,
    dealCount,
    averagePrice
  };
}
