export class AuthzForbiddenError extends Error {
  readonly status = 403;

  constructor(public readonly payload: Record<string, unknown>) {
    super('Forbidden');
    this.name = 'AuthzForbiddenError';
  }
}

export class AuthzNotFoundError extends Error {
  readonly status = 404;

  constructor(public readonly payload: Record<string, unknown>) {
    super('Not found');
    this.name = 'AuthzNotFoundError';
  }
}
