import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { adminDb } from '../lib/firebase/admin';
import { prisma } from '../lib/prisma';

export interface ListingSeedData {
  id: string;
  agentHandle: string;
  agentName: string;
  agentEmail: string;
  persona: string;
  title: string;
  projectId: string;
  syntheticAgent: boolean;
  visibility: 'PUBLIC' | 'NETWORK_ONLY';
  createdAt: string;
  isNewListing: boolean;
  status: 'active';
  askingPrice: number;
  description: string;
}

async function runSeeder() {
  console.log('🚀 Starting Real-Space Marketplace Listing Seeder...');

  const fixturePath = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture file not found at ${fixturePath}. Run seedAgentCrew.ts first.`);
  }

  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const agents = fixture.agents || [];

  const findProject = (handle: string, index: number) => {
    const agent = agents.find((a: any) => a.handle === handle);
    if (!agent || !agent.projects || !agent.projects[index]) {
      return `proj_${handle}_${index + 1}`;
    }
    return agent.projects[index].id;
  };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();

  const catalog: ListingSeedData[] = [
    // MARCUS (Wholesaler) - PUBLIC
    {
      id: 'listing_marcus_chen_1',
      agentHandle: 'marcus_chen',
      agentName: 'Marcus Chen',
      agentEmail: 'marcus.chen.synthetic@paperworking.co',
      persona: 'wholesaler',
      title: 'Cleveland SFR Off-Market — $129k, ARV $165k, 12-day close',
      projectId: findProject('marcus_chen', 0),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 129000,
      description: 'Turnkey off-market single family residence in Cleveland. Contract assigned with a 12-day close window and strong ROI potential.',
    },
    {
      id: 'listing_marcus_chen_2',
      agentHandle: 'marcus_chen',
      agentName: 'Marcus Chen',
      agentEmail: 'marcus.chen.synthetic@paperworking.co',
      persona: 'wholesaler',
      title: 'Akron Duplex Lead — $80.5k assignment, needs cash buyer',
      projectId: findProject('marcus_chen', 1),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 80500,
      description: 'High-yield Akron duplex wholesale lead ready for quick double-close. Cash buyer needed immediately for fast assignment.',
    },
    {
      id: 'listing_marcus_chen_3',
      agentHandle: 'marcus_chen',
      agentName: 'Marcus Chen',
      agentEmail: 'marcus.chen.synthetic@paperworking.co',
      persona: 'wholesaler',
      title: 'Columbus Wholesale Lead — $104k, ARV $140k, 7-day assignment',
      projectId: findProject('marcus_chen', 2),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: today,
      isNewListing: true,
      status: 'active',
      askingPrice: 104000,
      description: 'Fresh Columbus wholesale opportunity with high ARV spread. 7-day assignment agreement ready for experienced buyers.',
    },

    // DANA (Fix and Flipper) - PUBLIC
    {
      id: 'listing_dana_rodriguez_1',
      agentHandle: 'dana_rodriguez',
      agentName: 'Dana Rodriguez',
      agentEmail: 'dana.rodriguez.synthetic@paperworking.co',
      persona: 'fix_and_flip',
      title: 'Phoenix 4/2 Fully Renovated — $450k, open house this Saturday',
      projectId: findProject('dana_rodriguez', 0),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 450000,
      description: 'Completely renovated 4-bedroom 2-bath home in Phoenix. Modern finishes throughout, open layout, open house this Saturday.',
    },
    {
      id: 'listing_dana_rodriguez_2',
      agentHandle: 'dana_rodriguez',
      agentName: 'Dana Rodriguez',
      agentEmail: 'dana.rodriguez.synthetic@paperworking.co',
      persona: 'fix_and_flip',
      title: 'Scottsdale Cosmetic Flip — $465k ARV, move-in ready',
      projectId: findProject('dana_rodriguez', 1),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 465000,
      description: 'Turnkey cosmetic flip in Scottsdale with high-end upgrades. Move-in ready for end buyers or immediate rental.',
    },
    {
      id: 'listing_dana_rodriguez_3',
      agentHandle: 'dana_rodriguez',
      agentName: 'Dana Rodriguez',
      agentEmail: 'dana.rodriguez.synthetic@paperworking.co',
      persona: 'fix_and_flip',
      title: 'Tempe Full Gut Renovation — $520k ARV, 90-day flip',
      projectId: findProject('dana_rodriguez', 2),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: today,
      isNewListing: true,
      status: 'active',
      askingPrice: 520000,
      description: 'High-upside full gut renovation project in prime Tempe market. Projected 90-day execution timeline with $520k ARV.',
    },

    // WHITMORE (Buy & Hold) - PUBLIC
    {
      id: 'listing_whitmore_1',
      agentHandle: 'whitmore',
      agentName: 'J. & Patricia Whitmore',
      agentEmail: 'whitmore.synthetic@paperworking.co',
      persona: 'buy_and_hold',
      title: 'Austin 4-Plex — Value-Add Opportunity, $850k, rents can push to $1,800',
      projectId: findProject('whitmore', 0),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 850000,
      description: 'Prime Austin 4-plex with immediate rent upside to $1,800/unit upon light interior updates. Strong cash flow foundation.',
    },
    {
      id: 'listing_whitmore_2',
      agentHandle: 'whitmore',
      agentName: 'J. & Patricia Whitmore',
      agentEmail: 'whitmore.synthetic@paperworking.co',
      persona: 'buy_and_hold',
      title: 'Houston Duplex — Turnkey Cash Flow, $759/mo net, 9.4% CoC',
      projectId: findProject('whitmore', 1),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 385000,
      description: 'Fully occupied Houston duplex generating $759/mo net cash flow. 9.4% Cash-on-Cash return with long-term tenants in place.',
    },
    {
      id: 'listing_whitmore_3',
      agentHandle: 'whitmore',
      agentName: 'J. & Patricia Whitmore',
      agentEmail: 'whitmore.synthetic@paperworking.co',
      persona: 'buy_and_hold',
      title: 'San Antonio Triplex — $620k, $1,200/unit, stabilized',
      projectId: findProject('whitmore', 2),
      syntheticAgent: true,
      visibility: 'PUBLIC',
      createdAt: today,
      isNewListing: true,
      status: 'active',
      askingPrice: 620000,
      description: 'Stabilized San Antonio triplex with $1,200/unit monthly rental income. Low maintenance requirements and solid occupancy history.',
    },

    // ATLAS (Commercial) - NETWORK_ONLY
    {
      id: 'listing_robert_kim_1',
      agentHandle: 'robert_kim',
      agentName: 'Robert Kim / Atlas Commercial Group',
      agentEmail: 'robert.kim.synthetic@paperworking.co',
      persona: 'commercial',
      title: 'Plano Retail Strip — 100% Occupied, NNN Leases, 8.0% Cap',
      projectId: findProject('robert_kim', 0),
      syntheticAgent: true,
      visibility: 'NETWORK_ONLY',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 3200000,
      description: '100% occupied Plano retail strip center with long-term NNN tenant leases. Delivering a stable 8.0% cap rate return.',
    },
    {
      id: 'listing_robert_kim_2',
      agentHandle: 'robert_kim',
      agentName: 'Robert Kim / Atlas Commercial Group',
      agentEmail: 'robert.kim.synthetic@paperworking.co',
      persona: 'commercial',
      title: 'Fort Worth Industrial Flex — $2.85M, Credit Tenant, 7-Yr Lease',
      projectId: findProject('robert_kim', 1),
      syntheticAgent: true,
      visibility: 'NETWORK_ONLY',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 2850000,
      description: 'Class-A Fort Worth industrial flex facility leased to national credit tenant on a 7-year corporate guarantee.',
    },
    {
      id: 'listing_robert_kim_3',
      agentHandle: 'robert_kim',
      agentName: 'Robert Kim / Atlas Commercial Group',
      agentEmail: 'robert.kim.synthetic@paperworking.co',
      persona: 'commercial',
      title: 'Dallas Mixed-Use — $4.1M, Retail + Office, Value-Add',
      projectId: findProject('robert_kim', 2),
      syntheticAgent: true,
      visibility: 'NETWORK_ONLY',
      createdAt: today,
      isNewListing: true,
      status: 'active',
      askingPrice: 4100000,
      description: 'Prime Dallas urban corridor mixed-use asset combining street retail and office suites. Value-add lease-up potential.',
    },

    // ELEANOR (Syndicator) - NETWORK_ONLY
    {
      id: 'listing_eleanor_vance_1',
      agentHandle: 'eleanor_vance',
      agentName: 'Eleanor Vance',
      agentEmail: 'eleanor.vance.synthetic@paperworking.co',
      persona: 'syndicator',
      title: 'Tampa 100-Unit Value-Add — $50k Min, 8% Pref, 18.4% Projected IRR',
      projectId: findProject('eleanor_vance', 0),
      syntheticAgent: true,
      visibility: 'NETWORK_ONLY',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 14500000,
      description: '100-unit multifamily value-add syndication opportunity in Tampa MSA. $50k minimum investment, 8% preferred return, 18.4% IRR.',
    },
    {
      id: 'listing_eleanor_vance_2',
      agentHandle: 'eleanor_vance',
      agentName: 'Eleanor Vance',
      agentEmail: 'eleanor.vance.synthetic@paperworking.co',
      persona: 'syndicator',
      title: 'Orlando 60-Unit Core-Plus — Stabilized, 6.5% Cap, $25k Min',
      projectId: findProject('eleanor_vance', 1),
      syntheticAgent: true,
      visibility: 'NETWORK_ONLY',
      createdAt: thirtyDaysAgo,
      isNewListing: false,
      status: 'active',
      askingPrice: 9200000,
      description: 'Stabilized 60-unit core-plus asset in Orlando. 6.5% entry cap rate with strong quarterly distribution history. $25k min.',
    },
    {
      id: 'listing_eleanor_vance_3',
      agentHandle: 'eleanor_vance',
      agentName: 'Eleanor Vance',
      agentEmail: 'eleanor.vance.synthetic@paperworking.co',
      persona: 'syndicator',
      title: 'Jacksonville 80-Unit — $11.8M, Value-Add, 16.8% Projected IRR',
      projectId: findProject('eleanor_vance', 2),
      syntheticAgent: true,
      visibility: 'NETWORK_ONLY',
      createdAt: today,
      isNewListing: true,
      status: 'active',
      askingPrice: 11800000,
      description: '80-unit Jacksonville multifamily acquisition with proven value-add interior upgrade program. Target 16.8% projected IRR.',
    },
  ];

  for (const item of catalog) {
    // 1. Write to Firestore `dealListings` collection
    await adminDb.collection('dealListings').doc(item.id).set(item, { merge: true });

    // 2. Write to Prisma `MarketplaceListing` table
    const agent = agents.find((a: any) => a.handle === item.agentHandle);
    const userId = agent ? agent.uid : null;

    await prisma.marketplaceListing.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        syntheticAgent: true,
        userId: userId,
      },
      create: {
        id: item.id,
        title: item.title,
        syntheticAgent: true,
        userId: userId,
      },
    });

    console.log(`   🏪 Listing Seeded: ${item.id} — "${item.title}" [${item.visibility}] (${item.isNewListing ? 'NEW' : 'OLD'})`);
  }

  console.log(`🎉 Successfully seeded 15 Marketplace Listings across Firestore & Prisma!`);
}

if (require.main === module) {
  runSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeder failed:', err);
      process.exit(1);
    });
}
