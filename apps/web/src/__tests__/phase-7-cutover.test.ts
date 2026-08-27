import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEB_APP_STATUS } from '../index.js';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../../../../');

describe('phase 7 — cutover planning status', () => {
  it('includes cutover planning artifacts', () => {
    expect(existsSync(join(REPO_ROOT, 'docs/PHASE_7_CUTOVER_PLAN.md'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'docs/FOUNDER_APPROVAL.md'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'infrastructure/Dockerfile'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'infrastructure/apphosting.migration.yaml.template'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'infrastructure/scripts/pre-cutover-checklist.sh'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'tests/e2e/playwright.config.ts'))).toBe(true);
  });
});
