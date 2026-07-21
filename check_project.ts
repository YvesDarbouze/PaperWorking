import prisma from './src/lib/prisma';

async function main() {
  const projects = await prisma.reilProject.findMany({
    include: {
      propertyFacts: true,
      purchaseTerms: true,
    }
  });
  console.log('PROJECTS IN DB:', JSON.stringify(projects, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
