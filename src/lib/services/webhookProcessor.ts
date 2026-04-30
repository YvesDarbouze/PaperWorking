/**
 * src/lib/services/webhookProcessor.ts
 *
 * Handles Bridge Interactive webhook payloads (RESO OData status-change events).
 * Extracted from mlsService.ts so it can be tested and consumed independently.
 *
 * Single responsibility: validate incoming payload → update linked projects.
 */

import { bridgeWorkerService } from './bridgeWorkerService';
import { DealPhase, transitionDealPhase } from './dealStateMachine';
import { projectsService } from '../firebase/projects';
import { normalizeMLSData } from './mlsShared';

export interface WebhookResult {
  success: boolean;
  count?: number;
  reason?: string;
}

/**
 * Processes a single Bridge webhook payload.
 *
 * Anticipates the RESO 'ResourceRecord' wrapper. Finds every internal
 * project linked to the affected ListingKey and transitions them if the
 * MLS status has changed.
 */
export async function processWebhookPayload(payload: unknown): Promise<WebhookResult> {
  if (await bridgeWorkerService.isPaused()) {
    console.warn('🛑 [WEBHOOK PROCESSOR] System paused due to rate limits. Dropping payload.');
    return { success: false, reason: 'system_paused' };
  }

  const rawData = (payload as any)?.ResourceRecord ?? payload;

  if (!rawData || !(rawData as any).ListingKey) {
    console.warn('⚠️ [WEBHOOK PROCESSOR] Payload missing ListingKey. Skipping.');
    return { success: false, reason: 'missing_listing_key' };
  }

  const normalized = normalizeMLSData(rawData);
  console.log(`📡 [WEBHOOK PROCESSOR] Processing ${normalized.mls_id} → status: ${normalized.status}`);

  const projects = await projectsService.getDealsByMlsId(normalized.mls_id);

  if (projects.length === 0) {
    console.log(`ℹ️ [WEBHOOK PROCESSOR] No projects linked to ${normalized.mls_id}.`);
    return { success: true, count: 0 };
  }

  for (const deal of projects) {
    if (deal.status !== normalized.status) {
      console.log(`🔄 [WEBHOOK PROCESSOR] Deal ${deal.id}: ${deal.status} → ${normalized.status}`);
      await transitionDealPhase(
        deal.id,
        deal.status as DealPhase,
        normalized.status,
        'bridge_api_system',
        `Automated update via Bridge webhook (RESO: ${rawData.StandardStatus})`
      );
    }
  }

  return { success: true, count: projects.length };
}
