/** Matches Nest BadRequestException for invalid follow input. */
export class MarketplaceFollowCommandValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'MarketplaceFollowCommandValidationError';
  }
}
