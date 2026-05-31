/**
 * Deep Diff Utility
 *
 * Compares two objects recursively, returning an array of changed leaf values
 * with their dot-notation field paths. Used by the activity log system to
 * produce granular audit entries.
 *
 * Design decisions:
 *   - Arrays are compared by JSON equality (not element-wise) to keep the
 *     audit log entries atomic. A future version could diff arrays element-wise
 *     if the UX needs it.
 *   - `undefined` and missing keys are treated as equivalent (both mean "absent").
 *   - Firestore Timestamps are coerced to ISO strings before comparison.
 */

export interface FieldChange {
  fieldPath: string;
  oldValue: any;
  newValue: any;
}

/**
 * Coerce Firestore Timestamps and Dates to ISO strings for stable comparison.
 * Returns the original value for everything else.
 */
function normalizeValue(val: any): any {
  if (val === null || val === undefined) return val;
  // Firestore admin Timestamp
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  // Firestore Timestamp-like objects
  if (val?._seconds !== undefined) return new Date(val._seconds * 1000).toISOString();
  // JS Date
  if (val instanceof Date) return val.toISOString();
  return val;
}

/**
 * Check if a value is a plain object (not array, date, null, etc.)
 */
function isPlainObject(val: any): val is Record<string, any> {
  return (
    val !== null &&
    typeof val === 'object' &&
    !Array.isArray(val) &&
    !(val instanceof Date) &&
    typeof val?.toDate !== 'function' &&
    val?._seconds === undefined
  );
}

/**
 * Deep diff two objects, returning array of {fieldPath, oldValue, newValue}
 * for all changed leaf values.
 *
 * @param before  The previous state of the object
 * @param after   The new state of the object
 * @param prefix  Internal: current dot-notation path (for recursion)
 * @returns       Array of field changes (empty if objects are equal)
 */
export function deepDiff(
  before: Record<string, any>,
  after: Record<string, any>,
  prefix = ''
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Collect all unique keys from both objects
  const allKeys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  for (const key of allKeys) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    const rawOld = before?.[key];
    const rawNew = after?.[key];

    const oldVal = normalizeValue(rawOld);
    const newVal = normalizeValue(rawNew);

    // Both undefined/missing → no change
    if (oldVal === undefined && newVal === undefined) continue;

    // Both are plain objects → recurse
    if (isPlainObject(rawOld) && isPlainObject(rawNew)) {
      changes.push(...deepDiff(rawOld, rawNew, fullPath));
      continue;
    }

    // One is a plain object and the other is null/undefined → recurse with empty
    if (isPlainObject(rawNew) && (rawOld === undefined || rawOld === null)) {
      changes.push(...deepDiff({}, rawNew, fullPath));
      continue;
    }
    if (isPlainObject(rawOld) && (rawNew === undefined || rawNew === null)) {
      changes.push(...deepDiff(rawOld, {}, fullPath));
      continue;
    }

    // One is a plain object and the other is a different type (type changed) → leaf change
    if (isPlainObject(rawOld) !== isPlainObject(rawNew)) {
      changes.push({ fieldPath: fullPath, oldValue: oldVal, newValue: newVal });
      continue;
    }

    // Arrays → compare by JSON serialization
    if (Array.isArray(oldVal) || Array.isArray(newVal)) {
      const oldJson = JSON.stringify(oldVal ?? null);
      const newJson = JSON.stringify(newVal ?? null);
      if (oldJson !== newJson) {
        changes.push({ fieldPath: fullPath, oldValue: oldVal, newValue: newVal });
      }
      continue;
    }

    // Scalar comparison
    if (oldVal !== newVal) {
      changes.push({
        fieldPath: fullPath,
        oldValue: oldVal ?? null,
        newValue: newVal ?? null,
      });
    }
  }

  return changes;
}
