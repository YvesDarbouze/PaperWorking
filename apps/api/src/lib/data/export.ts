export const EXPORT_STATUS_THRESHOLDS_SEC = {
  processing: 5,
  ready: 15,
} as const;

export const EXPORT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface ExportJobRecord {
  id: string;
  status?: string;
  createdAtMs: number;
}

export function computeExportJobStatus(
  job: ExportJobRecord,
  nowMs = Date.now(),
): { status: string; downloadUrl: string | null; expired: boolean } {
  const elapsedSec = (nowMs - job.createdAtMs) / 1000;
  let status = job.status || 'Queued';
  let downloadUrl: string | null = null;
  let expired = false;

  if (status !== 'Failed') {
    if (elapsedSec > EXPORT_STATUS_THRESHOLDS_SEC.ready) {
      status = 'Ready for Download';
      downloadUrl = `/api/settings/data-privacy/download-export?jobId=${job.id}`;
    } else if (elapsedSec > EXPORT_STATUS_THRESHOLDS_SEC.processing) {
      status = 'Processing';
    } else {
      status = 'Queued';
    }
  }

  if (elapsedSec > EXPORT_EXPIRY_MS / 1000) {
    expired = true;
  }

  return {
    status,
    downloadUrl: expired ? null : downloadUrl,
    expired,
  };
}

export function serializeExportHistoryItem(
  job: ExportJobRecord,
  nowMs = Date.now(),
): {
  id: string;
  status: string;
  createdAt: string;
  expired: boolean;
  downloadUrl: string | null;
} {
  const computed = computeExportJobStatus(job, nowMs);
  return {
    id: job.id,
    status: computed.status,
    createdAt: new Date(job.createdAtMs).toISOString(),
    expired: computed.expired,
    downloadUrl: computed.expired
      ? null
      : `/api/settings/data-privacy/download-export?jobId=${job.id}`,
  };
}
