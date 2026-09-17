#!/usr/bin/env node
/**
 * Cross-lane Smoke Test Runner for Wave 1 Integration & Merge Gate
 *
 * Runs all cross-lane test suites together in one invocation:
 * - DSR Lifecycle: apps/web/src/__tests__/dsr-lifecycle.test.ts
 * - Durable Jobs Runner: apps/web/src/__tests__/durable-jobs-runner-web.test.ts, packages/database/src/__tests__/job-repository.test.ts
 * - Authz Matrix (Web + API): apps/web/src/__tests__/authz-matrix-web.test.ts, apps/api/src/__tests__/authz-matrix.test.ts
 * - Plaid Suites (API + Web): apps/api/src/__tests__/plaid-*.test.ts, apps/web/src/__tests__/plaid-*.test.ts*
 * - Support-Hardening: apps/web/src/__tests__/support-security-hardening.test.ts
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const SUITES = [
  {
    name: 'Database: Durable Jobs Repository & Snapshot Crypto-Shredding',
    workspace: '@paperworking/database',
    files: ['src/__tests__/job-repository.test.ts', 'src/__tests__/snapshot-crypto-shredding.test.ts'],
  },
  {
    name: 'API: Authz Matrix & Plaid Token Vault / Disconnect Lifecycle / Env Separation',
    workspace: '@paperworking/api',
    files: [
      'src/__tests__/authz-matrix.test.ts',
      'src/__tests__/durable-jobs-runner.test.ts',
      'src/__tests__/plaid-token-vault.test.ts',
      'src/__tests__/plaid-disconnect-lifecycle.test.ts',
      'src/__tests__/plaid-env-separation.test.ts',
      'src/__tests__/plaid-webhook-verification.test.ts',
      'src/__tests__/plaid-login-repair.test.ts',
      'src/__tests__/plaid-migration-script.test.ts',
    ],
  },
  {
    name: 'Web: DSR Lifecycle, Durable Jobs, Authz Matrix, Support Hardening, Plaid UI, Rules, Quota, Bot Defense & Observability',
    workspace: '@paperworking/web',
    files: [
      'src/__tests__/dsr-lifecycle.test.ts',
      'src/__tests__/durable-jobs-runner-web.test.ts',
      'src/__tests__/authz-matrix-web.test.ts',
      'src/__tests__/support-security-hardening.test.ts',
      'src/__tests__/plaid-consent-modal.test.tsx',
      'src/__tests__/plaid-web-routes.test.ts',
      'src/__tests__/plaid-ui-components.test.tsx',
      'src/__tests__/rules-unit-testing.test.ts',
      'src/__tests__/claims-sync.test.ts',
      'src/__tests__/rentcast-quota-and-cache.test.ts',
      'src/__tests__/turnstile-bot-defense.test.tsx',
      'src/__tests__/support-anti-abuse.test.ts',
      'src/__tests__/redaction-drift.test.ts',
      'src/__tests__/structured-error-envelope.test.ts',
      'src/__tests__/health-vs-ready-probes.test.ts',
      'src/__tests__/alert-engine.test.ts',
    ],
  },
];

console.log('================================================================================');
console.log(' WAVE 1 CROSS-LANE SMOKE TEST SUITE (ONE INVOCATION)');
console.log('================================================================================\n');

let hasFailure = false;

for (const group of SUITES) {
  console.log(`\n[Running Group] ${group.name}`);
  console.log(`Workspace: ${group.workspace}`);
  console.log(`Files: ${group.files.join(' ')}\n`);

  const args = ['run', 'test', `--workspace=${group.workspace}`, '--', ...group.files];
  const res = spawnSync('npm', args, {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  if (res.status !== 0) {
    console.error(`\n[FAIL] Group "${group.name}" failed with exit code ${res.status}`);
    hasFailure = true;
  } else {
    console.log(`\n[PASS] Group "${group.name}" completed successfully.`);
  }
}

console.log('\n================================================================================');
if (hasFailure) {
  console.error(' [FAIL] ONE OR MORE CROSS-LANE SUITES FAILED');
  console.log('================================================================================');
  process.exit(1);
} else {
  console.log(' [PASS] ALL CROSS-LANE SMOKE TEST SUITES PASSED SUCCESSFULLY');
  console.log('================================================================================');
  process.exit(0);
}
