import { execSync } from 'child_process';

console.log('=== RUNNING PLAYWRIGHT E2E SPEC SUITES ===\n');

try {
  const output = execSync('npx playwright test e2e/nav-contract-v7.spec.ts e2e/deals-*.spec.ts --reporter=list', {
    encoding: 'utf-8',
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: '0' }
  });
  console.log(output);
  console.log('\n✅ PLAYWRIGHT SUITE 100% PASSED!');
} catch (err) {
  console.log(err.stdout || err.message);
  if (err.stderr) console.error(err.stderr);
}
