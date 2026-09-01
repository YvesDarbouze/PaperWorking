import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

describe('phase B14.1 — deployment readiness artifacts', () => {
  it('preflight script exists and is read-only', () => {
    const script = readFileSync(join(here, '../../../../scripts/firebase-storage-preflight.sh'), 'utf8');
    expect(script).toContain('Read-only');
    expect(script).not.toMatch(/add-iam-policy-binding|iam policy binding/i);
    expect(script).not.toContain('gsutil cp');
  });

  it('apphosting.yaml defines server FIREBASE_STORAGE_BUCKET at runtime', () => {
    const yaml = readFileSync(join(here, '../../../../apphosting.yaml'), 'utf8');
    expect(yaml).toContain('FIREBASE_STORAGE_BUCKET');
    expect(yaml).toContain('paperworking-97055.firebasestorage.app');
  });

  it('deployment doc documents Admin SDK bypasses storage rules', () => {
    const doc = readFileSync(
      join(here, '../../../../docs/PHASE_B14_FIREBASE_STORAGE_DEPLOYMENT.md'),
      'utf8',
    );
    expect(doc).toContain('bypasses');
    expect(doc).toContain('firebase-app-hosting-compute@');
  });
});

describe('phase B14.1 — upload response does not leak storageKey', () => {
  it('command service result type omits storageKey from API document', () => {
    const source = readFileSync(
      join(
        here,
        '../../../../packages/services/src/projects/project-documents-command-service.ts',
      ),
      'utf8',
    );
    expect(source).not.toMatch(/storageKey,\s*\n\s*createdAt/);
  });
});
