import { AxiosError } from 'axios';
import { 
  BridgeError, 
  BridgeBadRequestError, 
  BridgeAuthError, 
  BridgeNotFoundError, 
  BridgeTimeoutError, 
  BridgeUnsupportedMediaTypeError, 
  BridgeRateLimitError, 
  BridgeServerError 
} from '../types/errors';
import { bridgeWorkerService } from './bridgeWorkerService';
import { apiHealthService } from './apiHealthService';

/**
 * 🛠️ BridgeErrorHandler
 * 
 * Centralized logic for catching, classifying, and reacting to Bridge API failures.
 */
export class BridgeErrorHandler {
  /**
   * Translates an AxiosError into a specialized BridgeError and triggers side-effects.
   */
  public static handle(error: AxiosError | any): BridgeError {
    const status = error.response?.status;
    const axiosError = error as AxiosError;
    
    // 1. Deep Extraction: Catch Bridge OData v1.1.0 Error Format
    const responseData = axiosError.response?.data as Record<string, any> | undefined;
    const errorBody = responseData?.error || responseData || {};
    const code = errorBody.code || 'UNKNOWN_CODE';
    const message = errorBody.message || axiosError.message || 'Unknown Bridge API Error';
    const target = errorBody.target || 'UNSPECIFIED_TARGET';
    const details = errorBody.details ? JSON.stringify(errorBody.details) : 'NONE';

    // 2. Comprehensive System Logging
    console.error(`❌ [BRIDGE API FAILURE] 
      Status: ${status || 'Network'} 
      Code: ${code} 
      Message: ${message} 
      Target: ${target} 
      Details: ${details}
      URL: ${axiosError.config?.url}
    `);

    // 3. Classify by status and trigger side-effects
    switch (status) {
      case 400:
        return new BridgeBadRequestError(message, axiosError);

      case 401:
      case 403:
        console.error('🔐 [SECURITY ALERT] Bridge Authentication Failure. Check BRIDGE_SERVER_TOKEN.');
        return new BridgeAuthError(message, status, axiosError);

      case 404:
        return new BridgeNotFoundError(message, axiosError);

      case 408:
        console.warn('⏱️ [THROTTLING ADVISORY] Bridge Timeout. Consider optimizing OData query selectivity.');
        return new BridgeTimeoutError(message, axiosError);

      case 415:
        return new BridgeUnsupportedMediaTypeError(message, axiosError);

      case 429: {
        const bridgeError = new BridgeRateLimitError(message, axiosError);
        const nowSeconds = Math.floor(Date.now() / 1000);
        const resetAt = bridgeError.resetAt;
        const sleepDuration = (resetAt && resetAt > nowSeconds) ? (resetAt - nowSeconds) : 60;

        console.warn(`🛑 [RATE LIMIT] 429 Triggered. Reset at ${resetAt}. Pausing workers for ${sleepDuration}s.`);
        bridgeWorkerService.pause(sleepDuration);
        
        // Log to health dashboard
        apiHealthService.logQuotaMetrics(0, 0, 0, 0); // Force zero state for tracking
        return bridgeError;
      }

      case 500:
      case 503:
        if (status === 503) {
          console.warn('💥 [SERVICE UNAVAILABLE] Bridge Platform maintenance or overload. Pausing workers for 30s.');
          bridgeWorkerService.pause(30);
        }
        return new BridgeServerError(message, status, axiosError);

      default:
        // Handle network errors or unclassified statuses
        return new BridgeError(message, status, error);
    }
  }
}
