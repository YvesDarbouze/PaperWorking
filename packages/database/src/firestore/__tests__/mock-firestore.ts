import type { Firestore } from 'firebase-admin/firestore';

type WhereFilter = {
  field: string;
  op: string;
  value: unknown;
};

export type MockFirestoreDocument = {
  id: string;
  data: Record<string, unknown>;
  collectionPath?: string;
};

class MockDocumentSnapshot {
  constructor(
    public readonly id: string,
    private readonly record: Record<string, unknown> | null,
    public readonly ref?: MockDocumentReference,
  ) {}

  get exists(): boolean {
    return this.record !== null;
  }

  data(): Record<string, unknown> | undefined {
    return this.record ?? undefined;
  }
}

class MockDocumentReference {
  constructor(
    private readonly store: MockFirestore,
    readonly collectionName: string,
    public readonly id: string,
  ) {}

  get path(): string {
    return `${this.collectionName}/${this.id}`;
  }

  collection(name: string): MockCollectionReference {
    return new MockCollectionReference(this.store, `${this.collectionName}/${this.id}/${name}`);
  }

  async get(): Promise<MockDocumentSnapshot> {
    const record = this.store.getDocument(this.collectionName, this.id);
    return new MockDocumentSnapshot(this.id, record, this);
  }

  async set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void> {
    this.store.setDocument(this.collectionName, this.id, data, options?.merge ?? false);
  }

  async delete(): Promise<void> {
    this.store.deleteDocument(this.collectionName, this.id);
  }
}

class MockQuery {
  private readonly filters: WhereFilter[];
  private readonly collectionGroupName?: string;

  constructor(
    private readonly store: MockFirestore,
    private readonly collection: string,
    filters: WhereFilter[],
    collectionGroupName?: string,
  ) {
    this.filters = filters;
    this.collectionGroupName = collectionGroupName;
  }

  where(field: string, op: string, value: unknown): MockQuery {
    return new MockQuery(
      this.store,
      this.collection,
      [...this.filters, { field, op, value }],
      this.collectionGroupName,
    );
  }

  limit(_n: number): MockQuery {
    return this;
  }

  async get(): Promise<{ docs: MockDocumentSnapshot[]; empty: boolean; size: number }> {
    const docs = this.store
      .query(this.collection, this.filters, this.collectionGroupName)
      .map((doc) => {
        const ref = doc.collectionPath
          ? new MockDocumentReference(this.store, doc.collectionPath, doc.id)
          : undefined;
        return new MockDocumentSnapshot(doc.id, doc.data, ref);
      });
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class MockCollectionGroupReference {
  constructor(
    private readonly store: MockFirestore,
    private readonly name: string,
  ) {}

  where(field: string, op: string, value: unknown): MockQuery {
    return new MockQuery(this.store, this.name, [{ field, op, value }], this.name);
  }

  async get(): Promise<{ docs: MockDocumentSnapshot[]; empty: boolean; size: number }> {
    const docs = this.store
      .query(this.name, [], this.name)
      .map((doc) => {
        const ref = doc.collectionPath
          ? new MockDocumentReference(this.store, doc.collectionPath, doc.id)
          : undefined;
        return new MockDocumentSnapshot(doc.id, doc.data, ref);
      });
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class MockCollectionReference {
  constructor(
    private readonly store: MockFirestore,
    private readonly name: string,
  ) {}

  doc(id: string): MockDocumentReference {
    return new MockDocumentReference(this.store, this.name, id);
  }

  where(field: string, op: string, value: unknown): MockQuery {
    return new MockQuery(this.store, this.name, [{ field, op, value }]);
  }

  async get(): Promise<{ docs: MockDocumentSnapshot[]; empty: boolean; size: number }> {
    const docs = this.store
      .query(this.name, [])
      .map((doc) => new MockDocumentSnapshot(doc.id, doc.data));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

export class MockFirestore {
  private readonly collections = new Map<string, Map<string, Record<string, unknown>>>();

  collection(name: string): MockCollectionReference {
    return new MockCollectionReference(this, name);
  }

  collectionGroup(name: string): MockCollectionGroupReference {
    return new MockCollectionGroupReference(this, name);
  }

  doc(path: string): MockDocumentReference {
    const parts = path.split('/').filter(Boolean);
    const id = parts.pop() ?? '';
    const collection = parts.join('/');
    return new MockDocumentReference(this, collection, id);
  }

  async runTransaction<T>(
    fn: (tx: {
      get(ref: MockDocumentReference): Promise<MockDocumentSnapshot>;
      set(ref: MockDocumentReference, data: Record<string, unknown>, opts?: { merge?: boolean }): void;
      delete(ref: MockDocumentReference): void;
    }) => Promise<T>,
  ): Promise<T> {
    const tx = {
      get: (ref: MockDocumentReference) => ref.get(),
      set: (ref: MockDocumentReference, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
        this.setDocument(ref.collectionName, ref.id, data, opts?.merge ?? false);
      },
      delete: (ref: MockDocumentReference) => {
        this.deleteDocument(ref.collectionName, ref.id);
      },
    };
    return fn(tx);
  }

  setDocument(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    merge: boolean,
  ): void {
    const col = this.collections.get(collection) ?? new Map<string, Record<string, unknown>>();
    const prev = col.get(id) ?? {};
    const resolved = resolveWritePayload(data);
    col.set(id, merge ? { ...prev, ...resolved } : { ...resolved });
    this.collections.set(collection, col);
  }

  deleteDocument(collection: string, id: string): void {
    this.collections.get(collection)?.delete(id);
  }

  seed(collection: string, documents: MockFirestoreDocument[]): void {
    const col = new Map<string, Record<string, unknown>>();
    for (const doc of documents) {
      col.set(doc.id, doc.data);
    }
    this.collections.set(collection, col);
  }

  getDocument(collection: string, id: string): Record<string, unknown> | null {
    return this.collections.get(collection)?.get(id) ?? null;
  }

  query(collection: string, filters: WhereFilter[], collectionGroupName?: string): MockFirestoreDocument[] {
    const entries: MockFirestoreDocument[] = [];

    for (const [storedCollectionPath, col] of this.collections.entries()) {
      if (collectionGroupName) {
        if (!storedCollectionPath.endsWith(`/${collectionGroupName}`)) continue;
      } else if (storedCollectionPath !== collection) {
        continue;
      }

      for (const [id, data] of col.entries()) {
        if (filters.every((f) => matchesFilter(data, f))) {
          entries.push({
            id,
            data,
            collectionPath: storedCollectionPath,
          });
        }
      }
    }

    return entries;
  }
}

function matchesFilter(data: Record<string, unknown>, filter: WhereFilter): boolean {
  if (filter.op === '==') {
    return data[filter.field] === filter.value;
  }
  if (filter.op === 'in' && Array.isArray(filter.value)) {
    return filter.value.includes(data[filter.field]);
  }
  return false;
}

function isServerTimestamp(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value instanceof Date) return false;
  if ('toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return false;
  }
  const name = (value as object).constructor?.name;
  return name === 'ServerTimestampTransform';
}

function resolveWritePayload(data: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    resolved[key] = isServerTimestamp(value) ? ts(new Date().toISOString()) : value;
  }
  return resolved;
}

export function createMockFirestoreFactory(mock: MockFirestore): () => Promise<Firestore | null> {
  return async () => mock as unknown as Firestore;
}

export function ts(date: string): { toDate: () => Date } {
  const value = new Date(date);
  return { toDate: () => value };
}
