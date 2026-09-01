export class FirestoreReadNotConfiguredError extends Error {
  constructor(message = 'Firestore Admin is not configured') {
    super(message);
    this.name = 'FirestoreReadNotConfiguredError';
  }
}

export class FirestoreReadNotImplementedError extends Error {
  constructor(operation: string) {
    super(`Firestore write operation not implemented during migration: ${operation}`);
    this.name = 'FirestoreReadNotImplementedError';
  }
}

export class FirestoreDocumentParseError extends Error {
  constructor(
    public readonly collection: string,
    public readonly documentId: string,
    message: string,
  ) {
    super(`Failed to parse Firestore document ${collection}/${documentId}: ${message}`);
    this.name = 'FirestoreDocumentParseError';
  }
}
