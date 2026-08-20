import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  computeExportJobStatus,
  serializeExportHistoryItem,
  type ExportJobRecord,
} from '../../lib/data/export.js';

export type LoadDataExportContextFn = (uid: string) => Promise<{ orgId: string }>;

export type LoadLatestExportJobFn = (orgId: string) => Promise<ExportJobRecord | null>;
export type ListExportHistoryFn = (orgId: string) => Promise<ExportJobRecord[]>;
export type UpdateExportJobStatusFn = (
  orgId: string,
  jobId: string,
  status: string,
) => Promise<void>;
export type CreateExportJobFn = (orgId: string) => Promise<{ jobId: string }>;

export interface DataHandlerDeps {
  requireAuth?: RequireAuthFn;
  loadContext?: LoadDataExportContextFn;
  loadLatestJob?: LoadLatestExportJobFn;
  listHistory?: ListExportHistoryFn;
  updateJobStatus?: UpdateExportJobStatusFn;
  createJob?: CreateExportJobFn;
}

/**
 * GET /api/data/*
 */
export async function handleDataGet(
  actionPath: string[],
  deps: DataHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const context = deps.loadContext
    ? await deps.loadContext(auth.uid)
    : { orgId: 'org_placeholder' };

  if (actionPath.length === 2 && actionPath[0] === 'export' && actionPath[1] === 'status') {
    const latest = deps.loadLatestJob ? await deps.loadLatestJob(context.orgId) : null;
    if (!latest) {
      return jsonResponse(200, { status: 'none', exports: [] });
    }

    const computed = computeExportJobStatus(latest);
    if (computed.status !== (latest.status || 'Queued') && deps.updateJobStatus) {
      await deps.updateJobStatus(context.orgId, latest.id, computed.status);
    }

    const history = deps.listHistory ? await deps.listHistory(context.orgId) : [latest];
    return jsonResponse(200, {
      status: computed.status,
      downloadUrl: computed.downloadUrl,
      expired: computed.expired,
      exports: history.map((job) => serializeExportHistoryItem(job)),
    });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}

/**
 * POST /api/data/*
 */
export async function handleDataPost(
  actionPath: string[],
  deps: DataHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const context = deps.loadContext
    ? await deps.loadContext(auth.uid)
    : { orgId: 'org_placeholder' };

  if (actionPath.length === 1 && actionPath[0] === 'export') {
    const job = deps.createJob
      ? await deps.createJob(context.orgId)
      : { jobId: `export_${Date.now()}` };
    return jsonResponse(200, { success: true, jobId: job.jobId, status: 'Queued' });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}
