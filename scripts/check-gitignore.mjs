import { execSync } from 'node:child_process';

/**
 * CI assertion script verifying that sensitive and ephemeral data paths
 * are strictly covered by .gitignore.
 */
const requiredIgnoredPaths = [
  'apps/web/.data/',
  'apps/web/.data/calculator-snapshots.json',
  '.data/',
  '.data/test.json',
];

console.log('Verifying .gitignore coverage for ephemeral data paths...');

let hasFailure = false;

for (const path of requiredIgnoredPaths) {
  try {
    const result = execSync(`git check-ignore "${path}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!result) {
      console.error(`❌ [FAIL] Path is NOT ignored by git: ${path}`);
      hasFailure = true;
    } else {
      console.log(`✓ Ignored: ${path} (matched rule: ${result})`);
    }
  } catch {
    console.error(`❌ [FAIL] git check-ignore returned non-zero for: ${path}`);
    hasFailure = true;
  }
}

if (hasFailure) {
  console.error('\n[FATAL] .gitignore verification failed! Uncommitted data leaks possible.');
  process.exit(1);
}

console.log('\n[PASS] All required data paths are strictly ignored by git.');
