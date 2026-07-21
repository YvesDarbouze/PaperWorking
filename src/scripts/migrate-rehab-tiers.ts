import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { adminDb } from '../lib/firebase/admin';

const TIER_MIGRATION_MAP: Record<string, string> = {
  'Staging': 'Stage',
  'Minor Cosmetic': 'Refurbish',
  'Minor Rehab': 'Renovate',
  'Full Rehab': 'Renovate',
  'Gut Renovation': 'Gut',
  'Ground-Up Construction': 'Develop'
};

const budgetMap: Record<string, [number, number]> = {
  'Stage': [1000, 5000],
  'Refurbish': [5000, 20000],
  'Renovate': [20000, 100000],
  'Gut': [100000, 250000],
  'Develop': [250000, 1000000]
};

async function runMigration() {
  console.log('--- 🚀 Starting Rehab Tier Migration ---');
  const snapshot = await adminDb.collection('projects').get();
  console.log(`Found ${snapshot.size} projects in Firestore.`);
  
  let migratedCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const oldTier = data.financials?.rehabTier || data.rehabTier;
    console.log(`Project ID: ${doc.id}`);
    console.log(`  financials.rehabTier: ${data.financials?.rehabTier}`);
    console.log(`  rehabTier: ${data.rehabTier}`);
    console.log(`  oldTier derived: ${oldTier}`);
    if (oldTier && TIER_MIGRATION_MAP[oldTier]) {
      const newTier = TIER_MIGRATION_MAP[oldTier];
      const [low, high] = budgetMap[newTier] || [0, 0];
      console.log(`Migrating Project ${doc.id}: ${oldTier} -> ${newTier} (Budget: ${low} - ${high})`);
      
      const updates: any = {
        rehabTier: newTier,
        rehabTierBudgetLow: low,
        rehabTierBudgetHigh: high,
        updatedAt: new Date().toISOString()
      };
      
      if (data.financials) {
        updates['financials.rehabTier'] = newTier;
        updates['financials.rehabTierBudgetLow'] = low;
        updates['financials.rehabTierBudgetHigh'] = high;
      }
      
      await doc.ref.update(updates);
      migratedCount++;
    } else {
      console.log(`  No legacy tier matched or found.`);
    }
  }
  console.log(`--- 🏁 Rehab Tier Migration Complete. Migrated ${migratedCount} projects. ---`);
}

runMigration().catch(console.error);
