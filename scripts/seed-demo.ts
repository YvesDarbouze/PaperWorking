import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env files
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('\n❌ Firebase Admin initialization failed for Demo Seed!');
  console.error('   Please verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env/.env.local.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

async function seedDemo() {
  console.log('🌱 Starting public Demo dataset seed...');

  const now = admin.firestore.Timestamp.now();
  const orgId = 'org_demo_seed';
  const ownerUid = 'demo_user';

  const demoDocRef = db.collection('demo').doc('default');

  const projects = [
    {
      id: 'demo-skyline-lofts',
      organizationId: orgId,
      ownerUid: ownerUid,
      propertyName: 'Skyline Lofts',
      address: '456 Skyline Drive, Denver, CO 80202',
      status: 'Active',
      currentPhase: 1,
      dispositionType: 'SALE',
      subStrategy: 'FLIP',
      assetClass: 'Multi-Family',
      numberOfUnits: 12,
      occupiedUnits: 10,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
      members: {
        [ownerUid]: {
          uid: ownerUid,
          role: 'Lead Investor',
          joinedAt: now.toDate().toISOString(),
        }
      },
      financials: {
        purchasePrice: 450000,
        estimatedARV: 620000,
        costs: []
      }
    },
    {
      id: 'demo-cedar-duplex',
      organizationId: orgId,
      ownerUid: ownerUid,
      propertyName: 'Cedar Park Duplex',
      address: '789 Cedar Court, Austin, TX 78701',
      status: 'Active',
      currentPhase: 1,
      dispositionType: 'RENT',
      subStrategy: 'LONG_TERM',
      assetClass: 'Residential',
      numberOfUnits: 2,
      occupiedUnits: 2,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
      members: {
        [ownerUid]: {
          uid: ownerUid,
          role: 'Lead Investor',
          joinedAt: now.toDate().toISOString(),
        }
      },
      financials: {
        purchasePrice: 280000,
        estimatedARV: 380000,
        costs: []
      }
    },
    {
      id: 'demo-123-main-st',
      organizationId: orgId,
      ownerUid: ownerUid,
      propertyName: '123 Main Street Flip',
      address: '123 Main Street, Miami, FL 33101',
      status: 'Renovating',
      currentPhase: 3,
      dispositionType: 'SALE',
      subStrategy: 'FLIP',
      assetClass: 'Residential',
      numberOfUnits: 1,
      occupiedUnits: 0,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
      members: {
        [ownerUid]: {
          uid: ownerUid,
          role: 'Lead Investor',
          joinedAt: now.toDate().toISOString(),
        }
      },
      financials: {
        purchasePrice: 200000,
        estimatedARV: 340000,
        costs: []
      }
    }
  ];

  const properties = [
    {
      id: 'prop-skyline',
      organizationId: orgId,
      name: 'Skyline Lofts',
      address: '456 Skyline Drive, Denver, CO 80202',
      purchasePrice: 450000,
      purchaseDate: now.toDate().toISOString(),
      status: 'active',
      units: Array.from({ length: 12 }, (_, i) => ({
        id: `u-${i}`,
        unitNumber: `${101 + i}`,
        status: i < 10 ? 'occupied' : 'vacant',
        monthlyRent: i < 10 ? 1500 : 0
      })),
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    },
    {
      id: 'prop-cedar',
      organizationId: orgId,
      name: 'Cedar Park Duplex',
      address: '789 Cedar Court, Austin, TX 78701',
      purchasePrice: 280000,
      purchaseDate: now.toDate().toISOString(),
      status: 'active',
      units: [
        { id: 'duplex-1', unitNumber: 'A', status: 'occupied', monthlyRent: 1200 },
        { id: 'duplex-2', unitNumber: 'B', status: 'occupied', monthlyRent: 1250 }
      ],
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    },
    {
      id: 'prop-main-st',
      organizationId: orgId,
      name: '123 Main Street Flip',
      address: '123 Main Street, Miami, FL 33101',
      purchasePrice: 200000,
      purchaseDate: now.toDate().toISOString(),
      status: 'active',
      units: [],
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    }
  ];

  const transactions = [
    {
      id: 'tx-skyline-rent-1',
      organizationId: orgId,
      amount: 15000,
      date: now.toDate().toISOString(),
      description: 'Monthly Rent - Skyline Lofts',
      type: 'Income',
      category: 'Rent',
      linkedPropertyId: 'prop-skyline'
    },
    {
      id: 'tx-cedar-rent-1',
      organizationId: orgId,
      amount: 2450,
      date: now.toDate().toISOString(),
      description: 'Monthly Rent - Cedar Park Duplex',
      type: 'Income',
      category: 'Rent',
      linkedPropertyId: 'prop-cedar'
    },
    {
      id: 'tx-skyline-tax',
      organizationId: orgId,
      amount: -1200,
      date: now.toDate().toISOString(),
      description: 'Property Tax Payment',
      type: 'Expense',
      category: 'Taxes',
      linkedPropertyId: 'prop-skyline'
    },
    {
      id: 'tx-cedar-maintenance',
      organizationId: orgId,
      amount: -350,
      date: now.toDate().toISOString(),
      description: 'Plumbing Repair Unit A',
      type: 'Expense',
      category: 'Maintenance',
      linkedPropertyId: 'prop-cedar'
    }
  ];

  const ledgerItems = {
    'demo-skyline-lofts': [
      {
        id: 'ledger-skyline-1',
        projectId: 'demo-skyline-lofts',
        organizationId: orgId,
        type: 'budget_line',
        category: 'Plumbing',
        description: 'Common sewer line inspection',
        amount: 1200,
        status: 'Approved',
        submittedByUid: ownerUid,
        createdAt: now.toDate().toISOString()
      }
    ],
    'demo-cedar-duplex': [
      {
        id: 'ledger-cedar-1',
        projectId: 'demo-cedar-duplex',
        organizationId: orgId,
        type: 'budget_line',
        category: 'General',
        description: 'Landscaping cleanup',
        amount: 800,
        status: 'Approved',
        submittedByUid: ownerUid,
        createdAt: now.toDate().toISOString()
      }
    ],
    'demo-123-main-st': [
      {
        id: 'ledger-main-1',
        projectId: 'demo-123-main-st',
        organizationId: orgId,
        type: 'expense',
        category: 'Plumbing',
        description: 'Bathroom plumbing rough-in',
        amount: 6500,
        status: 'Approved',
        submittedByUid: ownerUid,
        createdAt: now.toDate().toISOString()
      },
      {
        id: 'ledger-main-2',
        projectId: 'demo-123-main-st',
        organizationId: orgId,
        type: 'expense',
        category: 'Electrical',
        description: 'New 200A electrical service panel',
        amount: 5200,
        status: 'Approved',
        submittedByUid: ownerUid,
        createdAt: now.toDate().toISOString()
      },
      {
        id: 'ledger-main-3',
        projectId: 'demo-123-main-st',
        organizationId: orgId,
        type: 'receipt',
        category: 'HVAC',
        description: 'AC compressor replacement unit',
        amount: 4500,
        status: 'Pending',
        submittedByUid: ownerUid,
        receiptUrl: 'https://storage.example.com/receipts/ac_unit.pdf',
        createdAt: now.toDate().toISOString()
      }
    ]
  };

  await demoDocRef.set({
    projects,
    properties,
    transactions,
    ledgerItems,
    updatedAt: now.toDate().toISOString()
  });

  console.log('✅ Demo seed successfully completed!');
}

seedDemo().catch((err) => {
  console.error('❌ Demo seed failed:', err);
  process.exit(1);
});
