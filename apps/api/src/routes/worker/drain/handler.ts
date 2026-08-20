import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  parseWorkerBatchSize,
  validateWorkerAuthorization,
  WORKER_QUEUE_NAMES,
  type WorkerQueueName,
} from '../../../lib/worker/drain.js';

export type DrainWorkerQueuesFn = (
  batchSize: number,
) => Promise<Record<string, unknown>>;

export type GetWorkerQueueDepthsFn = () => Promise<Record<WorkerQueueName, number>>;
export type PeekWorkerDlqFn = (limit: number) => Promise<Array<Record<string, unknown>>>;

export interface WorkerDrainPostDeps {
  workerSecret?: string;
  drainQueues?: DrainWorkerQueuesFn;
  getQueueDepths?: GetWorkerQueueDepthsFn;
}

export interface WorkerDrainGetDeps {
  workerSecret?: string;
  getQueueDepths?: GetWorkerQueueDepthsFn;
  peekDlq?: PeekWorkerDlqFn;
}

function defaultQueueDepths(): Record<WorkerQueueName, number> {
  return {
    bridge_sync: 0,
    member_sync: 0,
    office_sync: 0,
    webhook_process: 0,
  };
}

/**
 * POST /api/worker/drain
 */
export async function handleWorkerDrainPost(
  query: { batch?: string | null },
  headers: { authorization?: string | null },
  deps: WorkerDrainPostDeps = {},
): Promise<RouteResult> {
  const auth = validateWorkerAuthorization(headers.authorization, deps.workerSecret);
  if (!auth.ok) {
    if (auth.status === 503) console.error('[Worker Drain] WORKER_SECRET not configured — rejecting request');
    return jsonResponse(auth.status, { error: auth.error });
  }

  try {
    const batchSize = parseWorkerBatchSize(query.batch);
    const results = deps.drainQueues ? await deps.drainQueues(batchSize) : {};
    const depths = deps.getQueueDepths ? await deps.getQueueDepths() : defaultQueueDepths();
    return jsonResponse(200, { ok: true, results, remaining: depths });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Worker Drain] Uncaught error', error);
    return jsonResponse(500, { error: 'drain_failed', detail: message });
  }
}

/**
 * GET /api/worker/drain
 */
export async function handleWorkerDrainGet(
  headers: { authorization?: string | null },
  deps: WorkerDrainGetDeps = {},
): Promise<RouteResult> {
  const auth = validateWorkerAuthorization(headers.authorization, deps.workerSecret);
  if (!auth.ok) {
    if (auth.status === 503) console.error('[Worker Drain] WORKER_SECRET not configured — rejecting request');
    return jsonResponse(auth.status, { error: auth.error });
  }

  try {
    const depths = deps.getQueueDepths ? await deps.getQueueDepths() : defaultQueueDepths();
    const sample = deps.peekDlq ? await deps.peekDlq(5) : [];
    return jsonResponse(200, {
      depths,
      dlq: { count: sample.length, sample },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, { error: 'status_failed', detail: message });
  }
}

export { WORKER_QUEUE_NAMES };
