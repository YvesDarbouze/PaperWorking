import apiClient from '../apiClient';
import prisma from '../prisma';
import { bridgeWorkerService } from './bridgeWorkerService';
import { BridgeFeedHandler, BridgeRecord } from '../utils/BridgeFeedHandler';
import { BridgeRateLimitError, BridgeServerError } from '../types/errors';

const INGEST_CHUNK_SIZE = 100;
const MAX_RETRIES = 3;

/**
 * Returns the number of milliseconds to wait before retrying.
 * For 429: uses the header-provided reset time when available.
 * For 5xx: exponential backoff with full jitter.
 */
function retryDelayMs(error: unknown, attempt: number): number {
  if (error instanceof BridgeRateLimitError && error.resetAt) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return Math.max((error.resetAt - nowSeconds) * 1000, 1000);
  }
  // Exponential backoff with full jitter: random(0, 2^attempt * 2s), capped at 60s
  const cap = Math.min(2000 * Math.pow(2, attempt), 60_000);
  return Math.floor(Math.random() * cap);
}

function isRetriable(error: unknown): boolean {
  return error instanceof BridgeRateLimitError || error instanceof BridgeServerError;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps a single API fetch with retry + exponential backoff.
 * Retriable: 429 (rate limit) and 503 (server unavailable).
 * Non-retriable errors are re-thrown immediately.
 */
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
 * High-performance worker for MLS data synchronization via the Bridge
 * /Property/replication endpoint. Iterative (not recursive) to avoid
 * stack overflow on large datasets. Records are ingested in chunks of
 * 100 per Prisma transaction to keep connection pool pressure bounded.
 */
class ReplicationWorker {
  private readonly REPLICATION_ENDPOINT = 'Property/replication';
  private readonly MAX_BATCH_SIZE = 2000;

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

  /**
   * Iterative nextLink traversal — avoids call-stack growth on large datasets.
   */
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

      await this.ingestRecords(records);
      totalSynced += records.length;

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

      if (rawNext) {
        nextUrl = rawNext.includes('/OData/') ? rawNext.split('/OData/')[1] : rawNext;
      } else {
        nextUrl = null;
      }
    }

    console.log(`🎉 [REPLICATION] Sync complete. Total records ingested: ${totalSynced}`);
    return { success: true, syncedCount: totalSynced };
  }

  /**
   * Upserts records in chunks of INGEST_CHUNK_SIZE, each chunk in its own
   * Prisma transaction. This keeps connection-pool pressure bounded regardless
   * of batch size (2000 concurrent upserts would exhaust the pool).
   */
  private async ingestRecords(records: BridgeRecord[]): Promise<void> {
    for (let i = 0; i < records.length; i += INGEST_CHUNK_SIZE) {
      const chunk = records.slice(i, i + INGEST_CHUNK_SIZE);

      await prisma.$transaction(
        chunk.map((originalRecord) => {
          const record = BridgeFeedHandler.sanitize(originalRecord);

          const sharedFields = {
            listingId: record.ListingId as string,
            standardStatus: record.StandardStatus as string,
            // BigInt required: listPrice is a BigInt column; using Number here would
            // silently lose precision on listings above ~$90 trillion (IEEE 754 limit).
            listPrice: record.ListPrice ? BigInt(Math.round(Number(record.ListPrice) * 100)) : BigInt(0),
            unparsedAddress: record.UnparsedAddress as string,
            bedroomsTotal: record.BedroomsTotal ? Number(record.BedroomsTotal) : null,
            bathroomsFull: record.BathroomsFull ? Number(record.BathroomsFull) : null,
            bathroomsHalf: record.BathroomsHalf ? Number(record.BathroomsHalf) : null,
            livingArea: record.LivingArea ? Number(record.LivingArea) : null,
            lotSizeAcres: record.LotSizeAcres ? Number(record.LotSizeAcres) : null,
            yearBuilt: record.YearBuilt ? Number(record.YearBuilt) : null,
            publicRemarks: record.PublicRemarks as string,
            media: record.Media ? JSON.stringify(record.Media) : null,
            bridgeModificationTimestamp: new Date(record.BridgeModificationTimestamp as string),
            coordinates: record.Coordinates as string,
            feedTypes: JSON.stringify(record.FeedTypes || []),
          };

          return prisma.property.upsert({
            where: { listingKey: record.ListingKey as string },
            update: sharedFields,
            create: { listingKey: record.ListingKey as string, ...sharedFields },
          });
        })
      );
    }
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
