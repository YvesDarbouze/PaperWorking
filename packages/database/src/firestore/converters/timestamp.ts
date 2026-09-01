/** Normalize Firestore Timestamp, ISO string, epoch ms, or Date to Date. */
export function toDate(value: unknown, fieldName: string): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value);
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      return maybe.toDate();
    }
  }
  if (value && typeof value === 'object' && '_seconds' in value) {
    const seconds = Number((value as { _seconds: unknown })._seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  throw new Error(`Invalid timestamp for ${fieldName}`);
}

export function optionalDate(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  return toDate(value, 'timestamp');
}

export function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return String(value);
  return value;
}

export function optionalNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required string field: ${fieldName}`);
  }
  return value;
}
