import type { Firestore } from 'firebase-admin/firestore';

type WhereFilter = {
  field: string;
  op: string;
  value: unknown;
};

export type MockFirestoreDocument = {
  id: string;
  data: Record<string, unknown>;
};

class MockDocumentSnapshot {
  constructor(
    public readonly id: string,
    private readonly record: Record<string, unknown> | null,
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
    private readonly collection: string,
    public readonly id: string,
  ) {}

  async get(): Promise<MockDocumentSnapshot> {
    const record = this.store.getDocument(this.collection, this.id);
    return new MockDocumentSnapshot(this.id, record);
  }
}

class MockQuery {
  private readonly filters: WhereFilter[];

  constructor(
    private readonly store: MockFirestore,
    private readonly collection: string,
    filters: WhereFilter[],
  ) {
    this.filters = filters;
  }

  where(field: string, op: string, value: unknown): MockQuery {
    return new MockQuery(this.store, this.collection, [
      ...this.filters,
      { field, op, value },
    ]);
  }

  limit(_n: number): MockQuery {
    return this;
  }

  async get(): Promise<{ docs: MockDocumentSnapshot[]; empty: boolean }> {
    const docs = this.store
      .query(this.collection, this.filters)
      .map((doc) => new MockDocumentSnapshot(doc.id, doc.data));
    return { docs, empty: docs.length === 0 };
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
}

export class MockFirestore {
  private readonly collections = new Map<string, Map<string, Record<string, unknown>>>();

  collection(name: string): MockCollectionReference {
    return new MockCollectionReference(this, name);
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

  query(collection: string, filters: WhereFilter[]): MockFirestoreDocument[] {
    const col = this.collections.get(collection);
    if (!col) return [];

    return [...col.entries()]
      .filter(([, data]) => filters.every((f) => matchesFilter(data, f)))
      .map(([id, data]) => ({ id, data }));
  }
}

function matchesFilter(data: Record<string, unknown>, filter: WhereFilter): boolean {
  if (filter.op !== '==') return false;
  return data[filter.field] === filter.value;
}

export function createMockFirestoreFactory(mock: MockFirestore): () => Promise<Firestore | null> {
  return async () => mock as unknown as Firestore;
}

export function ts(date: string): { toDate: () => Date } {
  const value = new Date(date);
  return { toDate: () => value };
}
