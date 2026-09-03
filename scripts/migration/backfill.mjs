#!/usr/bin/env node
/**
 * Root wrapper for Phase C backfill CLI.
 * @see packages/database/src/migration/cli/backfill-cli.ts
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, '../../packages/database/src/migration/cli/backfill-cli.ts');
const args = process.argv.slice(2);

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', cli, ...args],
  { stdio: 'inherit', cwd: join(here, '../../packages/database') },
);

process.exit(result.status ?? 1);
