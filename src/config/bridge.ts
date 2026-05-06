import { z } from 'zod';

/**
 * Bridge Interactive API Configuration
 *
 * Bridge uses STATIC BEARER TOKENS — there is no OAuth2 flow.
 * Only BRIDGE_SERVER_TOKEN + BRIDGE_VIRTUAL_DATASET_ID are required
 * for the OData search endpoints this app uses.
 *
 * BRIDGE_CLIENT_ID / BRIDGE_CLIENT_SECRET are RETS (legacy) credentials
 * that are NOT used by the OData API — they are intentionally omitted here.
 *
 * Replication note: the /replication endpoint is NOT available on Virtual
 * Datasets. Use BRIDGE_DATASET_ID (a real MLS code like "test_sd") for
 * replication and BRIDGE_VIRTUAL_DATASET_ID for search.
 */
const bridgeConfigSchema = z.object({
  /** Static Bearer token — the only auth mechanism for the OData API */
  BRIDGE_SERVER_TOKEN: z.string().min(1, 'Missing BRIDGE_SERVER_TOKEN'),

  /** OData base URL */
  BRIDGE_API_BASE_URL: z.string().min(1, 'Missing BRIDGE_API_BASE_URL'),

  /**
   * Dataset ID for search / general Property queries.
   * Can be a real MLS code (e.g. "test_sd") or a Virtual Dataset ID
   * that you created in the Bridge dashboard to aggregate multiple MLSs.
   */
  BRIDGE_VIRTUAL_DATASET_ID: z.string().min(1, 'Missing BRIDGE_VIRTUAL_DATASET_ID'),

  /**
   * Dataset ID for the /replication endpoint.
   * Must be a real MLS dataset code — Virtual Datasets do NOT support replication.
   * Defaults to BRIDGE_VIRTUAL_DATASET_ID when not separately configured.
   */
  BRIDGE_DATASET_ID: z.string().optional(),

  /**
   * Bridge has NO webhook support — the platform is pull-only.
   * This field is reserved for future use only.
   */
  BRIDGE_WEBHOOK_SECRET: z.string().optional(),
});

type BridgeConfig = z.infer<typeof bridgeConfigSchema>;

let _cachedConfig: BridgeConfig | null = null;

/**
 * Lazy-validated Bridge config.
 * Validation is deferred to first access so the Next.js build never
 * crashes when BRIDGE_* env vars are absent during static page generation.
 */
export function getBridgeConfig(): BridgeConfig {
  if (_cachedConfig) return _cachedConfig;

  const env = {
    BRIDGE_SERVER_TOKEN:       process.env.BRIDGE_SERVER_TOKEN,
    BRIDGE_API_BASE_URL:       process.env.BRIDGE_API_BASE_URL,
    BRIDGE_VIRTUAL_DATASET_ID: process.env.BRIDGE_VIRTUAL_DATASET_ID,
    BRIDGE_DATASET_ID:         process.env.BRIDGE_DATASET_ID,
    BRIDGE_WEBHOOK_SECRET:     process.env.BRIDGE_WEBHOOK_SECRET,
  };

  const result = bridgeConfigSchema.safeParse(env);

  if (!result.success) {
    const missing = result.error.issues.map(e => e.path.join('.')).join(', ');
    throw new Error(
      `[BRIDGE_CONFIG_FAILURE] Missing required env vars: ${missing}. ` +
      `Get your Server Token from the Bridge dashboard → Applications → Tokens.`
    );
  }

  _cachedConfig = result.data;
  return _cachedConfig;
}

/**
 * Returns the dataset ID to use for the /replication endpoint.
 * Prefers BRIDGE_DATASET_ID (real MLS code) since Virtual Datasets
 * do not support replication. Falls back to BRIDGE_VIRTUAL_DATASET_ID.
 */
export function getReplicationDatasetId(): string {
  const cfg = getBridgeConfig();
  return cfg.BRIDGE_DATASET_ID || cfg.BRIDGE_VIRTUAL_DATASET_ID;
}

/** @deprecated Use getBridgeConfig() — kept for backward compat */
export const bridgeConfig = new Proxy({} as BridgeConfig, {
  get(_target, prop: string) {
    return getBridgeConfig()[prop as keyof BridgeConfig];
  },
});

export default bridgeConfig;
