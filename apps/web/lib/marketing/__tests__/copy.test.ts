import { describe, expect, it } from '@jest/globals';
import * as copy from '../copy.js';

describe('Marketing Copy Constants', () => {
  it('should assert all constants are non-empty strings', () => {
    for (const [key, value] of Object.entries(copy)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('should assert no "Analyzer" or "analyzer" remains in marketing copy exports', () => {
    for (const [key, value] of Object.entries(copy)) {
      const lowerVal = value.toLowerCase();
      expect(lowerVal).not.toContain('analyzer');
    }
  });
});
