import { jsonResponse, type RouteResult } from '../../http/response.js';
import {
  cronAuthFailureResult,
  verifyCronAuth,
  type CronAuthConfig,
  type CronAuthHeaders,
  type CronAuthMode,
} from './auth.js';

export interface CronJobDeps {
  authConfig?: CronAuthConfig;
}

export interface CronJobOptions<TResult> extends CronJobDeps {
  jobName: string;
  authMode?: CronAuthMode;
  run: () => Promise<TResult>;
  successStatus?: (result: TResult) => number;
  mapBody?: (result: TResult) => unknown;
}

export async function executeCronJob<TResult>(
  headers: CronAuthHeaders,
  options: CronJobOptions<TResult>,
): Promise<RouteResult> {
  const auth = verifyCronAuth(headers, {
    mode: options.authMode ?? options.authConfig?.mode ?? 'standard',
    ...options.authConfig,
  });

  if (!auth.authorized) {
    const failure = cronAuthFailureResult(auth, options.jobName);
    const body =
      options.authMode === 'flexible' && auth.misconfigured
        ? { success: false, error: 'CRON_SECRET is not configured on the server.' }
        : failure.body;
    return jsonResponse(failure.status, body);
  }

  try {
    const result = await options.run();
    const status = options.successStatus?.(result) ?? 200;
    const body = options.mapBody ? options.mapBody(result) : result;
    return jsonResponse(status, body as Record<string, unknown>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ [CRON ${options.jobName}] Uncaught error:`, message);
    return jsonResponse(500, { error: 'cron_failed', detail: message });
  }
}

export type CronRunFn = () => Promise<unknown>;

export interface SimpleCronHandlerDeps {
  run?: CronRunFn;
  authConfig?: CronAuthConfig;
}

export function createSimpleCronHandler(
  jobName: string,
  authMode: CronAuthMode = 'standard',
  defaultResult: unknown = { ok: true },
) {
  return async function handleCronGet(
    headers: CronAuthHeaders = {},
    deps: SimpleCronHandlerDeps = {},
  ): Promise<RouteResult> {
    return executeCronJob(headers, {
      jobName,
      authMode,
      authConfig: deps.authConfig,
      run: async () => (deps.run ? deps.run() : defaultResult),
    });
  };
}
