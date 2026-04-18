import bridgeConfig from './bridge';

/**
 * ── Zillow Bridge API Configuration ──
 * 
 * Specifically configured for Bridge Interactive (Enterprise Data Distribution Platform).
 * This follows the OData (Open Data Protocol) standard for RESO-compliant real estate data.
 */

export const zillowBridgeConfig = {
  clientId: bridgeConfig.BRIDGE_CLIENT_ID,
  clientSecret: bridgeConfig.BRIDGE_CLIENT_SECRET,
  apiBaseUrl: bridgeConfig.BRIDGE_API_BASE_URL,
  virtualDatasetId: bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID,
};

export default zillowBridgeConfig;
