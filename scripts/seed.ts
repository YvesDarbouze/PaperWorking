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

  console.log('  → Creating 6 Marketplace Vendors...');
  const vendorsToSeed = [
    {
      uid: 'vendor_lender_seed',
      email: 'lending@apexcapital.io',
      displayName: 'Apex Capital Lending',
      role: 'Vendor',
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_seed_lender',
      companyName: 'Apex Capital Lending',
      type: 'Lender',
      licensingStates: ['FL', 'NY', 'TX'],
      serviceAreas: ['33101', '10001', '75001'],
      overallRating: 4.9,
      totalReviews: 42,
      bio: 'Apex Capital Lending is a premier private lending firm providing bridge loans, hard money, and transactional funding for real estate investors. Known for fast closings and competitive terms.',
      specialties: ['Bridge Loans', 'Hard Money', 'Fast Close'],
      avgTurnaroundDays: 7,
      availability: 'Available',
      feeRangeLabel: '2–4 points + 10–13% APR',
      verified: true,
      insuranceVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'vendor_inspector_seed',
      email: 'inspections@nationalprop.com',
      displayName: 'National Property Inspections',
      role: 'Vendor',
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_seed_inspector',
      companyName: 'National Property Inspections',
      type: 'Inspector',
      licensingStates: ['FL', 'NY', 'NJ'],
      serviceAreas: ['33101', '10001', '07101'],
      overallRating: 4.8,
      totalReviews: 24,
      bio: 'Comprehensive residential and commercial building inspections. Detailed reports with thermal imaging, structural analysis, and mechanical testing.',
      specialties: ['Structural', 'Multi-Family', 'Due Diligence'],
      avgTurnaroundDays: 3,
      availability: 'Available',
      feeRangeLabel: '$400 – $1,200',
      verified: true,
      insuranceVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'vendor_lawyer_seed',
      email: 'closings@coastaltitlelaw.com',
      displayName: 'Coastal Title & Law Group',
      role: 'Vendor',
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_seed_lawyer',
      companyName: 'Coastal Title & Law Group',
      type: 'Lawyer',
      licensingStates: ['FL', 'TX'],
      serviceAreas: ['33101', '75001'],
      overallRating: 4.7,
      totalReviews: 31,
      bio: 'Real estate attorneys specializing in investor transactions, double closings, title search, escrow services, and contract reviews.',
      specialties: ['Title', 'Escrow', 'Closings'],
      avgTurnaroundDays: 5,
      availability: 'Available',
      feeRangeLabel: '$800 – $2,500',
      verified: true,
      insuranceVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'vendor_contractor_seed',
      email: 'construction@moralesrehab.com',
      displayName: 'Morales Rehab & Construction',
      role: 'Vendor',
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_seed_contractor_vendor',
      companyName: 'Morales Rehab & Construction',
      type: 'Contractor',
      licensingStates: ['FL'],
      serviceAreas: ['33101'],
      overallRating: 4.6,
      totalReviews: 18,
      bio: 'Morales Rehab & Construction is a full-service licensed general contractor specializing in residential value-add, gut rehabs, BRRRR properties, and modern interior renovations.',
      specialties: ['BRRRR Rehab', 'Value-Add', 'Multi-Unit'],
      avgTurnaroundDays: 45,
      availability: 'Available',
      feeRangeLabel: '$15K – $150K+',
      verified: true,
      insuranceVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'vendor_pm_seed',
      email: 'pm@miamipropertymgmt.com',
      displayName: 'Miami Property Management',
      role: 'Vendor',
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_seed_pm',
      companyName: 'Miami Property Management',
      type: 'Property Manager',
      licensingStates: ['FL'],
      serviceAreas: ['33101'],
      overallRating: 4.8,
      totalReviews: 36,
      bio: 'End-to-end leasing, tenant management, rent collection, and maintenance coordination for single-family homes and multi-family buildings in South Florida.',
      specialties: ['Tenant Screening', 'Maintenance', 'Financials'],
      avgTurnaroundDays: 2,
      availability: 'Available',
      feeRangeLabel: '8–10% of monthly rent',
      verified: true,
      insuranceVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'vendor_agent_seed',
      email: 'deals@vanguardagents.com',
      displayName: 'Vanguard Real Estate Agents',
      role: 'Vendor',
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_seed_agent',
      companyName: 'Vanguard Real Estate Agents',
      type: 'Listing Agent',
      licensingStates: ['NY', 'NJ'],
      serviceAreas: ['10001', '07101'],
      overallRating: 4.7,
      totalReviews: 15,
      bio: 'Vanguard Real Estate Agents is a team of investor-friendly real estate agents. We source off-market opportunities, analyze deal flow, and handle dispositions for our clients.',
      specialties: ['Off-Market', 'Buyer Rep', 'Negotiation'],
      avgTurnaroundDays: 14,
      availability: 'Available',
      feeRangeLabel: '2.5–3% commission',
      verified: true,
      insuranceVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const vendor of vendorsToSeed) {
    await db.collection('users').doc(vendor.uid).set(vendor);
  }


  // ── 3. PropertyDeal ─────────────────────────────────────────────
  console.log('  → Creating PropertyDeal...');
  const dealRef = db.collection('projects').doc(DEAL_ID);
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
      projectId: DEAL_ID,
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
      projectId: DEAL_ID,
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
      projectId: DEAL_ID,
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
      projectId: DEAL_ID,
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
