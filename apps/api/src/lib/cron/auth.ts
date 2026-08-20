export interface CronAuthHeaders {
  authorization?: string | null;
  cronSecretHeader?: string | null;
}

export type CronAuthMode =
  | 'strict'
  | 'standard'
  | 'flexible'
  | 'optional-if-unset'
  | 'refresh-place-ids'
  | 'lender-reminders';

export interface CronAuthConfig {
  mode?: CronAuthMode;
  cronSecret?: string;
  workerSecret?: string;
  nodeEnv?: string;
}

export interface CronAuthResult {
  authorized: boolean;
  misconfigured?: boolean;
}

function resolveSecrets(config: CronAuthConfig): {
  primary: string | undefined;
  combined: string | undefined;
} {
  const primary = config.cronSecret ?? process.env.CRON_SECRET;
  const worker = config.workerSecret ?? process.env.WORKER_SECRET;
  return {
    primary,
    combined: primary ?? worker,
  };
}

/**
 * Validates cron/worker secret from Authorization bearer or x-cron-secret header.
 */
export function verifyCronAuth(
  headers: CronAuthHeaders,
  config: CronAuthConfig = {},
): CronAuthResult {
  const mode = config.mode ?? 'standard';
  const { primary, combined } = resolveSecrets(config);
  const authHeader = headers.authorization ?? null;
  const cronHeader = headers.cronSecretHeader ?? null;
  const nodeEnv = config.nodeEnv ?? process.env.NODE_ENV;

  if (mode === 'lender-reminders') {
    const secret = combined ?? 'mock_secret';
    if (nodeEnv === 'test') return { authorized: true };
    return { authorized: authHeader === `Bearer ${secret}` };
  }

  if (mode === 'refresh-place-ids') {
    if (!primary) return { authorized: true };
    return { authorized: authHeader === `Bearer ${primary}` };
  }

  if (mode === 'optional-if-unset') {
    if (!combined) return { authorized: true };
    return {
      authorized:
        authHeader === `Bearer ${combined}` || cronHeader === combined,
    };
  }

  if (mode === 'flexible') {
    if (!primary) {
      return { misconfigured: true, authorized: false };
    }
    return {
      authorized:
        authHeader === `Bearer ${primary}` || cronHeader === primary,
    };
  }

  const secret = mode === 'strict' ? primary : combined;

  if (!secret) {
    return { misconfigured: true, authorized: false };
  }

  return { authorized: authHeader === `Bearer ${secret}` };
}

export function cronAuthFailureResult(
  auth: CronAuthResult,
  jobName: string,
): { status: number; body: unknown } {
  if (auth.misconfigured) {
    console.error(`[Cron/${jobName}] CRON_SECRET env var not set`);
    return { status: 500, body: { error: 'Server misconfiguration' } };
  }
  return { status: 401, body: { error: 'Unauthorized' } };
}
