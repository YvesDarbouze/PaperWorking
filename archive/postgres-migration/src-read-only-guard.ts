export class ReadOnlyDatabaseError extends Error {
  readonly code = 'READ_ONLY_DATABASE';

  constructor(message: string) {
    super(message);
    this.name = 'ReadOnlyDatabaseError';
  }
}

const WRITE_METHODS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

const BLOCKED_CLIENT_METHODS = new Set(['$executeRaw', '$executeRawUnsafe']);

function wrapModelDelegate<T extends object>(modelName: string, delegate: T): T {
  return new Proxy(delegate, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && WRITE_METHODS.has(prop)) {
        return () => {
          throw new ReadOnlyDatabaseError(
            `Write operation "${modelName}.${prop}" is blocked in @paperworking/database (read-only Phase 3).`,
          );
        };
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/** Wrap a PrismaClient so model write methods throw at runtime. */
export function asReadOnlyClient<TClient extends object>(client: TClient): TClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && BLOCKED_CLIENT_METHODS.has(prop)) {
        return () => {
          throw new ReadOnlyDatabaseError(
            `Client method "${prop}" is blocked in @paperworking/database (read-only Phase 3).`,
          );
        };
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'object' && value !== null && typeof prop === 'string' && !prop.startsWith('$')) {
        return wrapModelDelegate(prop, value);
      }

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    },
  }) as TClient;
}
