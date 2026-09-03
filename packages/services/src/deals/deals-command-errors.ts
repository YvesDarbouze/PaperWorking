/** Matches Nest BadRequestException for invalid deal command input. */
export class DealsCommandValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'DealsCommandValidationError';
  }
}
