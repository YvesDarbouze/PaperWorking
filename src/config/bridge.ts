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
 * Perform validation at module load time.
 * This effectively acts as a "Guardrail" for the server startup.
 */
function validateBridgeConfig() {
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
    const missingKeys = result.error.errors.map(err => err.path.join('.')).join(', ');
    
    console.error('🛑 [FATAL] BRIDGE API MISCONFIGURATION DETECTED');
    console.error(`Missing or Invalid keys: ${missingKeys}`);
    
    throw new Error(
      `❌ [BRIDGE_CONFIG_FAILURE] The following required environment variables are missing or invalid: ${missingKeys}. Please check your .env file.`
    );
  }

  return result.data;
}

export const bridgeConfig = validateBridgeConfig();

export default bridgeConfig;
