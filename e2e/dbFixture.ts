import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.warn('⚠️ Firebase Admin env vars missing. E2E DB seeding might fail if real credentials are required.');
}

if (!admin.apps.length && projectId && clientEmail && privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

export async function seedFunnelData(orgId: string) {
  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  // 0. User Profile Doc
  const userRef = db.collection('users').doc('user_123');
  batch.set(userRef, {
    uid: 'user_123',
    email: 'test@paperworking.co',
    displayName: 'Test User',
    role: 'Lead Investor',
    personalOrganizationId: orgId,
    organizationId: orgId,
    memberships: {},
    subscriptionPlan: 'Team',
    subscriptionStatus: 'active',
    createdAt: now,
    updatedAt: now,
  });

  // 1. Projects
  const projects = [
    {
      id: `proj-stabilized-${orgId}`,
      organizationId: orgId,
      ownerUid: 'user_123',
      propertyName: 'Oakridge Apartments',
      address: '100 Oakridge Rd, San Francisco, CA 94102',
      status: 'Rented',
      currentPhase: 3,
      strategyType: 'Rent',
      assetClass: 'Multi-Family',
      numberOfUnits: 1,
      occupiedUnits: 1,
      createdAt: now,
      updatedAt: now,
      members: {
        user_123: {
          uid: 'user_123',
          role: 'Lead Investor',
          joinedAt: now,
        },
      },
      financials: {
        purchasePrice: 500000,
        estimatedARV: 500000,
        loanAmount: 420000,
        loanInterestRate: 4.5,
        loanTermYears: 30,
        ownershipPercentage: 100,
        monthlyGrossRent: 4800,
        vacancyRatePercent: 5,
        holdingCostTaxes: 200,
        holdingCostInsurance: 100,
        holdingCostUtilities: 100,
        propertyManagementFeePercent: 6,
        monthlyMaintenanceReserve: 150,
        monthlyHOA: 0,
        costs: [],
      },
      roleLinkedDocuments: [
        {
          id: 'doc-cd-1',
          category: 'Closing Disclosure',
          fileName: 'Oakridge_Closing_Disclosure.pdf',
          linkedRole: 'Loan Processor',
          uploadedByUid: 'user_123',
          uploadedByName: 'Test User',
          uploadedAt: now,
          verified: true,
          notes: 'Verified CD for Oakridge.',
        },
      ],
    },
    {
      id: `proj-distressed-${orgId}`,
      organizationId: orgId,
      ownerUid: 'user_123',
      propertyName: 'Pinecrest Apartments',
      address: '200 Pinecrest Blvd, Miami, FL 33101',
      status: 'Active',
      currentPhase: 3,
      strategyType: 'Rent',
      assetClass: 'Multi-Family',
      numberOfUnits: 1,
      occupiedUnits: 1,
      createdAt: now,
      updatedAt: now,
      members: {
        user_123: {
          uid: 'user_123',
          role: 'Lead Investor',
          joinedAt: now,
        },
      },
      financials: {
        purchasePrice: 600000,
        estimatedARV: 600000,
        loanAmount: 500000,
        loanInterestRate: 8.5,
        loanTermYears: 30,
        ownershipPercentage: 100,
        monthlyGrossRent: 4000,
        vacancyRatePercent: 25,
        holdingCostTaxes: 400,
        holdingCostInsurance: 200,
        holdingCostUtilities: 300,
        propertyManagementFeePercent: 10,
        monthlyMaintenanceReserve: 300,
        monthlyHOA: 100,
        costs: [],
      },
      roleLinkedDocuments: [
        {
          id: 'doc-cd-2',
          category: 'Closing Disclosure',
          fileName: 'Pinecrest_Closing_Disclosure.pdf',
          linkedRole: 'Loan Processor',
          uploadedByUid: 'user_123',
          uploadedByName: 'Test User',
          uploadedAt: now,
          verified: true,
          notes: 'Verified CD for Pinecrest.',
        },
      ],
    },
    {
      id: `proj-acquisition-${orgId}`,
      organizationId: orgId,
      ownerUid: 'user_123',
      propertyName: 'Ocean View Condos',
      address: '300 Ocean Ave, San Diego, CA 92109',
      status: 'Under Contract',
      currentPhase: 2,
      strategyType: 'Buy & Hold',
      assetClass: 'Residential',
      numberOfUnits: 1,
      occupiedUnits: 0,
      createdAt: now,
      updatedAt: now,
      members: {
        user_123: {
          uid: 'user_123',
          role: 'Lead Investor',
          joinedAt: now,
        },
      },
      financials: {
        purchasePrice: 300000,
        estimatedARV: 350000,
        loanAmount: 200000,
        loanInterestRate: 5.5,
        loanTermYears: 30,
        projectedRent: 2500,
        projectedRehabCost: 30000,
        fixedAcquisitionCosts: 5000,
        maxOffer: 210000,
        costs: [],
      },
    },
  ];

  for (const proj of projects) {
    const ref = db.collection('projects').doc(proj.id);
    batch.set(ref, proj);
  }

  // 2. Historical Snapshots
  const snapshots = [
    // Oakridge (Property A) Snapshots
    {
      id: `snap-oak-1-${orgId}`,
      projectId: `proj-stabilized-${orgId}`,
      organizationId: orgId,
      period: '2026-01',
      periodType: 'monthly',
      date: admin.firestore.Timestamp.fromDate(new Date('2026-01-01')),
      noi: 30000,
      annualCashFlow: 36000,
      monthlyCashFlow: 1200,
      capRate: 6.0,
      cashOnCashReturn: 8.0,
      grossRentMultiplier: 10.0,
      dscr: 1.4,
      ltv: 84.0,
      oer: 20.0,
      occupancyRate: 95.0,
      vacancyRate: 5.0,
      irr: 12.0,
      appreciation: 3.0,
      propertyValue: 500000,
      totalCashInvested: 150000,
      grossRentalIncome: 50000,
      annualDebtService: 24000,
      loanAmount: 420000,
      totalOperatingExpenses: 10000,
      grossOperatingIncome: 40000,
      occupiedUnits: 1,
      numberOfUnits: 1,
    },
    {
      id: `snap-oak-2-${orgId}`,
      projectId: `proj-stabilized-${orgId}`,
      organizationId: orgId,
      period: '2026-02',
      periodType: 'monthly',
      date: admin.firestore.Timestamp.fromDate(new Date('2026-02-01')),
      noi: 35000,
      annualCashFlow: 38000,
      monthlyCashFlow: 1300,
      capRate: 7.0,
      cashOnCashReturn: 9.0,
      grossRentMultiplier: 9.6,
      dscr: 1.5,
      ltv: 84.0,
      oer: 19.0,
      occupancyRate: 95.0,
      vacancyRate: 5.0,
      irr: 13.0,
      appreciation: 3.2,
      propertyValue: 500000,
      totalCashInvested: 150000,
      grossRentalIncome: 52000,
      annualDebtService: 24000,
      loanAmount: 420000,
      totalOperatingExpenses: 11000,
      grossOperatingIncome: 41000,
      occupiedUnits: 1,
      numberOfUnits: 1,
    },
    {
      id: `snap-oak-3-${orgId}`,
      projectId: `proj-stabilized-${orgId}`,
      organizationId: orgId,
      period: '2026-03',
      periodType: 'monthly',
      date: admin.firestore.Timestamp.fromDate(new Date('2026-03-01')),
      noi: 44664,
      annualCashFlow: 19127,
      monthlyCashFlow: 1593.92,
      capRate: 8.93,
      cashOnCashReturn: 23.9,
      grossRentMultiplier: 8.68,
      dscr: 1.75,
      ltv: 84.0,
      oer: 17.45,
      occupancyRate: 95.0,
      vacancyRate: 5.0,
      irr: 15.0,
      appreciation: 3.5,
      propertyValue: 500000,
      totalCashInvested: 80000,
      grossRentalIncome: 57600,
      annualDebtService: 25537,
      loanAmount: 420000,
      totalOperatingExpenses: 10056,
      grossOperatingIncome: 47544,
      occupiedUnits: 1,
      numberOfUnits: 1,
    },

    // Pinecrest (Property B) Snapshots
    {
      id: `snap-pine-1-${orgId}`,
      projectId: `proj-distressed-${orgId}`,
      organizationId: orgId,
      period: '2026-01',
      periodType: 'monthly',
      date: admin.firestore.Timestamp.fromDate(new Date('2026-01-01')),
      noi: 12000,
      annualCashFlow: -33600,
      monthlyCashFlow: -2800,
      capRate: 2.0,
      cashOnCashReturn: -33.6,
      grossRentMultiplier: 15.0,
      dscr: 0.3,
      ltv: 83.3,
      oer: 45.0,
      occupancyRate: 75.0,
      vacancyRate: 25.0,
      irr: -5.0,
      appreciation: 1.0,
      propertyValue: 600000,
      totalCashInvested: 100000,
      grossRentalIncome: 40000,
      annualDebtService: 45600,
      loanAmount: 500000,
      totalOperatingExpenses: 20000,
      grossOperatingIncome: 20000,
      occupiedUnits: 1,
      numberOfUnits: 1,
    },
    {
      id: `snap-pine-2-${orgId}`,
      projectId: `proj-distressed-${orgId}`,
      organizationId: orgId,
      period: '2026-02',
      periodType: 'monthly',
      date: admin.firestore.Timestamp.fromDate(new Date('2026-02-01')),
      noi: 14000,
      annualCashFlow: -31200,
      monthlyCashFlow: -2600,
      capRate: 2.3,
      cashOnCashReturn: -31.2,
      grossRentMultiplier: 13.64,
      dscr: 0.32,
      ltv: 83.3,
      oer: 43.0,
      occupancyRate: 75.0,
      vacancyRate: 25.0,
      irr: -4.5,
      appreciation: 1.2,
      propertyValue: 600000,
      totalCashInvested: 100000,
      grossRentalIncome: 44000,
      annualDebtService: 45200,
      loanAmount: 500000,
      totalOperatingExpenses: 20200,
      grossOperatingIncome: 23800,
      occupiedUnits: 1,
      numberOfUnits: 1,
    },
    {
      id: `snap-pine-3-${orgId}`,
      projectId: `proj-distressed-${orgId}`,
      organizationId: orgId,
      period: '2026-03',
      periodType: 'monthly',
      date: admin.firestore.Timestamp.fromDate(new Date('2026-03-01')),
      noi: 15600,
      annualCashFlow: -30535,
      monthlyCashFlow: -2544.57,
      capRate: 2.6,
      cashOnCashReturn: -30.5,
      grossRentMultiplier: 12.5,
      dscr: 0.34,
      ltv: 83.3,
      oer: 42.5,
      occupancyRate: 75.0,
      vacancyRate: 25.0,
      irr: -4.0,
      appreciation: 1.5,
      propertyValue: 600000,
      totalCashInvested: 100000,
      grossRentalIncome: 48000,
      annualDebtService: 46135,
      loanAmount: 500000,
      totalOperatingExpenses: 20400,
      grossOperatingIncome: 27600,
      occupiedUnits: 1,
      numberOfUnits: 1,
    },
  ];

  for (const snap of snapshots) {
    const ref = db.collection('propertyMetricSnapshots').doc(snap.id);
    batch.set(ref, snap);
  }

  await batch.commit();

  // Generate a custom token for the E2E client to authenticate
  try {
    const customToken = await admin.auth().createCustomToken('user_123');
    return { customToken };
  } catch (err: any) {
    console.error('Failed to create custom token:', err);
    return { customToken: '' };
  }
}

export async function cleanupFunnelData(orgId: string) {
  const batch = db.batch();

  // Delete user doc
  batch.delete(db.collection('users').doc('user_123'));

  // Delete projects
  const projSnap = await db.collection('projects').where('organizationId', '==', orgId).get();
  for (const doc of projSnap.docs) {
    batch.delete(doc.ref);
  }

  // Delete snapshots
  const snapSnap = await db.collection('propertyMetricSnapshots').where('organizationId', '==', orgId).get();
  for (const doc of snapSnap.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();
}
