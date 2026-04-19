import { z } from 'zod';

/**
 * 🌉 BridgeConfig Schema
 * 
 * Strict validation for Zillow Group's Bridge API environment variables.
 * Ensures the platform fails early and clearly if mission-critical 
 * integration secrets are missing or malformed.
 */

const bridgeConfigSchema = z.object({
  /** Primary access credentials */
  BRIDGE_CLIENT_ID: z.string().min(1, "Missing BRIDGE_CLIENT_ID"),
  BRIDGE_CLIENT_SECRET: z.string().min(1, "Missing BRIDGE_CLIENT_SECRET"),
  BRIDGE_SERVER_TOKEN: z.string().min(1, "Missing BRIDGE_SERVER_TOKEN"),
  
  /** Endpoint Configuration */
  BRIDGE_API_BASE_URL: z.string().url("BRIDGE_API_BASE_URL must be a valid URL (e.g., https://api.bridgedataoutput.com/api/v2/OData/)"),
  BRIDGE_OAUTH_URL: z.string().url().default('https://api.bridgedataoutput.com/oauth/token'),
  
  /** Dataset Mapping */
  BRIDGE_DATASET_ID: z.string().min(1, "Missing BRIDGE_DATASET_ID"),
  BRIDGE_VIRTUAL_DATASET_ID: z.string().min(1, "Missing BRIDGE_VIRTUAL_DATASET_ID"),
  
  /** Webhook & Security */
  BRIDGE_WEBHOOK_SECRET: z.string().min(1, "Missing BRIDGE_WEBHOOK_SECRET"),
});

/**
 * Lazy-validated Bridge config.
 * Validation is deferred to first access so the Next.js build
 * doesn't crash when BRIDGE_* env vars aren't present during
 * static page generation / route collection.
 */
function validateBridgeConfig(): z.infer<typeof bridgeConfigSchema> {
  const env = {
    BRIDGE_CLIENT_ID: process.env.BRIDGE_CLIENT_ID,
    BRIDGE_CLIENT_SECRET: process.env.BRIDGE_CLIENT_SECRET,
    BRIDGE_SERVER_TOKEN: process.env.BRIDGE_SERVER_TOKEN,
    BRIDGE_API_BASE_URL: process.env.BRIDGE_API_BASE_URL,
    BRIDGE_OAUTH_URL: process.env.BRIDGE_OAUTH_URL,
    BRIDGE_DATASET_ID: process.env.BRIDGE_DATASET_ID,
    BRIDGE_VIRTUAL_DATASET_ID: process.env.BRIDGE_VIRTUAL_DATASET_ID,
    BRIDGE_WEBHOOK_SECRET: process.env.BRIDGE_WEBHOOK_SECRET,
  };

  const result = bridgeConfigSchema.safeParse(env);

  if (!result.success) {
    const missingKeys = result.error.issues.map(err => err.path.join('.')).join(', ');
    
    console.error('🛑 [FATAL] BRIDGE API MISCONFIGURATION DETECTED');
    console.error(`Missing or Invalid keys: ${missingKeys}`);
    
    throw new Error(
      `❌ [BRIDGE_CONFIG_FAILURE] The following required environment variables are missing or invalid: ${missingKeys}. Please check your .env file.`
    );
  }

  return result.data;
}

let _cachedConfig: z.infer<typeof bridgeConfigSchema> | null = null;

/**
 * Access Bridge config lazily. First call validates and caches;
 * subsequent calls return the cached result instantly.
 */
export function getBridgeConfig(): z.infer<typeof bridgeConfigSchema> {
  if (!_cachedConfig) {
    _cachedConfig = validateBridgeConfig();
  }
  return _cachedConfig;
}

/** @deprecated Use getBridgeConfig() instead — kept for backward compat */
export const bridgeConfig = new Proxy({} as z.infer<typeof bridgeConfigSchema>, {
  get(_target, prop: string) {
    return getBridgeConfig()[prop as keyof z.infer<typeof bridgeConfigSchema>];
  },
});

export default bridgeConfig;
