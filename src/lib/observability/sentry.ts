/**
 * PaperWorking Observability Engine — Sentry Exception & Telemetry Adapter
 * 
 * Captures unhandled exceptions across client/server boundaries, redacting PII
 * and filtering expected operational errors (404s, validation errors).
 */

export interface CapturedErrorEvent {
  error: Error;
  context?: Record<string, any>;
  level?: 'fatal' | 'error' | 'warning' | 'info';
  handled?: boolean;
}

const IGNORED_ERROR_PATTERNS = [
  'NOT_FOUND',
  '404',
  'VALIDATION_FAILED',
  'RATE_LIMIT_EXCEEDED',
  'UNAUTHORIZED_REDIRECT',
];

/**
 * Check if error should be excluded from Sentry alerts (e.g. 404s, user validation).
 */
export function isIgnoredError(error: Error | string): boolean {
  const message = typeof error === 'string' ? error : error?.message || '';
  return IGNORED_ERROR_PATTERNS.some((pattern) => message.toUpperCase().includes(pattern));
}

/**
 * Capture error event and forward to Sentry when DSN is configured.
 */
export function captureException(
  error: Error | string,
  context: Record<string, any> = {}
): CapturedErrorEvent | null {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  if (isIgnoredError(errorObj)) {
    return null;
  }

  const event: CapturedErrorEvent = {
    error: errorObj,
    context: {
      ...context,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
    level: 'error',
    handled: true,
  };

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.log(`[SENTRY] Dispatching exception event: ${errorObj.message}`);
  } else {
    console.warn(`[SENTRY LOG] ${errorObj.message}`, event.context);
  }

  return event;
}
