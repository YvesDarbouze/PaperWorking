#!/usr/bin/env node
/**
 * scripts/migrate-plaid-tokens.ts
 *
 * CLI Runner for in-place Plaid token migration.
 */

import { migratePlaidTokens } from '../apps/api/dist/scripts/migrate-plaid-tokens.js';

migratePlaidTokens({
  dryRun: process.argv.includes('--dry-run'),
  verbose: true,
})
  .then((stats) => {
    console.log('[Migrate Plaid Tokens] Completed successfully with stats:', stats);
    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('[Migrate Plaid Tokens] Fatal error:', err);
    process.exit(1);
  });
