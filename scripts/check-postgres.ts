import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import prisma from '../src/lib/prisma';

async function checkPostgres() {
  console.log('Checking Neon Postgres database...');
  try {
    const projects = await prisma.reilProject.findMany({
      include: {
        propertyFacts: true,
        purchaseTerms: true,
      }
    });
    console.log(`Found ${projects.length} projects in Neon Postgres.`);
    projects.forEach(p => {
      console.log(`Project: ID=${p.id}, Address="${p.addressLine}", Status/Phase=${p.status}, DispositionType=${p.dispositionType}, Retrospective=${p.retrospective}`);
    });
  } catch (error) {
    console.error('Error querying Neon Postgres:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostgres();
