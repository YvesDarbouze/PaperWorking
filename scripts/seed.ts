/**
 * PaperWorking Database Seed Script
 * 
 * Creates a clean, multi-tenant-compliant dataset:
 * - 1 Organization
 * - 2 Users (Lead Investor + General Contractor)
 * - 1 Active PropertyDeal
 * - 4 LedgerItems in the deal's sub-collection
 * - 1 PrivateFinancials summary document
 * 
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed.ts
 * 
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * environment variables to be set (or a .env file loaded).
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ── Bootstrap Firebase Admin ────────────────────────────────────────
// Explicitly load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('\n❌ Firebase Admin initialization failed!');
  console.error('   Missing environment variables:');
  console.error(`     FIREBASE_PROJECT_ID:   ${projectId ? '✅' : '❌ MISSING'}`);
  console.error(`     FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅' : '❌ MISSING'}`);
  console.error(`     FIREBASE_PRIVATE_KEY:  ${privateKey ? '✅' : '❌ MISSING'}`);
  console.error('\n   Create a .env file in the project root with these values.');
  console.error('   See the template at the bottom of scripts/seed.ts.\n');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

// ── Deterministic IDs for reproducibility ───────────────────────────
const ORG_ID = 'org_paperworking_seed';
const LEAD_INVESTOR_UID = 'user_lead_investor_seed';
const CONTRACTOR_UID = 'user_contractor_seed';
const DEAL_ID = 'deal_123_main_st_seed';

async function seed() {
  console.log('🌱 Starting PaperWorking database seed...\n');

  const now = admin.firestore.FieldValue.serverTimestamp();

  // ── 1. Organization ─────────────────────────────────────────────
  console.log('  → Creating Organization...');
  await db.collection('organizations').doc(ORG_ID).set({
    id: ORG_ID,
    name: 'Apex Capital Partners',
    ownerUid: LEAD_INVESTOR_UID,
    subscriptionPlan: 'Team',
    subscriptionStatus: 'active',
    createdAt: now,
    updatedAt: now,
  });

  // ── 2. Users ────────────────────────────────────────────────────
  console.log('  → Creating Lead Investor user...');
  await db.collection('users').doc(LEAD_INVESTOR_UID).set({
    uid: LEAD_INVESTOR_UID,
    email: 'marcus@apexcapital.io',
    displayName: 'Marcus Aurelius',
    organizationId: ORG_ID,
    role: 'Lead Investor',
    subscriptionPlan: 'Team',
    subscriptionStatus: 'active',
    stripeCustomerId: 'cus_seed_lead_investor',
    createdAt: now,
    updatedAt: now,
  });

  console.log('  → Creating General Contractor user...');
  await db.collection('users').doc(CONTRACTOR_UID).set({
    uid: CONTRACTOR_UID,
    email: 'tony@apexbuilders.com',
    displayName: 'Tony Morales',
    organizationId: ORG_ID,
    role: 'General Contractor',
    subscriptionPlan: 'Team',
    subscriptionStatus: 'active',
    stripeCustomerId: 'cus_seed_contractor',
    createdAt: now,
    updatedAt: now,
  });

  // ── 3. PropertyDeal ─────────────────────────────────────────────
  console.log('  → Creating PropertyDeal...');
  const dealRef = db.collection('deals').doc(DEAL_ID);
  await dealRef.set({
    id: DEAL_ID,
    organizationId: ORG_ID,
    ownerUid: LEAD_INVESTOR_UID,
    propertyName: '123 Main Street Flip',
    address: '123 Main Street, Miami, FL 33101',
    status: 'Renovating',
    currentPhase: 3,
    activePhase: 3,
    holdingCostClockStart: now,
    createdAt: now,
    updatedAt: now,
    members: {
      [LEAD_INVESTOR_UID]: {
        uid: LEAD_INVESTOR_UID,
        role: 'Lead Investor',
        joinedAt: now,
      },
      [CONTRACTOR_UID]: {
        uid: CONTRACTOR_UID,
        role: 'General Contractor',
        joinedAt: now,
      },
    },
    assignedUsers: [LEAD_INVESTOR_UID, CONTRACTOR_UID],
    financials: {
      purchasePrice: 200000,
      estimatedARV: 340000,
      loanInterestRate: 12,
      loanOriginationPoints: 2,
      estimatedTimelineDays: 180,
      costs: [], // Legacy field — we now use the ledgerItems sub-collection
    },
  });

  // ── 4. LedgerItems (Sub-Collection) ─────────────────────────────
  console.log('  → Populating LedgerItems sub-collection...');
  const ledgerItems = [
    {
      id: 'ledger_plumbing_01',
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      type: 'expense',
      category: 'Plumbing',
      description: 'Full bathroom rough-in — Master Suite',
      amount: 8500,
      status: 'Approved',
      submittedByUid: CONTRACTOR_UID,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ledger_electrical_01',
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      type: 'expense',
      category: 'Electrical',
      description: 'Panel upgrade 100A → 200A + rewire kitchen',
      amount: 6200,
      status: 'Approved',
      submittedByUid: CONTRACTOR_UID,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ledger_hvac_01',
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      type: 'receipt',
      category: 'HVAC',
      description: 'Carrier 3-ton split system install',
      amount: 4800,
      status: 'Pending',
      submittedByUid: CONTRACTOR_UID,
      receiptUrl: 'https://storage.example.com/receipts/hvac_receipt_001.pdf',
      createdAt: now,
    },
    {
      id: 'ledger_budget_foundation',
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      type: 'budget_line',
      category: 'Foundation',
      description: 'Foundation crack repair — estimated',
      amount: 3200,
      status: 'Pending',
      submittedByUid: LEAD_INVESTOR_UID,
      createdAt: now,
    },
  ];

  const ledgerBatch = db.batch();
  for (const item of ledgerItems) {
    const ref = dealRef.collection('ledgerItems').doc(item.id);
    ledgerBatch.set(ref, item);
  }
  await ledgerBatch.commit();

  // ── 5. PrivateFinancials (Sub-Collection) ───────────────────────
  console.log('  → Writing PrivateFinancials summary...');
  
  const totalApprovedCosts = 8500 + 6200; // Only the 2 approved items
  const totalInvestment = 200000 + totalApprovedCosts;
  const netProfit = 340000 - totalInvestment;
  const costOfCapital = 200000 * (12 / 100) * (180 / 365); // Simple interest over hold period
  const projectedROI = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  await dealRef.collection('privateFinancials').doc('summary').set({
    netProfit,
    costOfCapital: Math.round(costOfCapital * 100) / 100,
    projectedROI: Math.round(projectedROI * 100) / 100,
    totalApprovedCosts,
    totalInvestment,
    lastCalculatedAt: now,
  });

  // ── Done ────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete! Created:');
  console.log(`   • Organization:       ${ORG_ID}`);
  console.log(`   • Lead Investor:      ${LEAD_INVESTOR_UID} (marcus@apexcapital.io)`);
  console.log(`   • Contractor:         ${CONTRACTOR_UID} (tony@apexbuilders.com)`);
  console.log(`   • Deal:               ${DEAL_ID} (123 Main Street)`);
  console.log(`   • LedgerItems:        ${ledgerItems.length} items`);
  console.log(`   • PrivateFinancials:  netProfit=$${netProfit.toLocaleString()}, ROI=${projectedROI.toFixed(2)}%`);
  console.log('\n🔒 All records are scoped to organizationId: ' + ORG_ID);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
