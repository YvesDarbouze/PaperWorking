export class ProjectDocumentsValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ProjectDocumentsValidationError';
  }
}

export class ProjectDocumentsStorageError extends Error {
  readonly status = 503;

  constructor(message: string) {
    super(message);
    this.name = 'ProjectDocumentsStorageError';
  }
}
