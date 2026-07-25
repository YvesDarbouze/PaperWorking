import { deepDiff } from '../deepDiff';

describe('deepDiff', () => {
  // ── Basic scalar changes ──────────────────────────────

  it('returns empty array when objects are identical', () => {
    const obj = { a: 1, b: 'hello', c: true };
    expect(deepDiff(obj, { ...obj })).toEqual([]);
  });

  it('detects changed scalar values', () => {
    const before = { a: 1, b: 'hello' };
    const after = { a: 2, b: 'hello' };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'a', oldValue: 1, newValue: 2 },
    ]);
  });

  it('detects multiple changed fields', () => {
    const before = { a: 1, b: 'hello', c: true };
    const after = { a: 2, b: 'world', c: true };
    const result = deepDiff(before, after);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ fieldPath: 'a', oldValue: 1, newValue: 2 });
    expect(result).toContainEqual({ fieldPath: 'b', oldValue: 'hello', newValue: 'world' });
  });

  // ── Added and removed keys ────────────────────────────

  it('detects added keys', () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'b', oldValue: null, newValue: 2 },
    ]);
  });

  it('detects removed keys (value becomes undefined)', () => {
    const before = { a: 1, b: 2 };
    const after = { a: 1 };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'b', oldValue: 2, newValue: null },
    ]);
  });

  // ── Nested object diffing ─────────────────────────────

  it('diffs nested objects with dot-notation paths', () => {
    const before = { financials: { purchasePrice: 200000, loanAmount: 150000 } };
    const after = { financials: { purchasePrice: 210000, loanAmount: 150000 } };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'financials.purchasePrice', oldValue: 200000, newValue: 210000 },
    ]);
  });

  it('diffs deeply nested objects', () => {
    const before = { a: { b: { c: { d: 1 } } } };
    const after = { a: { b: { c: { d: 2 } } } };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'a.b.c.d', oldValue: 1, newValue: 2 },
    ]);
  });

  it('detects when a nested object is added', () => {
    const before = { a: 1 };
    const after = { a: 1, nested: { x: 10 } };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'nested.x', oldValue: null, newValue: 10 },
    ]);
  });

  // ── Array changes ─────────────────────────────────────

  it('detects array changes', () => {
    const before = { tags: ['a', 'b'] };
    const after = { tags: ['a', 'b', 'c'] };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'tags', oldValue: ['a', 'b'], newValue: ['a', 'b', 'c'] },
    ]);
  });

  it('returns empty array when arrays are identical', () => {
    const before = { tags: [1, 2, 3] };
    const after = { tags: [1, 2, 3] };
    expect(deepDiff(before, after)).toEqual([]);
  });

  it('detects array order changes', () => {
    const before = { items: [1, 2, 3] };
    const after = { items: [3, 2, 1] };
    const result = deepDiff(before, after);
    expect(result).toHaveLength(1);
    expect(result[0].fieldPath).toBe('items');
  });

  // ── Null and undefined handling ───────────────────────

  it('detects null to value change', () => {
    const before = { a: null };
    const after = { a: 42 };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'a', oldValue: null, newValue: 42 },
    ]);
  });

  it('detects value to null change', () => {
    const before = { a: 42 };
    const after = { a: null };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'a', oldValue: 42, newValue: null },
    ]);
  });

  it('treats both undefined as no change', () => {
    const before: any = { a: undefined };
    const after: any = { a: undefined };
    expect(deepDiff(before, after)).toEqual([]);
  });

  // ── Empty objects ─────────────────────────────────────

  it('handles empty before object', () => {
    const result = deepDiff({}, { a: 1 });
    expect(result).toEqual([
      { fieldPath: 'a', oldValue: null, newValue: 1 },
    ]);
  });

  it('handles empty after object', () => {
    const result = deepDiff({ a: 1 }, {});
    expect(result).toEqual([
      { fieldPath: 'a', oldValue: 1, newValue: null },
    ]);
  });

  it('handles both empty objects', () => {
    expect(deepDiff({}, {})).toEqual([]);
  });

  // ── Type changes ──────────────────────────────────────

  it('detects type changes (number → string)', () => {
    const before = { a: 42 };
    const after = { a: '42' };
    const result = deepDiff(before, after);
    expect(result).toEqual([
      { fieldPath: 'a', oldValue: 42, newValue: '42' },
    ]);
  });

  it('detects type changes (object → scalar)', () => {
    const before = { a: { nested: 1 } };
    const after = { a: 'flat' };
    const result = deepDiff(before, after);
    expect(result).toHaveLength(1);
    expect(result[0].fieldPath).toBe('a');
  });

  // ── Date handling ─────────────────────────────────────

  it('normalizes Dates to ISO strings for comparison', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const before = { created: date };
    const after = { created: date };
    // Same date → no change
    expect(deepDiff(before, after)).toEqual([]);
  });

  it('detects Date value changes', () => {
    const before = { created: new Date('2026-01-01') };
    const after = { created: new Date('2026-06-01') };
    const result = deepDiff(before, after);
    expect(result).toHaveLength(1);
    expect(result[0].fieldPath).toBe('created');
  });

  // ── Firestore Timestamp-like objects ──────────────────

  it('normalizes Firestore Timestamp-like objects', () => {
    const ts1 = { _seconds: 1700000000 };
    const ts2 = { _seconds: 1700000000 };
    const before = { created: ts1 };
    const after = { created: ts2 };
    // Same timestamp → no change
    expect(deepDiff(before, after)).toEqual([]);
  });

  it('normalizes objects with toDate() method', () => {
    const ts1 = { toDate: () => new Date('2026-01-01T00:00:00.000Z') };
    const ts2 = { toDate: () => new Date('2026-01-01T00:00:00.000Z') };
    expect(deepDiff({ t: ts1 }, { t: ts2 })).toEqual([]);
  });

  // ── Real-world ProjectFinancials-like scenario ────────

  it('diffs a realistic project financials update', () => {
    const before = {
      status: 'acquisition',
      financials: {
        purchasePrice: 200000,
        loanAmount: 150000,
        projectedRehabCost: 30000,
        monthlyGrossRent: 1800,
      },
      members: { uid1: { role: 'Lead Investor' } },
    };
    const after = {
      status: 'acquisition',
      financials: {
        purchasePrice: 210000, // changed
        loanAmount: 150000,
        projectedRehabCost: 35000, // changed
        monthlyGrossRent: 1800,
      },
      members: { uid1: { role: 'Lead Investor' } },
    };

    const result = deepDiff(before, after);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      fieldPath: 'financials.purchasePrice',
      oldValue: 200000,
      newValue: 210000,
    });
    expect(result).toContainEqual({
      fieldPath: 'financials.projectedRehabCost',
      oldValue: 30000,
      newValue: 35000,
    });
  });
});
