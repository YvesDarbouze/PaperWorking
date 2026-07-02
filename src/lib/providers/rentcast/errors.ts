// ─── RentCast Typed Error Hierarchy ───────────────────────────────────────────
// Mirrors the BridgeError pattern from src/lib/types/errors.ts.
// Never exposes raw vendor errors to callers.

export class RentCastError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly endpoint: string;
  public readonly timestamp: number;

  constructor(message: string, opts: { status?: number; code?: string; endpoint: string }) {
    super(message);
    this.name = 'RentCastError';
    this.status = opts.status;
    this.code = opts.code;
    this.endpoint = opts.endpoint;
    this.timestamp = Date.now();
  }
}

/** 400 — bad request / missing parameters */
export class RentCastBadRequestError extends RentCastError {
  constructor(message: string, endpoint: string) {
    super(message, { status: 400, code: 'bad_request', endpoint });
    this.name = 'RentCastBadRequestError';
  }
}

/** 401/403 — invalid or inactive API key */
export class RentCastAuthError extends RentCastError {
  constructor(message: string, endpoint: string, status: number = 401) {
    super(message, { status, code: 'auth_error', endpoint });
    this.name = 'RentCastAuthError';
  }
}

/** 404 — address not found / no data available */
export class RentCastNotFoundError extends RentCastError {
  constructor(message: string, endpoint: string) {
    super(message, { status: 404, code: 'not_found', endpoint });
    this.name = 'RentCastNotFoundError';
  }
}

/** 429 — rate limit exceeded */
export class RentCastRateLimitError extends RentCastError {
  public readonly retryAfterMs?: number;

  constructor(message: string, endpoint: string, retryAfterMs?: number) {
    super(message, { status: 429, code: 'rate_limit', endpoint });
    this.name = 'RentCastRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** 5xx — server errors */
export class RentCastServerError extends RentCastError {
  constructor(message: string, endpoint: string, status: number = 500) {
    super(message, { status, code: 'server_error', endpoint });
    this.name = 'RentCastServerError';
  }
}

/** Billing/subscription inactive */
export class RentCastBillingError extends RentCastError {
  constructor(message: string, endpoint: string) {
    super(message, { status: 403, code: 'billing/subscription-inactive', endpoint });
    this.name = 'RentCastBillingError';
  }
}

/** Not enough comps to generate estimate — non-fatal, callers handle gracefully */
export class RentCastInsufficientDataError extends RentCastError {
  constructor(message: string, endpoint: string) {
    super(message, { status: 200, code: 'insufficient_data', endpoint });
    this.name = 'RentCastInsufficientDataError';
  }
}

/** Network / timeout errors */
export class RentCastNetworkError extends RentCastError {
  constructor(message: string, endpoint: string) {
    super(message, { status: undefined, code: 'network_error', endpoint });
    this.name = 'RentCastNetworkError';
  }
}

// ─── Error Mapping ───────────────────────────────────────────────────────────

/**
 * Maps a raw HTTP response to a typed RentCastError.
 * Called by the client after receiving a non-ok response.
 */
export function mapRentCastError(
  status: number,
  body: any,
  endpoint: string,
): RentCastError {
  const message = body?.message || body?.error || `RentCast API error (${status})`;

  // Billing-specific 403
  if (status === 403 && body?.error === 'billing/subscription-inactive') {
    return new RentCastBillingError(message, endpoint);
  }

  switch (status) {
    case 400:
      return new RentCastBadRequestError(message, endpoint);
    case 401:
      return new RentCastAuthError(message, endpoint, 401);
    case 403:
      return new RentCastAuthError(message, endpoint, 403);
    case 404:
      return new RentCastNotFoundError(message, endpoint);
    case 429: {
      return new RentCastRateLimitError(message, endpoint);
    }
    default:
      if (status >= 500) {
        return new RentCastServerError(message, endpoint, status);
      }
      return new RentCastError(message, { status, endpoint });
  }
}
