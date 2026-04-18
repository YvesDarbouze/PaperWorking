import axios from 'axios';
import bridgeConfig from '../config/bridge';
import { bridgeRateLimiter } from './services/rateLimiter';
import { bridgeWorkerService } from './services/bridgeWorkerService';
import { apiHealthService } from './services/apiHealthService';
import { BridgeErrorHandler } from './services/bridgeErrorHandler';

/**
 * 🌉 Centralized Bridge API Client
 * 
 * Optimized for RESO OData v1.1.0 via Bridge Interactive.
 * Enforces security standards and rate limiting quotas.
 */

const apiClient = axios.create({
  baseURL: bridgeConfig.BRIDGE_API_BASE_URL,
  timeout: 10000, // 10s default timeout
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'PaperWorking-Ingestion-Engine/1.0',
  }
});

/**
 * 🛰️ Request Interceptor: Security & Orchestration
 * 1. Bearer Token Injection
 * 2. Mandatory HTTPS Enforcement
 * 3. Redis-Backed Rate Limit Verification
 */
apiClient.interceptors.request.use(async (config) => {
  // 1. HTTPS Enforcement: Bridge API rejects all unencrypted traffic
  if (config.url && !config.url.startsWith('https://') && !config.baseURL?.startsWith('https://')) {
     throw new Error('❌ [BRIDGE API CLIENT] HTTPS is mandatory for all Bridge API requests.');
  }

  // 2. Rate Limit Verification: Honor Zillow's 5,000 req/hr and 334 req/min defaults
  const rateLimitStatus = await bridgeRateLimiter.checkRateLimit();
  if (!rateLimitStatus.allowed) {
    const reason = rateLimitStatus.currentBurst > 334 ? 'Burst (334/min)' : 'Hourly (5000/hr)';
    console.error(`🛑 [RATE LIMIT EXCEEDED] ${reason}. Hourly: ${rateLimitStatus.currentHourly}. Burst: ${rateLimitStatus.currentBurst}`);
    throw new Error(`❌ [BRIDGE API CLIENT] Request quota exceeded (${reason}).`);
  }

  // 2b. Public Records Specific Quota (1,000/day)
  if (config.url?.includes('/pub/')) {
    const publicLimitStatus = await bridgeRateLimiter.checkPublicRateLimit();
    if (!publicLimitStatus.allowed) {
      console.error(`🛑 [PUBLIC RECORDS LIMIT] Daily quota exceeded: ${publicLimitStatus.currentDaily}/1000`);
      throw new Error('❌ [BRIDGE API CLIENT] Rate limit for Public Records exceeded (1,000/day).');
    }
  }

  // 3. Authorization: Inject the server-side static token
  const token = bridgeConfig.BRIDGE_SERVER_TOKEN;
  
  config.headers['Authorization'] = `Bearer ${token}`;

  // 4. Telemetry: Start internal timer
  (config as any).metadata = { startTime: Date.now() };

  /**
   * 🗺️ BRIDGE_VIRTUAL_DATASET_ID 
   * 
   * Note for Developers: When querying, ensure you use the /{vDatasetId}/ path segment
   * if you intend to query across multiple approved MLS feeds via a single endpoint.
   * This variable is managed via .env and enables global dataset visibility.
   */
  const vDatasetId = bridgeConfig.BRIDGE_VIRTUAL_DATASET_ID;
  if (vDatasetId && config.url?.includes('{vDatasetId}')) {
     config.url = config.url.replace('{vDatasetId}', vDatasetId);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * 🔄 Response Interceptor: Telemetry & Error Normalization
 */
apiClient.interceptors.response.use(
  (response) => {
    // 1. Telemetry: Calculate duration
    const metadata = (response.config as any).metadata;
    if (metadata?.startTime) {
      const duration = Date.now() - metadata.startTime;
      if (process.env.NODE_ENV !== 'production' || duration > 2000) {
        console.log(`📈 [BRIDGE API] ${response.config.method?.toUpperCase()} ${response.config.url} captured in ${duration}ms`);
      }
    }

    // 2. Reactive Circuit Breaker: Monitor Bridge Platform response headers
    const appRemaining = parseInt(response.headers['application-ratelimit-remaining'] as string, 10);
    const burstRemaining = parseInt(response.headers['burst-ratelimit-remaining'] as string, 10);
    const appLimit = parseInt(response.headers['application-ratelimit-limit'] as string, 10);
    const burstLimit = parseInt(response.headers['burst-ratelimit-limit'] as string, 10);

    // 3. Health Monitoring: Log metrics for the dashboard
    if (!isNaN(appLimit) && !isNaN(appRemaining)) {
      apiHealthService.logQuotaMetrics(appLimit, appRemaining, burstLimit || 0, burstRemaining || 0);
    }

    if (!isNaN(appRemaining) && appRemaining < 10 || !isNaN(burstRemaining) && burstRemaining < 10) {
      console.warn(`🚨 [BRIDGE API] Quota Critical (App: ${appRemaining}, Burst: ${burstRemaining}). Triggering backup circuit breaker.`);
      bridgeWorkerService.pause();
    }

    return response;
  },
  (error) => {
    // Use centralized handler for classification and side-effects
    const bridgeError = BridgeErrorHandler.handle(error);

    return Promise.reject(bridgeError);
  }
);

export default apiClient;
