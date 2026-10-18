import { describe, expect, it } from '@jest/globals';
import path from 'node:path';
import { createRequire } from 'node:module';
import { toFirestoreSafe, fromFirestoreSafe } from '../../lib/projects/project-store.js';

const require = createRequire(import.meta.url);

function hasNestedArray(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => Array.isArray(item) || hasNestedArray(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) => hasNestedArray(v));
  }
  return false;
}

function hasInvalidScalar(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value === 'number' && !Number.isFinite(value)) return true;
  if (Array.isArray(value)) return value.some((v) => hasInvalidScalar(v));
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) => hasInvalidScalar(v));
  }
  return false;
}

describe('Project Firestore sanitizer (nested arrays / undefined / NaN)', () => {
  it('encodes nested arrays into Firestore-safe maps and round-trips the original shape', () => {
    const sensitivityGrids = {
      rentVsExitValue: {
        gridType: 'rent_vs_exit_value',
        rowSteps: [-10, -5, 0, 5, 10],
        colSteps: [-10, -5, 0, 5, 10],
        cells: [
          [{ rowStep: -10, colStep: -10, irrPct: -16 }, { rowStep: -10, colStep: -5, irrPct: -12 }],
          [{ rowStep: -5, colStep: -10, irrPct: -8 }, { rowStep: -5, colStep: -5, irrPct: -4 }],
        ],
      },
    };

    const encoded = toFirestoreSafe({ underwritingSnapshot: { outputs: { sensitivityGrids } } });

    expect(hasNestedArray(encoded)).toBe(false);
    expect(hasInvalidScalar(encoded)).toBe(false);

    // Real Firestore serializer must accept the encoded payload.
    const serializer = require(
      path.join(process.cwd(), '../../node_modules/@google-cloud/firestore/build/src/serializer.js'),
    );
    expect(() => serializer.validateUserInput(encoded, false)).not.toThrow();

    // Readers get the original nested-array shape back.
    const decoded = fromFirestoreSafe(encoded) as typeof encoded;
    expect(decoded.underwritingSnapshot.outputs.sensitivityGrids).toEqual(sensitivityGrids);
  });

  it('strips undefined and replaces non-finite numbers with null', () => {
    const encoded = toFirestoreSafe({
      a: undefined,
      b: NaN,
      c: Infinity,
      d: { e: undefined, f: -Infinity },
      g: [1, undefined, Number.POSITIVE_INFINITY],
    }) as Record<string, unknown>;

    expect(hasInvalidScalar(encoded)).toBe(false);
    expect('a' in encoded).toBe(false);
    expect(encoded.b).toBeNull();
    expect(encoded.c).toBeNull();
    expect((encoded.d as Record<string, unknown>).e).toBeUndefined();
    expect(encoded.g).toEqual([1, null]);
  });

  it('keeps flat arrays and plain values untouched through the round-trip', () => {
    const payload = {
      id: 'proj-1',
      tasks: [{ id: 't1', title: 'Task', subtasks: [{ id: 's1' }] }],
      numbers: [1, 2, 3],
      nested: { deep: { value: 'x' } },
    };
    const decoded = fromFirestoreSafe(toFirestoreSafe(payload));
    expect(decoded).toEqual(payload);
  });
});
