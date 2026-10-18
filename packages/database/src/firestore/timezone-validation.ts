import { deriveIanaTimezoneFromAddress } from '@paperworking/financial-engine';

export class ProjectTimezoneValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'TIMEZONE_VALIDATION_ERROR',
  ) {
    super(message);
    this.name = 'ProjectTimezoneValidationError';
  }
}

/**
 * Asserts that a project/deal creation payload has explicitly derived its contractual
 * IANA timezone from the property address, prohibiting silent reliance on a DB default.
 */
export function assertProjectTimezoneDerivation(data: {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  ianaTimezone?: string;
}): string {
  const fullAddress = [data.address, data.city, data.state, data.zip]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(', ');
  const rawAddress = fullAddress || data.address || '';

  if (!rawAddress || rawAddress.trim().length === 0) {
    throw new ProjectTimezoneValidationError(
      'Property address is required to create a project and derive contractual IANA timezone.',
      'MISSING_ADDRESS_FOR_TIMEZONE',
    );
  }

  if (!data.ianaTimezone || data.ianaTimezone.trim().length === 0) {
    throw new ProjectTimezoneValidationError(
      'Project creation requires explicit IANA timezone derivation at write time; relying on column default is forbidden.',
      'OMITTED_TIMEZONE_DERIVATION',
    );
  }

  const canonicalTz = deriveIanaTimezoneFromAddress(rawAddress);
  if (data.ianaTimezone !== canonicalTz) {
    throw new ProjectTimezoneValidationError(
      `Project creation timezone mismatch: address "${rawAddress}" derives "${canonicalTz}", but received "${data.ianaTimezone}".`,
      'INVALID_DERIVED_TIMEZONE',
    );
  }

  return canonicalTz;
}
