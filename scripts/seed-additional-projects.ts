import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing env vars');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

async function run() {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const orgId = 'org_paperworking_seed';
  const leadUid = 'user_lead_investor_seed';

  console.log('Seeding additional projects to span multiple years and phases...');

  // Project 1: Ocean View Apartments (2024, Phase 1 - Sourcing / Find & Fund)
  const date2024 = new Date('2024-05-15T10:00:00Z');
  await db.collection('projects').doc('deal_ocean_view_seed').set({
    id: 'deal_ocean_view_seed',
    organizationId: orgId,
    ownerUid: leadUid,
    propertyName: 'Ocean View Apartments',
    address: '100 Ocean Drive, Miami, FL 33139',
    status: 'Active',
    currentPhase: 1, // Acquisition / Find & Fund
    activePhase: 1,
    createdAt: date2024,
    updatedAt: date2024,
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    assetClass: 'Residential',
    squareFootage: 1500,
    members: {
      [leadUid]: {
        uid: leadUid,
        role: 'Lead Investor',
        joinedAt: date2024,
      }
    },
    assignedUsers: [leadUid],
    financials: {
      purchasePrice: 450000,
      estimatedARV: 520000,
      loanAmount: 360000,
      loanInterestRate: 5.5,
      loanTermYears: 30,
      financingType: 'Financed',
      projectedRehabCost: 40000,
    }
  });

  // Project 2: Pine Crest Duplex (2025, Phase 2 - Purchase / Fund)
  const date2025 = new Date('2025-08-20T12:00:00Z');
  await db.collection('projects').doc('deal_pine_crest_seed').set({
    id: 'deal_pine_crest_seed',
    organizationId: orgId,
    ownerUid: leadUid,
    propertyName: 'Pine Crest Duplex',
    address: '450 Pine Ave, Atlanta, GA 30308',
    status: 'Active',
    currentPhase: 2, // Fund / Purchase
    activePhase: 2,
    createdAt: date2025,
    updatedAt: date2025,
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    assetClass: 'Residential',
    squareFootage: 1800,
    members: {
      [leadUid]: {
        uid: leadUid,
        role: 'Lead Investor',
        joinedAt: date2025,
      }
    },
    assignedUsers: [leadUid],
    financials: {
      purchasePrice: 320000,
      estimatedARV: 350000,
      loanAmount: 240000,
      loanInterestRate: 6.0,
      loanTermYears: 30,
      financingType: 'Financed',
      projectedRehabCost: 15000,
    }
  });

  // Project 3: Maplewood Strip Mall (2026, Phase 4 - Exit)
  const date2026 = new Date('2026-02-10T14:00:00Z');
  await db.collection('projects').doc('deal_maplewood_seed').set({
    id: 'deal_maplewood_seed',
    organizationId: orgId,
    ownerUid: leadUid,
    propertyName: 'Maplewood Strip Mall',
    address: '12 Maple Blvd, Chicago, IL 60611',
    status: 'Active',
    currentPhase: 4, // Exit
    activePhase: 4,
    createdAt: date2026,
    updatedAt: date2026,
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    assetClass: 'Commercial',
    squareFootage: 5000,
    members: {
      [leadUid]: {
        uid: leadUid,
        role: 'Lead Investor',
        joinedAt: date2026,
      }
    },
    assignedUsers: [leadUid],
    financials: {
      purchasePrice: 1200000,
      estimatedARV: 1400000,
      loanAmount: 900000,
      loanInterestRate: 7.0,
      loanTermYears: 25,
      financingType: 'Financed',
      projectedRehabCost: 100000,
    }
  });

  console.log('Additional projects seeded successfully.');
}

run().catch(console.error);
