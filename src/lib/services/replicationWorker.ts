import apiClient from '../apiClient';
import prisma from '../prisma';
import { getReplicationDatasetId } from '../../config/bridge';
import { bridgeWorkerService } from './bridgeWorkerService';
import { BridgeFeedHandler, BridgeRecord } from '../utils/BridgeFeedHandler';
import { BridgeRateLimitError, BridgeServerError } from '../types/errors';
import { ingestRecords } from './propertyIngestor';

const MAX_RETRIES = 3;

function retryDelayMs(error: unknown, attempt: number): number {
  if (error instanceof BridgeRateLimitError && error.resetAt) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return Math.max((error.resetAt - nowSeconds) * 1000, 1000);
  }
  const cap = Math.min(2000 * Math.pow(2, attempt), 60_000);
  return Math.floor(Math.random() * cap);
}

function isRetriable(error: unknown): boolean {
  return error instanceof BridgeRateLimitError || error instanceof BridgeServerError;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<any> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await apiClient.get(url);
    } catch (error) {
      if (!isRetriable(error) || attempt === MAX_RETRIES) throw error;
      const delay = retryDelayMs(error, attempt);
      console.warn(`⏳ [REPLICATION] Retriable error on attempt ${attempt + 1}. Retrying in ${delay}ms.`, (error as Error).message);
      await sleep(delay);
    }
  }
}

/**
 * 🏭 ReplicationWorker
 *
 * Orchestrates MLS data synchronization via the Bridge /Property/replication
 * endpoint. Iterative nextLink traversal avoids call-stack growth on large
 * datasets. Record persistence is delegated to PropertyIngestor.
 */
class ReplicationWorker {
  private readonly MAX_BATCH_SIZE = 2000;

  // Virtual datasets do NOT support /replication per Bridge docs.
  // getReplicationDatasetId() prefers BRIDGE_DATASET_ID (real MLS code).
  private get REPLICATION_ENDPOINT(): string {
    return `${getReplicationDatasetId()}/Property/replication`;
  }

  async sync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    try {
      const state = await prisma.bridgeSyncState.findUnique({
        where: { id: 'replication_watermark' },
      });

      let watermark = state?.mostRecentModificationTimestamp;
      if (!watermark) {
        watermark = new Date();
        watermark.setDate(watermark.getDate() - 30);
      }

      console.log(`🚀 [REPLICATION WORKER] Starting sync from watermark: ${watermark.toISOString()}`);

      const selectFields = [
        'ListingKey', 'ListingId', 'UnparsedAddress', 'BedroomsTotal',
        'BathroomsFull', 'BathroomsHalf', 'LivingArea', 'LotSizeAcres',
        'YearBuilt', 'ListPrice', 'StandardStatus', 'PublicRemarks',
        'Media', 'Coordinates', 'BridgeModificationTimestamp', 'FeedTypes',
      ].join(',');

      const initialUrl = `${this.REPLICATION_ENDPOINT}?$filter=BridgeModificationTimestamp gt ${watermark.toISOString()}&$top=${this.MAX_BATCH_SIZE}&$select=${selectFields}`;

      return await this.runChain(initialUrl);
    } catch (error: any) {
      console.error('❌ [REPLICATION WORKER] Critical sync failure:', error);
      return { success: false, syncedCount: 0, error: error.message };
    }
  }

  private async runChain(initialUrl: string): Promise<{ success: boolean; syncedCount: number }> {
    let nextUrl: string | null = initialUrl;
    let totalSynced = 0;

    while (nextUrl) {
      if (await bridgeWorkerService.isPaused()) {
        console.warn('🛑 [REPLICATION] Circuit breaker active. Suspending worker.');
        break;
      }

      const response = await fetchWithRetry(nextUrl);
      const records: BridgeRecord[] = response.data?.value || [];

      if (records.length === 0) {
        console.log('✅ [REPLICATION] No new records. Sync complete.');
        break;
      }

      console.log(`📥 [REPLICATION] Processing batch of ${records.length} records...`);
      BridgeFeedHandler.logSourceBreakdown(records);

      totalSynced += await ingestRecords(records);

      const lastRecord = records[records.length - 1];
      if (lastRecord.BridgeModificationTimestamp) {
        await this.updateWatermark(new Date(lastRecord.BridgeModificationTimestamp as string));
      }

      // Resolve nextLink from body or RFC 5988 Link header
      let rawNext = response.data?.['@odata.nextLink'];
      if (!rawNext) {
        const linkHeader = response.headers['link'] || response.headers['odata-nextlink'];
        if (linkHeader) {
          const match = /<([^>]+)>;\s*rel="next"/i.exec(linkHeader);
          rawNext = match ? match[1] : linkHeader;
        }
      }

      nextUrl = rawNext
        ? (rawNext.includes('/OData/') ? rawNext.split('/OData/')[1] : rawNext)
        : null;
    }

    console.log(`🎉 [REPLICATION] Sync complete. Total records ingested: ${totalSynced}`);
    return { success: true, syncedCount: totalSynced };
  }

  private async updateWatermark(timestamp: Date): Promise<void> {
    await prisma.bridgeSyncState.upsert({
      where: { id: 'replication_watermark' },
      update: { mostRecentModificationTimestamp: timestamp },
      create: { id: 'replication_watermark', mostRecentModificationTimestamp: timestamp },
    });
  }
}

export const replicationWorker = new ReplicationWorker();
