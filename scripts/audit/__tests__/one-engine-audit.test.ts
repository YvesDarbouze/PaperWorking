import { runOneEngineAudit } from '../one-engine-audit';

describe('Audit Suite 1: One-Engine Rule Codebase Audit', () => {
  test('Scans entire codebase and verifies 0 One-Engine Rule violations', () => {
    const { totalFilesScanned, violations } = runOneEngineAudit();

    expect(totalFilesScanned).toBeGreaterThan(0);
    if (violations.length > 0) {
      console.error('One-Engine Rule Violations Found:', violations);
    }
    expect(violations.length).toBe(0);
  });
});
