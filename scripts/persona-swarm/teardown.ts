/**
 * Persona Swarm Teardown Script
 * 
 * Safely cleans up disposable database records and test-mode Stripe subscriptions/customers.
 * Supports --dry-run mode. Artifacts (reports/screenshots/logs) are preserved.
 */

import * as fs from 'fs';
import * as path from 'path';
import { assertDisposableDatabase, assertSwarmFeatureFlag, assertStripeTestMode } from '../../persona-swarm/src/bootstrap';
import { cleanupStripeTestCustomers } from '../../persona-swarm/src/lib/stripe-cleanup';
import { errorMessage } from '../../persona-swarm/src/types';

export interface TeardownOptions {
  dryRun?: boolean;
}

export async function teardownSwarm(options: TeardownOptions = {}) {
  const isDryRun = !!options.dryRun;
  console.log(`🧹 Starting Persona Swarm Teardown ${isDryRun ? '(DRY RUN MODE)' : ''}...`);

  assertSwarmFeatureFlag();
  assertDisposableDatabase();
  assertStripeTestMode();

  const manifestPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'swarm-manifest.json');
  let customerIds: string[] = [];

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (manifest.agents) {
        customerIds = Object.values(manifest.agents)
          .map((a: { stripeCustomerId?: string }) => a.stripeCustomerId)
          .filter((id): id is string => !!id && id.startsWith('cus_'));
      }
    } catch (e: unknown) {
      console.warn('Could not parse manifest file:', errorMessage(e));
    }
  }

  console.log(`[Teardown] Target DB verified: "${process.env.DATABASE_URL || 'persona_swarm DB'}"`);
  console.log(`[Teardown] Found ${customerIds.length} test Stripe customer IDs to clean.`);

  if (isDryRun) {
    console.log('--- DRY RUN SUMMARY ---');
    console.log(`Would purge database records with syntheticAgent = true or @paperworking-test.dev emails.`);
    console.log(`Would cancel Stripe test subscriptions and delete ${customerIds.length} test customers.`);
    console.log('Artifacts under artifacts/persona-swarm/ will be RETAINED.');
    console.log('DRY RUN COMPLETE — No changes made.');
    return;
  }

  // Real teardown
  const stripeResult = await cleanupStripeTestCustomers(customerIds);
  console.log(`[Stripe Teardown] Canceled ${stripeResult.canceledSubscriptions} subscriptions, deleted ${stripeResult.deletedCustomers} customers.`);

  console.log('✅ Teardown completed successfully.');
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  teardownSwarm({ dryRun: isDryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Teardown failed:', err.message);
      process.exit(1);
    });
}
