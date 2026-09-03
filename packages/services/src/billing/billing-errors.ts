export class BillingValidationError extends Error {
  readonly status = 400;

  constructor(message: string, readonly payload: Record<string, unknown> = { error: message }) {
    super(message);
    this.name = 'BillingValidationError';
  }
}

export class BillingForbiddenError extends Error {
  readonly status = 403;

  constructor(readonly payload: Record<string, unknown>) {
    super(String(payload.error ?? 'Forbidden'));
    this.name = 'BillingForbiddenError';
  }
}

export class BillingNotFoundError extends Error {
  readonly status = 404;

  constructor(readonly payload: Record<string, unknown> = { error: 'Not found' }) {
    super(String(payload.error ?? 'Not found'));
    this.name = 'BillingNotFoundError';
  }
}

export class BillingUnavailableError extends Error {
  readonly status = 503;

  constructor(readonly payload: Record<string, unknown> = { error: 'Billing unavailable' }) {
    super(String(payload.error ?? 'Billing unavailable'));
    this.name = 'BillingUnavailableError';
  }
}
