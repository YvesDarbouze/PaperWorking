import { executeCronJob, type CronJobOptions } from '../../lib/cron/handler.js';
import type { CronAuthConfig, CronAuthHeaders } from '../../lib/cron/auth.js';
import type { RouteResult } from '../../http/response.js';
import {
  parseBridgeSyncResources,
  shouldAutoDrain,
} from '../../lib/cron/utils.js';

type CronHandlerDeps = { authConfig?: CronAuthConfig };

function runCronJob<TResult>(
  headers: CronAuthHeaders,
  deps: CronHandlerDeps,
  options: CronJobOptions<TResult>,
): Promise<RouteResult> {
  return executeCronJob(headers, {
    ...options,
    authConfig: deps.authConfig ?? options.authConfig,
  });
}

export type CronProcessDeletionsFn = () => Promise<{
  success: boolean;
  processedCount: number;
  deletedUserIds: string[];
  errors: unknown[];
}>;

export interface CronProcessDeletionsDeps extends CronHandlerDeps {
  run?: CronProcessDeletionsFn;
}

export async function handleCronProcessDeletionsGet(
  headers: CronAuthHeaders = {},
  deps: CronProcessDeletionsDeps = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'ProcessDeletions',
    authMode: 'standard',
    run: async () =>
      deps.run?.() ?? { success: true, processedCount: 0, deletedUserIds: [], errors: [] },
  });
}

export type CronSendDigestFn = () => Promise<{
  processedUsers: string[];
  errors: unknown[];
}>;

export async function handleCronSendDigestGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: CronSendDigestFn } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'SendDigest',
    authMode: 'standard',
    run: async () => deps.run?.() ?? { processedUsers: [], errors: [] },
    mapBody: (result: { processedUsers: string[]; errors: unknown[] }) => ({
      ok: result.errors.length === 0,
      processedCount: result.processedUsers.length,
      processed: result.processedUsers,
      errors: result.errors,
    }),
    successStatus: (result: { errors: unknown[] }) => (result.errors.length > 0 ? 500 : 200),
  });
}

export type CronDailySyncFn = () => Promise<Record<string, unknown>>;

export async function handleCronDailySyncGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: CronDailySyncFn } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'DailySync',
    authMode: 'optional-if-unset',
    run: async () => {
      const result = deps.run ? await deps.run() : {};
      return { success: true, ...result };
    },
  });
}

export type CronLifecycleAlertsFn = () => Promise<{
  projectsScanned: number;
  totalAlertsFired: number;
  totalAlertsDebounced: number;
  errors: unknown[];
}>;

export async function handleCronLifecycleAlertsGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: CronLifecycleAlertsFn; startTime?: number } = {},
): Promise<RouteResult> {
  const startTime = deps.startTime ?? Date.now();
  return runCronJob(headers, deps, {
    jobName: 'LifecycleAlerts',
    authMode: 'strict',
    run: async () => {
      const result = deps.run
        ? await deps.run()
        : {
            projectsScanned: 0,
            totalAlertsFired: 0,
            totalAlertsDebounced: 0,
            errors: [],
          };
      return {
        projectsScanned: result.projectsScanned,
        alertsFired: result.totalAlertsFired,
        alertsDebounced: result.totalAlertsDebounced,
        errors: result.errors,
        durationMs: Date.now() - startTime,
      };
    },
  });
}

export async function handleCronProcessDailyKpisGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & {
    run?: () => Promise<{ processed: string[]; errors: unknown[] }>;
  } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'ProcessDailyKPIs',
    authMode: 'standard',
    run: async () => deps.run?.() ?? { processed: [], errors: [] },
    mapBody: (result: { processed: string[]; errors: unknown[] }) => ({
      ok: true,
      processedCount: result.processed.length,
      processed: result.processed,
      errors: result.errors,
    }),
  });
}

export type CronSnapshotsFn = () => Promise<{
  projectsProcessed: number;
  snapshotsWritten: number;
  errors: unknown[];
}>;

export async function handleCronSnapshotsGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: CronSnapshotsFn; startTime?: number } = {},
): Promise<RouteResult> {
  const startTime = deps.startTime ?? Date.now();
  return runCronJob(headers, deps, {
    jobName: 'Snapshots',
    authMode: 'strict',
    run: async () => {
      const result = deps.run
        ? await deps.run()
        : { projectsProcessed: 0, snapshotsWritten: 0, errors: [] };
      return { ...result, durationMs: Date.now() - startTime };
    },
  });
}

export interface BridgeSyncQuery {
  resources?: string;
  drain?: string;
}

export type CronBridgeSyncFn = (input: {
  resources: Set<string>;
  autoDrain: boolean;
}) => Promise<Record<string, unknown>>;

export async function handleCronBridgeSyncGet(
  query: BridgeSyncQuery = {},
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: CronBridgeSyncFn; startTime?: number } = {},
): Promise<RouteResult> {
  const startTime = deps.startTime ?? Date.now();
  const resources = parseBridgeSyncResources(query.resources);
  const autoDrain = shouldAutoDrain(query.drain);

  return runCronJob(headers, deps, {
    jobName: 'BridgeSync',
    authMode: 'standard',
    run: async () => {
      const result = deps.run
        ? await deps.run({ resources, autoDrain })
        : { ok: true, enqueued: {}, drain: null, watermarks: {} };
      return { ...result, durationMs: Date.now() - startTime };
    },
  });
}

export async function handleCronConsentAuditGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & {
    run?: () => Promise<{
      totalAudited: number;
      validCount: number;
      flaggedCount: number;
    }>;
  } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'ConsentAudit',
    authMode: 'optional-if-unset',
    run: async () => {
      const result = deps.run?.() ?? { totalAudited: 0, validCount: 0, flaggedCount: 0 };
      return { success: true, ...(await result) };
    },
  });
}

export async function handleCronLenderPackageRemindersGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & {
    run?: () => Promise<{
      projectsScanned: number;
      remindersSent: number;
      errors: unknown[];
    }>;
  } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'LenderPackageReminders',
    authMode: 'lender-reminders',
    run: async () =>
      deps.run?.() ?? { projectsScanned: 0, remindersSent: 0, errors: [] },
    mapBody: (result: {
      projectsScanned: number;
      remindersSent: number;
      errors: unknown[];
    }) => ({ success: true, ...result }),
  });
}

export async function handleCronRefreshPlaceIdsGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: () => Promise<Record<string, unknown>> } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'RefreshPlaceIds',
    authMode: 'refresh-place-ids',
    run: async () => deps.run?.() ?? { refreshed: 0 },
  });
}

export async function handleCronSyncTransactionsGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: () => Promise<{ synced: number; failures: number }> } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'SyncTransactions',
    authMode: 'flexible',
    run: async () => deps.run?.() ?? { synced: 0, failures: 0 },
  });
}

export async function handleCronProcessTeamInvitesGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & {
    run?: () => Promise<{
      expiredCount: number;
      day3RemindersSent: number;
      day6RemindersSent: number;
      errors: unknown[];
    }>;
  } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'ProcessTeamInvites',
    authMode: 'standard',
    run: async () =>
      deps.run?.() ?? {
        expiredCount: 0,
        day3RemindersSent: 0,
        day6RemindersSent: 0,
        errors: [],
      },
    mapBody: (results: {
      expiredCount: number;
      day3RemindersSent: number;
      day6RemindersSent: number;
      errors: unknown[];
    }) => ({ ok: results.errors.length === 0, results }),
    successStatus: (results: { errors: unknown[] }) => (results.errors.length > 0 ? 500 : 200),
  });
}

export async function handleCronRetryFailedConnectionsGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: () => Promise<number> } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'RetryFailedConnections',
    authMode: 'optional-if-unset',
    run: async () => ({ success: true, retriedCount: (await deps.run?.()) ?? 0 }),
  });
}

export async function handleCronSyncFinancialTransactionsGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: () => Promise<Record<string, unknown>> } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'SyncFinancialTransactions',
    authMode: 'flexible',
    run: async () => deps.run?.() ?? { synced: 0, failures: 0 },
  });
}

export async function handleCronSyncPlaidLiabilitiesGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & { run?: () => Promise<Record<string, unknown>> } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'SyncPlaidLiabilities',
    authMode: 'flexible',
    run: async () => deps.run?.() ?? { synced: 0, failures: 0, skipped: 0 },
  });
}

export async function handleCronSyncLiabilitiesGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & {
    run?: () => Promise<{ success: boolean; synced?: number; failures?: number; skipped?: number }>;
  } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'SyncLiabilities',
    authMode: 'flexible',
    run: async () => deps.run?.() ?? { success: true, synced: 0, failures: 0, skipped: 0 },
  });
}

export async function handleCronProcessEmailNotificationsGet(
  headers: CronAuthHeaders = {},
  deps: CronHandlerDeps & {
    run?: () => Promise<{
      messagesProcessed: number;
      queuedEmailsProcessed: number;
      errors: unknown[];
    }>;
  } = {},
): Promise<RouteResult> {
  return runCronJob(headers, deps, {
    jobName: 'ProcessEmailNotifications',
    authMode: 'standard',
    run: async () =>
      deps.run?.() ?? { messagesProcessed: 0, queuedEmailsProcessed: 0, errors: [] },
    mapBody: (cronResults: {
      messagesProcessed: number;
      queuedEmailsProcessed: number;
      errors: unknown[];
    }) => ({
      ok: cronResults.errors.length === 0,
      results: cronResults,
    }),
    successStatus: (cronResults: { errors: unknown[] }) =>
      cronResults.errors.length > 0 ? 500 : 200,
  });
}
