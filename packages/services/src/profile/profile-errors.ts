export class ProfileForbiddenError extends Error {
  readonly status = 403;

  constructor(readonly payload: Record<string, unknown>) {
    super(String(payload.error ?? 'Forbidden'));
    this.name = 'ProfileForbiddenError';
  }
}

export class ProfileValidationError extends Error {
  readonly status = 400;

  constructor(readonly payload: Record<string, unknown>) {
    super(String(payload.error ?? 'Bad request'));
    this.name = 'ProfileValidationError';
  }
}

export class ProfileNotFoundError extends Error {
  readonly status = 404;

  constructor(readonly payload: Record<string, unknown> = { error: 'User not found' }) {
    super(String(payload.error ?? 'User not found'));
    this.name = 'ProfileNotFoundError';
  }
}
