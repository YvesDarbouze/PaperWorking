import { AuthzForbiddenError, AuthzNotFoundError } from '@paperworking/authz';

/** Matches Nest BadRequestException for invalid vendor portal command input. */
export class VendorPortalCommandValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'VendorPortalCommandValidationError';
  }
}

export function vendorProfileNotFound(message: string): AuthzNotFoundError {
  return new AuthzNotFoundError({ error: message });
}

export function vendorPortalForbidden(reason: string): AuthzForbiddenError {
  return new AuthzForbiddenError({ error: 'Forbidden', reason });
}
