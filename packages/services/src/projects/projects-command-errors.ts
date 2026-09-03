/** Matches Nest BadRequestException for invalid project command input. */
export class ProjectsCommandValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ProjectsCommandValidationError';
  }
}
