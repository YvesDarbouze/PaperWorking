#!/usr/bin/env node
/**
 * Idempotent Neon/Auth/Stripe → Firestore backfill (Phase C/D).
 *
 * Usage:
 *   node --import tsx src/migration/cli/backfill-cli.ts --entity=users --dry-run
 *   BACKFILL_CONFIRM=yes node --import tsx src/migration/cli/backfill-cli.ts --entity=users --execute
 *   node --import tsx src/migration/cli/backfill-cli.ts --entity=subscriptions --dry-run
 *   BACKFILL_CONFIRM=yes node --import tsx src/migration/cli/backfill-cli.ts --entity=subscriptions --execute
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createLiveUserBackfillDeps } from '../user-backfill/live-deps.js';
import { runUserBackfill, verifyUserParity } from '../user-backfill/run-user-backfill.js';
import { createLiveStripeLinkageDeps } from '../stripe-linkage/live-deps.js';
import {
  runStripeLinkage,
  verifyStripeLinkageParity,
} from '../stripe-linkage/run-stripe-linkage.js';

function loadEnv(): void {
  const root = resolve(process.cwd(), '../../.env');
  config({ path: root });
  config({ path: resolve(process.cwd(), '.env') });
}

function parseArgs(argv: string[]) {
  const dryRun = !argv.includes('--execute');
  const verifyOnly = argv.includes('--verify');
  const entity = argv.find((a) => a.startsWith('--entity='))?.split('=')[1] ?? 'users';
  return { dryRun, verifyOnly, entity };
}

async function runUsersEntity(dryRun: boolean, verifyOnly: boolean): Promise<void> {
  const deps = await createLiveUserBackfillDeps();

  if (verifyOnly) {
    const report = await verifyUserParity(deps);
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.missingFirestoreDoc.length === 0 ? 0 : 2);
  }

  if (!dryRun && process.env.BACKFILL_CONFIRM !== 'yes') {
    console.error(
      'Refusing to write: set BACKFILL_CONFIRM=yes to execute backfill (use --dry-run to preview).',
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'execute',
        entity: 'users',
        firebaseProject: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        databaseReadMode: process.env.DATABASE_READ_MODE ?? '(unset)',
      },
      null,
      2,
    ),
  );

  await runUserBackfill({ dryRun, deps });

  const parity = await verifyUserParity(deps);
  console.log('\n=== PARITY AFTER RUN ===');
  console.log(JSON.stringify(parity, null, 2));

  if (!dryRun && parity.missingFirestoreDoc.length > 0) {
    process.exit(2);
  }
}

async function runSubscriptionsEntity(dryRun: boolean, verifyOnly: boolean): Promise<void> {
  const deps = await createLiveStripeLinkageDeps();

  if (verifyOnly) {
    const report = await verifyStripeLinkageParity(deps);
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.missingStripeIds.length === 0 ? 0 : 2);
  }

  if (!dryRun && process.env.BACKFILL_CONFIRM !== 'yes') {
    console.error(
      'Refusing to write: set BACKFILL_CONFIRM=yes to execute Stripe linkage (use --dry-run to preview).',
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'execute',
        entity: 'subscriptions',
        firebaseProject: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        databaseReadMode: process.env.DATABASE_READ_MODE ?? '(unset)',
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      },
      null,
      2,
    ),
  );

  await runStripeLinkage({ dryRun, deps });

  const parity = await verifyStripeLinkageParity(deps);
  console.log('\n=== BILLING PARITY AFTER RUN ===');
  console.log(JSON.stringify(parity, null, 2));

  if (!dryRun && parity.missingStripeIds.length > 0) {
    console.warn(
      `Note: ${parity.missingStripeIds.length} Stripe subscription(s) remain unlinked (superseded duplicates or unmatched emails — manual review).`,
    );
  }
}

async function main(): Promise<void> {
  loadEnv();
  const { dryRun, verifyOnly, entity } = parseArgs(process.argv.slice(2));

  if (entity === 'users') {
    await runUsersEntity(dryRun, verifyOnly);
    return;
  }

  if (entity === 'subscriptions') {
    await runSubscriptionsEntity(dryRun, verifyOnly);
    return;
  }

  console.error(
    `Unsupported entity "${entity}". Supported: --entity=users, --entity=subscriptions`,
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
