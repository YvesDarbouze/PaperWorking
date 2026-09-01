/** Matches Nest BadRequestException for invalid deal communication input. */
export class DealCommunicationValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'DealCommunicationValidationError';
  }
}
