export function sanitizeDbRecord<T>(record: T): unknown {
  if (record === null || record === undefined) return record;

  if (typeof record === 'bigint') {
    return record <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(record) : record.toString();
  }

  if (record instanceof Date) {
    return record;
  }

  if (Array.isArray(record)) {
    return record.map((item) => sanitizeDbRecord(item));
  }

  if (typeof record === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record as object)) {
      result[key] = sanitizeDbRecord((record as Record<string, unknown>)[key]);
    }
    return result;
  }

  return record;
}
