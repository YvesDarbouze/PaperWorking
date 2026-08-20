export function validateWorkerAuthorization(
  authorizationHeader: string | null | undefined,
  workerSecret: string | null | undefined,
): { ok: true } | { ok: false; status: number; error: string } {
  if (!workerSecret) {
    return { ok: false, status: 503, error: 'Worker endpoint not configured' };
  }
  const auth = authorizationHeader ?? '';
  if (auth !== `Bearer ${workerSecret}`) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

export function parseWorkerBatchSize(batchParam: string | null | undefined): number {
  const batchSize = Number(batchParam ?? '5');
  return Math.min(Number.isFinite(batchSize) ? batchSize : 5, 20);
}

export const WORKER_QUEUE_NAMES = [
  'bridge_sync',
  'member_sync',
  'office_sync',
  'webhook_process',
] as const;

export type WorkerQueueName = (typeof WORKER_QUEUE_NAMES)[number];
