import { getBridgeConfig } from './bridge';

/**
 * ── Zillow Bridge API Configuration ──
 * 
 * Specifically configured for Bridge Interactive (Enterprise Data Distribution Platform).
 * This follows the OData (Open Data Protocol) standard for RESO-compliant real estate data.
 * 
 * Lazy-loaded to avoid crashing the build when BRIDGE_* env vars are absent.
 */

export function getZillowBridgeConfig() {
  const cfg = getBridgeConfig();
  return {
    clientId: cfg.BRIDGE_CLIENT_ID,
    clientSecret: cfg.BRIDGE_CLIENT_SECRET,
    apiBaseUrl: cfg.BRIDGE_API_BASE_URL,
    virtualDatasetId: cfg.BRIDGE_VIRTUAL_DATASET_ID,
  };
}

/** @deprecated Use getZillowBridgeConfig() instead */
export const zillowBridgeConfig = new Proxy({} as ReturnType<typeof getZillowBridgeConfig>, {
  get(_target, prop: string) {
    return getZillowBridgeConfig()[prop as keyof ReturnType<typeof getZillowBridgeConfig>];
  },
});

export default zillowBridgeConfig;

