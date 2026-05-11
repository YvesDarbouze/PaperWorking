/**
 * src/lib/services/officeReplicationWorker.ts
 *
 * Orchestrates MLS Office data synchronization via the
 * Bridge /{dataset}/Office endpoint. Mirrors the ReplicationWorker
 * pattern used for Properties, but targets the Office resource.
 *
 * Watermark key: "office_watermark"
 */

import apiClient from '../apiClient';
import prisma from '../prisma';
import bridgeConfig from '../../config/bridge';
import { bridgeWorkerService } from './bridgeWorkerService';
import { BridgeOfficeSchema, type BridgeOffice } from '../types/bridge';
import { ingestOffices } from './officeIngestor';
import { BridgeRateLimitError, BridgeServerError } from '../types/errors';

const MAX_RETRIES = 3;
const WATERMARK_ID = 'office_watermark';

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
      console.warn(`⏳ [OFFICE REPLICATION] Retriable error on attempt ${attempt + 1}. Retrying in ${delay}ms.`, (error as Error).message);
      await sleep(delay);
    }
  }
}

/**
 * 🏢 OfficeReplicationWorker
 *
 * Syncs the Office resource from Bridge Interactive into
 * the local Prisma `Office` table. Uses watermark-based incremental sync.
 */
class OfficeReplicationWorker {
  private readonly MAX_BATCH_SIZE = 500;

  private get basePath(): string {
    const vId = bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID;
    return vId ? `${vId}/Office` : 'Office';
  }

  async sync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    try {
      const state = await prisma.bridgeSyncState.findUnique({
        where: { id: WATERMARK_ID },
      });

      let watermark = state?.mostRecentModificationTimestamp;
      if (!watermark) {
        watermark = new Date();
        watermark.setDate(watermark.getDate() - 90); // 90-day initial lookback for offices
      }

      console.log(`🚀 [OFFICE REPLICATION] Starting sync from watermark: ${watermark.toISOString()}`);

      const selectFields = [
        'OfficeKey', 'OfficeMlsId', 'OfficeName', 'OfficePhone', 'OfficeEmail',
        'OfficeAddress1', 'OfficeCity', 'OfficeStateOrProvince', 'OfficePostalCode',
        'OfficeType', 'OfficeStatus', 'ModificationTimestamp',
      ].join(',');

      const initialUrl = `${this.basePath}?$filter=ModificationTimestamp gt ${watermark.toISOString()}&$top=${this.MAX_BATCH_SIZE}&$select=${selectFields}&$orderby=ModificationTimestamp asc`;

      return await this.runChain(initialUrl);
    } catch (error: any) {
      console.error('❌ [OFFICE REPLICATION] Critical sync failure:', error);
      return { success: false, syncedCount: 0, error: error.message };
    }
  }

  private async runChain(initialUrl: string): Promise<{ success: boolean; syncedCount: number }> {
    let nextUrl: string | null = initialUrl;
    let totalSynced = 0;

    while (nextUrl) {
      if (await bridgeWorkerService.isPaused()) {
        console.warn('🛑 [OFFICE REPLICATION] Circuit breaker active. Suspending worker.');
        break;
      }

      const response = await fetchWithRetry(nextUrl);
      const rawRecords: any[] = response.data?.value || [];

      if (rawRecords.length === 0) {
        console.log('✅ [OFFICE REPLICATION] No new records. Sync complete.');
        break;
      }

      console.log(`📥 [OFFICE REPLICATION] Processing batch of ${rawRecords.length} offices...`);

      const records: BridgeOffice[] = rawRecords.map(r => {
        const res = BridgeOfficeSchema.safeParse(r);
        return res.success ? res.data : (r as BridgeOffice);
      });

      totalSynced += await ingestOffices(records);

      // Update watermark from the last record
      const lastRecord = records[records.length - 1];
      if (lastRecord.ModificationTimestamp) {
        await this.updateWatermark(new Date(lastRecord.ModificationTimestamp));
      }

      // Resolve nextLink
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

    console.log(`🎉 [OFFICE REPLICATION] Sync complete. Total offices ingested: ${totalSynced}`);
    return { success: true, syncedCount: totalSynced };
  }

  private async updateWatermark(timestamp: Date): Promise<void> {
    await prisma.bridgeSyncState.upsert({
      where: { id: WATERMARK_ID },
      update: { mostRecentModificationTimestamp: timestamp },
      create: { id: WATERMARK_ID, mostRecentModificationTimestamp: timestamp },
    });
  }
}

export const officeReplicationWorker = new OfficeReplicationWorker();
