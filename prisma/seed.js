const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING PAPERWORKING FINANCIALS ---');

  const orgId = 'primary-org';

  // Create some mock deals with financials
  const deals = [
    {
      dealId: 'deal_1',
      organizationId: orgId,
      propertyName: 'Brooklyn Heights Modern',
      purchasePrice: 120000000, // $1.2M
      projectedRehabCost: 25000000, // $250k
      estimatedARV: 185000000, // $1.85M
      actualSalePrice: 192000000, // $1.92M
      status: 'Sold',
    },
    {
      dealId: 'deal_2',
      organizationId: orgId,
      propertyName: 'Lower East Side Artist Loft',
      purchasePrice: 95000000, // $950k
      projectedRehabCost: 15000000, // $150k
      estimatedARV: 140000000,
      actualSalePrice: 145000000,
      status: 'Sold',
    },
    {
      dealId: 'deal_3',
      organizationId: orgId,
      propertyName: 'Cobble Hill Victorian',
      purchasePrice: 210000000,
      projectedRehabCost: 45000000,
      estimatedARV: 310000000,
      status: 'Rehab',
    }
  ];

  for (const d of deals) {
    await prisma.dealFinancials.upsert({
      where: { dealId: d.dealId },
      update: d,
      create: d,
    });
    console.log(`Synced financials for: ${d.propertyName}`);
  }

  console.log('--- SEEDING COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
