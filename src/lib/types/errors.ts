import { AxiosError } from 'axios';

/**
 * 🌉 Base Bridge Error
 */
export class BridgeError extends Error {
  public readonly status?: number;
  public readonly originalError: AxiosError | Error;
  public readonly timestamp: number;

  constructor(message: string, status?: number, originalError?: AxiosError | Error) {
    super(message);
    this.name = 'BridgeError';
    this.status = status;
    this.originalError = originalError || new Error(message);
    this.timestamp = Date.now();
  }
}

/** 🚨 400 Bad Request: OData Syntax / Malformed Payload */
export class BridgeBadRequestError extends BridgeError {
  constructor(message: string, originalError?: AxiosError) {
    super(message, 400, originalError);
    this.name = 'BridgeBadRequestError';
  }
}

/** 🔐 401/403: Authentication or Authorization Failure */
export class BridgeAuthError extends BridgeError {
  constructor(message: string, status: 401 | 403, originalError?: AxiosError) {
    super(message, status, originalError);
    this.name = 'BridgeAuthError';
  }
}

/** 🔍 404: Resource Not Found */
export class BridgeNotFoundError extends BridgeError {
  constructor(message: string, originalError?: AxiosError) {
    super(message, 404, originalError);
    this.name = 'BridgeNotFoundError';
  }
}

/** ⏱️ 408: Request Timeout (Bridge side) */
export class BridgeTimeoutError extends BridgeError {
  constructor(message: string, originalError?: AxiosError) {
    super(message, 408, originalError);
    this.name = 'BridgeTimeoutError';
  }
}

/** 📁 415: Unsupported Media Type (Header Mismatch) */
export class BridgeUnsupportedMediaTypeError extends BridgeError {
  constructor(message: string, originalError?: AxiosError) {
    super(message, 415, originalError);
    this.name = 'BridgeUnsupportedMediaTypeError';
  }
}

/** 🛑 429: Too Many Requests (Quota Depletion) */
export class BridgeRateLimitError extends BridgeError {
  public readonly resetAt?: number;

  constructor(message: string, originalError?: AxiosError) {
    super(message, 429, originalError);
    this.name = 'BridgeRateLimitError';
    
    // Attempt to extract reset time from headers
    const appReset = originalError?.response?.headers['application-ratelimit-reset'];
    const burstReset = originalError?.response?.headers['burst-ratelimit-reset'];
    this.resetAt = Math.max(parseInt(appReset || '0', 10), parseInt(burstReset || '0', 10)) || undefined;
  }
}

/** 💥 500/503: Bridge Server Failures / Maintenance */
export class BridgeServerError extends BridgeError {
  constructor(message: string, status: 500 | 503, originalError?: AxiosError) {
    super(message, status, originalError);
    this.name = 'BridgeServerError';
  }
}
