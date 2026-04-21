import * as dotenv from 'dotenv';
import { adminDb } from '../src/lib/firebase/admin';
import { financialsSyncService } from '../src/lib/services/financialsSyncService';
import type { Project, LedgerItem } from '../src/types/schema';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

/**
 * ── Backfill Utility: Firestore ➔ Postgres ──
 * Performs a deep synchronization of all existing deals and their ledger items.
 * 
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/sync-firestore-to-postgres.ts
 */

async function main() {
  console.log('🚀 [BACKFILL] Starting deep synchronization...');
  console.log('───');

  try {
    // 1. Fetch all deals from Firestore using Admin SDK
    const dealsSnapshot = await adminDb.collection('deals').get();
    const dealsCount = dealsSnapshot.size;
    console.log(`📦 Found ${dealsCount} deals to synchronize.`);

    let processedDeals = 0;
    let processedItems = 0;

    for (const doc of dealsSnapshot.docs) {
      const deal = { id: doc.id, ...doc.data() } as Project;

      // A. Sync Deal Financials
      console.log(`\nDeal [${processedDeals + 1}/${dealsCount}]: ${deal.propertyName} (${deal.id})`);
      await financialsSyncService.syncProjectFinancials(deal);
      
      // B. Fetch and Sync Ledger Items (sub-collection)
      const ledgerSnapshot = await doc.ref.collection('ledgerItems').get();
      if (!ledgerSnapshot.empty) {
        const items = ledgerSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as LedgerItem));
        await financialsSyncService.syncLedgerItems(deal.id, deal.organizationId, items);
        processedItems += items.length;
        console.log(`   └─ ✅ Synced ${items.length} ledger items.`);
      }

      processedDeals++;
    }

    console.log('\n───');
    console.log('✅ [COMPLETE] Synchronization Finished Successfully.');
    console.log(`📈 Summary: ${processedDeals} Deals, ${processedItems} Ledger Items.`);
    
  } catch (error) {
    console.error('❌ [CRITICAL ERROR] Synchronization failed:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
