import type { RouteResult } from '../../http/response.js';
import { jsonResponse } from '../../http/response.js';
import { circuitBreakers, type CircuitState } from '../../lib/circuit-breaker.js';

export interface HealthCheckDeps {
  pingPostgres?: () => Promise<void>;
  breakers?: {
    stripe: { getState(): CircuitState };
    plaid: { getState(): CircuitState };
    google_maps: { getState(): CircuitState };
    sendgrid: { getState(): CircuitState };
  };
  environment?: string;
  appName?: string;
}

function serviceStatus(circuit: CircuitState): 'healthy' | 'degraded' {
  return circuit === 'OPEN' ? 'degraded' : 'healthy';
}

/**
 * GET /api/health — migrated from PaperWorking src/app/api/health/route.ts
 * Preserves response contract; no Next.js dependency.
 */
export async function handleHealthGet(deps: HealthCheckDeps = {}): Promise<RouteResult> {
  const timestamp = new Date().toISOString();
  const breakers = deps.breakers ?? circuitBreakers;
  const environment = deps.environment ?? process.env.NODE_ENV ?? 'development';
  const appName = deps.appName ?? 'PaperWorking';

  let postgresStatus: 'healthy' | 'unhealthy' = 'healthy';
  let isHealthy = true;

  if (deps.pingPostgres) {
    try {
      await deps.pingPostgres();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Connection timed out')) {
        postgresStatus = 'unhealthy';
        isHealthy = false;
      }
    }
  }

  const services = {
    database: { status: postgresStatus, pingMs: isHealthy ? 12 : 0, lastSync: timestamp },
    stripe: {
      status: serviceStatus(breakers.stripe.getState()),
      circuit: breakers.stripe.getState(),
      pingMs: 45,
      lastSync: timestamp,
    },
    plaid: {
      status: serviceStatus(breakers.plaid.getState()),
      circuit: breakers.plaid.getState(),
      pingMs: 62,
      lastSync: timestamp,
    },
    google_maps: {
      status: serviceStatus(breakers.google_maps.getState()),
      circuit: breakers.google_maps.getState(),
      pingMs: 28,
      lastSync: timestamp,
    },
    sendgrid: {
      status: serviceStatus(breakers.sendgrid.getState()),
      circuit: breakers.sendgrid.getState(),
      pingMs: 34,
      lastSync: timestamp,
    },
    storage: { status: 'healthy' as const, pingMs: 18, lastSync: timestamp },
  };

  if (!isHealthy || postgresStatus === 'unhealthy') {
    return jsonResponse(503, {
      ok: false,
      status: { postgres: postgresStatus, firestore: 'healthy' },
      services,
      timestamp,
    });
  }

  return jsonResponse(200, {
    ok: true,
    status: { postgres: 'healthy', firestore: 'healthy' },
    app: appName,
    environment,
    timestamp,
    services,
  });
}
