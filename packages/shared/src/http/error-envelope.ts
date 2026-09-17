import { scrubString } from '../logging/redaction.js';
import { logger } from '../logging/structured-logger.js';
import { errorTracker } from '../telemetry/error-tracker.js';

export interface StructuredErrorBody {
  code: string;
  message: string;
  traceId: string;
}

export interface StructuredErrorEnvelope {
  error: StructuredErrorBody;
}

export type StandardErrorEnvelope = StructuredErrorEnvelope;

/**
 * Deterministically generates a UUID v4 compliant trace ID.
 */
export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sanitizes user-facing error message:
 * 1. Strips Prisma internals (no P2002/P2025/PrismaClient)
 * 2. Strips multi-line and single-line stack traces and "at ..." callframes
 * 3. Scrubs all sensitive tokens and env values via scrubString
 */
export function cleanErrorMessage(msg: unknown): string {
  if (typeof msg !== 'string') return 'An unexpected error occurred.';

  // 1. Prisma internals sanitization
  if (msg.includes('P2002') || msg.includes('Unique constraint failed')) {
    return 'A record with these details already exists.';
  }
  if (
    msg.includes('P2025') ||
    msg.includes('Record to update not found') ||
    msg.includes('Record to delete not found')
  ) {
    return 'The requested record was not found.';
  }
  if (
    msg.includes('PrismaClient') ||
    msg.includes('@prisma/client') ||
    /\bP20\d{2}\b/.test(msg) ||
    /\bP10\d{2}\b/.test(msg)
  ) {
    return 'A database error occurred while processing the request.';
  }

  // 2. Stack trace stripping (both single-line callframes and multi-line traces)
  let cleaned = msg
    .replace(/\s+at\s+[\w$.<>]+\s*\([^)]*\)/gi, '')
    .replace(/\s+at\s+[^\n]+/gi, '')
    .replace(/\/[^:\s)]+:\d+:\d+/g, '')
    .replace(/\s*\(\/[^)]+\)/g, '')
    .replace(/\s*\(file:\/\/[^)]+\)/g, '');

  if (cleaned.includes('\n')) {
    cleaned = cleaned.split('\n')[0].replace(/^Error:\s*/, '').trim();
  }

  return scrubString(cleaned.trim());
}

/**
 * Derives a clean STRING_ENUM error code from HTTP status and optional raw input.
 */
export function deriveErrorCode(status: number, rawCodeOrError?: unknown): string {
  if (typeof rawCodeOrError === 'string') {
    const trimmed = rawCodeOrError.trim();
    if (/^[A-Z][A-Z0-9_]{2,}$/.test(trimmed)) {
      return trimmed;
    }
  }

  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'RESOURCE_NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 504:
      return 'GATEWAY_TIMEOUT';
    default:
      return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR';
  }
}

/**
 * Formats a fully structured error envelope: { error: { code, message, traceId } }.
 * Logs internal details server-side while guaranteeing zero leaks in the client response.
 */
export function formatStructuredErrorEnvelope(
  code: string,
  message: string,
  traceId?: string,
  internalError?: unknown,
  context?: Record<string, unknown>,
): StructuredErrorEnvelope {
  const finalTraceId = traceId || generateTraceId();
  const safeMessage = cleanErrorMessage(message);

  if (internalError) {
    logger.error(`[${code}] ${safeMessage}`, internalError, {
      errorCode: code,
      traceId: finalTraceId,
      ...context,
    });

    errorTracker
      .captureException(internalError, {
        tags: { errorCode: code, traceId: finalTraceId },
        extra: { ...context, traceId: finalTraceId },
      })
      .catch(() => undefined);
  } else {
    logger.warn(`[${code}] ${safeMessage}`, {
      errorCode: code,
      traceId: finalTraceId,
      ...context,
    });
  }

  return {
    error: {
      code,
      message: safeMessage,
      traceId: finalTraceId,
    },
  };
}

/**
 * Standard error formatter conforming to W1-09 structured envelope specification.
 */
export function formatErrorEnvelope(
  code: string,
  message: string,
  internalError?: unknown,
  context?: Record<string, unknown>,
  traceId?: string,
): StructuredErrorEnvelope {
  return formatStructuredErrorEnvelope(code, message, traceId, internalError, context);
}

/**
 * Strips Prisma, database, and stack internals from any unknown error and maps to structured error envelope.
 */
export function sanitizeApiError(
  err: unknown,
  fallbackMessage = 'An unexpected server error occurred.',
  traceId?: string,
): StructuredErrorEnvelope {
  let code = 'INTERNAL_SERVER_ERROR';
  let clientMessage = fallbackMessage;

  const rawMessage = typeof err === 'string' ? err : err instanceof Error ? err.message : '';

  if (rawMessage.includes('P2025') || rawMessage.includes('not found')) {
    code = 'RESOURCE_NOT_FOUND';
    clientMessage = 'The requested resource was not found.';
  } else if (rawMessage.includes('timed out') || rawMessage.includes('timeout')) {
    code = 'GATEWAY_TIMEOUT';
    clientMessage = 'Upstream service request timed out.';
  } else if (err && typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;

    if (typeof errorObj.code === 'string' && errorObj.code.length > 0) {
      if (errorObj.code.startsWith('P20') || errorObj.code.startsWith('P10')) {
        code = errorObj.code === 'P2025' ? 'RESOURCE_NOT_FOUND' : 'DATABASE_ERROR';
        clientMessage =
          errorObj.code === 'P2025'
            ? 'The requested resource was not found.'
            : 'A database error occurred while processing the request.';
      } else {
        code = errorObj.code;
      }
    }

    if (errorObj.name === 'SnapshotIntegrityError') {
      code = 'SNAPSHOT_INTEGRITY_MISMATCH';
      clientMessage = typeof errorObj.message === 'string' ? errorObj.message : 'Snapshot integrity check failed.';
    } else if (errorObj.name === 'ImmutableSnapshotError') {
      code = 'IMMUTABLE_SNAPSHOT_ERROR';
      clientMessage = typeof errorObj.message === 'string' ? errorObj.message : 'Snapshot is immutable.';
    } else if (errorObj.name === 'ZodError') {
      code = 'VALIDATION_ERROR';
      clientMessage = 'Validation failed for the submitted payload.';
    }
  }

  return formatStructuredErrorEnvelope(code, clientMessage, traceId, err);
}

/**
 * Normalizes any route error response body into { error: { code, message, traceId } }.
 */
export function normalizeToStructuredError(
  body: unknown,
  status = 500,
  fallbackTraceId?: string,
  explicitCode?: string,
): StructuredErrorEnvelope {
  const traceId = fallbackTraceId || generateTraceId();

  // 1. Already structured: { error: { code, message, traceId } }
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    body.error &&
    typeof (body as any).error === 'object' &&
    typeof (body as any).error.code === 'string' &&
    typeof (body as any).error.message === 'string'
  ) {
    const existing = (body as any).error;
    return {
      error: {
        code: explicitCode || deriveErrorCode(status, existing.code),
        message: cleanErrorMessage(existing.message),
        traceId: existing.traceId || traceId,
      },
    };
  }

  // 2. Object with error, message, or reason property
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    const rawError = obj.error;
    const rawMessage = obj.message;
    const rawCode = obj.code;

    let derivedCode = explicitCode;
    let messageText = 'An error occurred while processing the request.';

    // Prisma internals sanitization (never leak P2002/P2025 as error code)
    if (typeof rawCode === 'string' && /^P\d{4}$/.test(rawCode)) {
      if (rawCode === 'P2002') {
        derivedCode = derivedCode || 'CONFLICT';
        messageText = 'A record with these details already exists.';
      } else if (rawCode === 'P2025') {
        derivedCode = derivedCode || 'NOT_FOUND';
        messageText = 'The requested record was not found.';
      } else {
        derivedCode = derivedCode || 'DATABASE_ERROR';
        messageText = 'A database error occurred while processing the request.';
      }
    } else {
      if (!derivedCode) {
        if (typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{2,}$/.test(rawCode)) {
          derivedCode = rawCode;
        } else if (typeof rawError === 'string' && /^[A-Z][A-Z0-9_]{2,}$/.test(rawError)) {
          derivedCode = rawError;
        } else {
          derivedCode = deriveErrorCode(status);
        }
      }

      if (typeof rawMessage === 'string') {
        messageText = rawMessage;
      } else if (typeof rawError === 'string') {
        messageText = rawError;
      } else if (typeof obj.reason === 'string') {
        messageText = obj.reason;
      }
    }

    return {
      error: {
        code: derivedCode,
        message: cleanErrorMessage(messageText),
        traceId,
      },
    };
  }

  // 3. String message
  if (typeof body === 'string') {
    return {
      error: {
        code: explicitCode || deriveErrorCode(status),
        message: cleanErrorMessage(body),
        traceId,
      },
    };
  }

  return {
    error: {
      code: explicitCode || deriveErrorCode(status),
      message: status >= 500 ? 'An unexpected server error occurred.' : 'Invalid request.',
      traceId,
    },
  };
}
