const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

let prisma;
if (process.env.PRISMA_USE_WS === 'true') {
  const { PrismaNeon } = require('@prisma/adapter-neon');
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;

  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
  if (match) {
    process.env.PGUSER = match[1];
    process.env.PGPASSWORD = match[2];
    process.env.PGHOST = match[3];
    process.env.PGPORT = match[4] || '5432';
    process.env.PGDATABASE = match[5];
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaNeon(pool);
  prisma = new PrismaClient({ adapter });
} else {
  const { PrismaNeonHttp } = require('@prisma/adapter-neon');
  const adapter = new PrismaNeonHttp(url, {});
  prisma = new PrismaClient({ adapter });
}

async function main() {
  console.log('--- SEEDING PAPERWORKING ---');

  // ── Demo AppUser (mirrors a Firebase UID) ────────────────────────────────────
  const demoUser = await prisma.appUser.upsert({
    where:  { id: 'demo-user-uid-001' },
    update: {},
    create: {
      id:    'demo-user-uid-001',
      email: 'demo@paperworking.io',
      name:  'Demo Investor',
    },
  });
  console.log('AppUser upserted:', demoUser.email);

  // ── Demo ReilProject at PROSPECT ─────────────────────────────────────────────
  const demoProject = await prisma.reilProject.upsert({
    where:  { id: 'demo-project-001' },
    update: {},
    create: {
      id:               'demo-project-001',
      createdById:      demoUser.id,
      addressLine:      '740 Bedford Ave',
      city:             'Brooklyn',
      state:            'NY',
      zip:              '11206',
      lat:              40.7138,
      lng:              -73.9533,
      placeId:          'mock_2',
      displayName:      'Bedford Ave – Brooklyn Heights',
      acquisitionStatus:'PROSPECT',
    },
  });
  console.log('ReilProject upserted:', demoProject.displayName, '–', demoProject.acquisitionStatus);

  // ── Seed a StatusEvent for the demo project ──────────────────────────────────
  const existing = await prisma.statusEvent.findFirst({ where: { projectId: demoProject.id } });
  if (!existing) {
    await prisma.statusEvent.create({
      data: {
        projectId:    demoProject.id,
        status:       'PROSPECT',
        note:         'Initial project created via seed',
        recordedById: demoUser.id,
      },
    });
    console.log('StatusEvent created');
  }

  // Seed ReilProject fixtures for FX-1 to FX-8 in Postgres
  console.log('  → Seeding FX Projects in Postgres...');
  const userId = 'demo-user-uid-001';
  
  const fxProjects = [
    { id: 'project_fx1_seed', displayName: 'Evergreen Terrace (FX-1)', addressLine: '742 Evergreen Terrace', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
    { id: 'project_fx2_seed', displayName: 'Co-Buy TIC Property (FX-2)', addressLine: '456 Co-Buy Lane', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
    { id: 'project_fx3_seed', displayName: 'Syndication Straight Split (FX-3)', addressLine: '789 Syndicate St', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
    { id: 'project_fx4_seed', displayName: 'Syndication Preferred Return (FX-4)', addressLine: '101 Preferred Pl', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
    { id: 'project_fx5_seed', displayName: 'Syndication Cumulative Pref (FX-5)', addressLine: '202 Cumulative Rd', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
    { id: 'project_fx6_seed', displayName: 'Syndication Waterfall (FX-6)', addressLine: '303 Cascade Way', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
    { id: 'project_fx7_std_seed', displayName: 'SBA 504 Standard (FX-7)', addressLine: '404 SBA Blvd', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
    { id: 'project_fx7_spec_seed', displayName: 'SBA 504 Special Purpose (FX-7)', addressLine: '505 SBA Rd', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
    { id: 'project_fx8_seed', displayName: 'Cash-to-Close Property (FX-8)', addressLine: '742 Evergreen Terrace (FX-8)', currentPhase: 2, dispositionType: 'RENT', subStrategy: 'LONG_TERM', acquisitionStatus: 'OWNED' },
  ];

  for (const p of fxProjects) {
    await prisma.reilProject.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        createdById: userId,
        addressLine: p.addressLine,
        city: 'Springfield',
        state: 'IL',
        zip: '62704',
        displayName: p.displayName,
        acquisitionStatus: p.acquisitionStatus,
        currentPhase: p.currentPhase,
        dispositionType: p.dispositionType,
        subStrategy: p.subStrategy,
      }
    });

    if (p.id === 'project_fx1_seed') {
      await prisma.reilFundingPlan.upsert({
        where: { projectId: p.id },
        update: {},
        create: {
          projectId: p.id,
          modality: ['conventional_loan', 'solo_cash'],
        }
      });

      await prisma.reilLoanRecord.upsert({
        where: { id: 'loan_fx1_seed_pg' },
        update: {},
        create: {
          id: 'loan_fx1_seed_pg',
          projectId: p.id,
          lenderName: 'Apex Capital Lending',
          amountCents: 22320000n,
          interestRatePercent: 6.5,
          termMonths: 360,
          points: 0.0,
          status: 'Locked',
          isInterestOnly: false,
        }
      });
    }
  }

  // ── Legacy DealFinancials seed (unchanged) ───────────────────────────────────
  const orgId = 'primary-org';
  const deals = [
    { linkedDealId: 'deal_1', organizationId: orgId, purchasePrice: 120000000n, salePrice: 192000000n, renovationCosts: 25000000n },
    { linkedDealId: 'deal_2', organizationId: orgId, purchasePrice:  95000000n, salePrice: 145000000n, renovationCosts: 15000000n },
    { linkedDealId: 'deal_3', organizationId: orgId, purchasePrice: 210000000n, salePrice:         0n, renovationCosts: 45000000n },
  ];
  for (const d of deals) {
    await prisma.dealFinancials.upsert({ where: { linkedDealId: d.linkedDealId }, update: d, create: d });
  }
  console.log('DealFinancials seeded');

  console.log('--- SEEDING COMPLETE ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
