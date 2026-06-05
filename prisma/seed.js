const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
