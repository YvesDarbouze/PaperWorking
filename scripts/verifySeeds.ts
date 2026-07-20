import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
if (match) {
  process.env.PGUSER = match[1];
  process.env.PGPASSWORD = match[2];
  process.env.PGHOST = match[3];
  process.env.PGPORT = match[4] || '5432';
  process.env.PGDATABASE = match[5];
}

async function verify() {
  const { PrismaNeon } = require('@prisma/adapter-neon');
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('=== VERIFYING POSTGRES SEEDED FIXTURES ===\n');

  const projects = await prisma.reilProject.findMany({
    where: {
      id: {
        in: [
          'project_fx1_seed',
          'project_fx2_seed',
          'project_fx3_seed',
          'project_fx4_seed',
          'project_fx5_seed',
          'project_fx6_seed',
          'project_fx7_std_seed',
          'project_fx7_spec_seed',
          'project_fx7_dual_seed',
          'project_fx8_seed',
        ]
      }
    },
    include: {
      fundingPlan: true,
      loans: true,
    }
  });

  console.log(`Found ${projects.length} FX Project records in Postgres:\n`);
  
  for (const p of projects) {
    console.log(`- Project ID: ${p.id}`);
    console.log(`  Name:       ${p.displayName}`);
    console.log(`  Address:    ${p.addressLine}`);
    console.log(`  Phase:      ${p.currentPhase}`);
    console.log(`  Modality:   ${p.fundingPlan?.modality?.join(', ') || 'N/A'}`);
    if (p.loans.length > 0) {
      console.log(`  Loans:`);
      for (const l of p.loans) {
        console.log(`    * Loan ID: ${l.id}, Lender: ${l.lenderName}, Amount: $${(Number(l.amountCents) / 100).toLocaleString()}, Rate: ${l.interestRatePercent}%, Term: ${l.termMonths}mo, Status: ${l.status}`);
      }
    } else {
      console.log(`  Loans:      None`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

verify().catch(console.error);
