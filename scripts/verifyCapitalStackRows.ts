import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { db } from '../src/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const url = process.env.DATABASE_URL;

async function verifyCapitalStack() {
  console.log('=== VERIFYING CAPITAL STACK DATABASE ROWS ===\n');

  // 1. Query Firestore capitalStack for deal_123_main_st_seed
  console.log('--- FIRESTORE: deal_123_main_st_seed ---');
  try {
    const docRef = doc(db, 'projects', 'deal_123_main_st_seed');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const stack = data.financials?.capitalStack || [];
      console.log(`Project: ${data.name || 'Unnamed'}`);
      console.log(`Modality: ${JSON.stringify(data.fundingPlan?.modality || [])}`);
      console.log('Capital Stack Sources:');
      console.table(stack.map((s: any) => ({
        ID: s.id,
        Category: s.category,
        Amount: `$${s.amount.toLocaleString()}`,
        Rate: `${s.interestRate || s.interestRatePercent}%`,
        Status: s.status,
      })));
    } else {
      console.log('Could not find deal_123_main_st_seed in Firestore');
    }
  } catch (err: any) {
    console.error('Error fetching from Firestore:', err.message);
  }

  // 2. Query Postgres capitalStack rows
  if (url) {
    console.log('\n--- POSTGRES: ReilFundingPlan & ReilLoanRecord ---');
    try {
      const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
      if (match) {
        process.env.PGUSER = match[1];
        process.env.PGPASSWORD = match[2];
        process.env.PGHOST = match[3];
        process.env.PGPORT = match[4] || '5432';
        process.env.PGDATABASE = match[5];
      }

      const { PrismaNeon } = require('@prisma/adapter-neon');
      const { Pool, neonConfig } = require('@neondatabase/serverless');
      const ws = require('ws');
      neonConfig.webSocketConstructor = ws;
      const pool = new Pool({ connectionString: url });
      const adapter = new PrismaNeon(pool);
      const prisma = new PrismaClient({ adapter });

      // Query seeded projects and their loans
      const projects = await prisma.reilProject.findMany({
        where: {
          id: {
            in: ['deal_123_main_st_seed', 'project_fx1_seed', 'project_fx7_std_seed', 'project_fx7_spec_seed', 'project_fx7_dual_seed', 'project_fx8_seed']
          }
        },
        include: {
          fundingPlan: true,
          loans: true,
        }
      });

      for (const p of projects) {
        console.log(`\nProject: ${p.displayName ?? p.addressLine} (${p.id})`);
        console.log(`Modality: ${p.fundingPlan?.modality?.join(', ') || 'None'}`);
        if (p.loans.length > 0) {
          console.log('Loans:');
          console.table(p.loans.map((l: any) => ({
            ID: l.id,
            Lender: l.lenderName || 'Unknown',
            Amount: `$${(Number(l.amountCents) / 100).toLocaleString()}`,
            Rate: `${l.interestRatePercent}%`,
            Status: l.status,
          })));
        } else {
          console.log('No LoanRecords in Postgres.');
        }
      }

      await prisma.$disconnect();
    } catch (err: any) {
      console.error('Error fetching from Postgres:', err.message);
    }
  } else {
    console.log('\nDATABASE_URL not set; skipping Postgres check.');
  }
}

verifyCapitalStack().catch(console.error);
