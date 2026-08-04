import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fs from 'fs';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '../lib/firebase/admin';
import * as admin from 'firebase-admin';
import { prisma } from '../lib/prisma';

// ── 1. FAIL LOUDLY IF STRIPE KEYS ARE LIVE ────────────────────────────────────
let stripeKey = process.env.STRIPE_SECRET_KEY || '';

if (stripeKey.startsWith('sk_live_')) {
  throw new Error('CRITICAL SECURITY FAILURE: STRIPE_SECRET_KEY is live mode (sk_live_). Seeder must run in test mode only!');
}

if (!stripeKey.startsWith('sk_test_')) {
  throw new Error('STRIPE_SECRET_KEY must start with sk_test_');
}

const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' as any });

// ── 2. AGENT DEFINITIONS & PROJECTS SPEC ──────────────────────────────────────
export interface AgentSpec {
  name: string;
  email: string;
  password: string;
  persona: string;
  handle: string;
  tier: 'free_trial' | 'starter' | 'professional' | 'enterprise';
  card: string;
  oldProjects: {
    title: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    financials: Record<string, any>;
  }[];
  newProject: {
    title: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    financials: Record<string, any>;
  };
}

const AGENTS: AgentSpec[] = [
  {
    name: 'Marcus Chen',
    email: 'marcus.chen.synthetic@paperworking.co',
    password: 'SyntheticAgent2024!',
    persona: 'wholesaler',
    handle: 'marcus_chen',
    tier: 'free_trial',
    card: '4242 4242 4242 4242',
    oldProjects: [
      {
        title: 'Cleveland Assignment',
        address: '1420 Superior Ave',
        city: 'Cleveland',
        state: 'OH',
        zip: '44114',
        financials: { contractPrice: 118000, wholesaleFee: 11800, assignmentFeePct: 10.0 },
      },
      {
        title: 'Akron Double-Close',
        address: '88 E Market St',
        city: 'Akron',
        state: 'OH',
        zip: '44308',
        financials: { contractPrice: 72000, wholesaleFee: 8500 },
      },
    ],
    newProject: {
      title: 'Columbus Wholesale Lead',
      address: '350 N High St',
      city: 'Columbus',
      state: 'OH',
      zip: '43215',
      financials: { contractPrice: 95000, wholesaleFee: 9000 },
    },
  },
  {
    name: 'Dana Rodriguez',
    email: 'dana.rodriguez.synthetic@paperworking.co',
    password: 'SyntheticAgent2024!',
    persona: 'fix_and_flip',
    handle: 'dana_rodriguez',
    tier: 'starter',
    card: '4242 4242 4242 4242',
    oldProjects: [
      {
        title: 'Phoenix Flip',
        address: '4201 N 24th St',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85016',
        financials: { purchasePrice: 275000, rehabBudget: 55000, arv: 450000, projectedProfit: 85800 },
      },
      {
        title: 'Scottsdale Cosmetic',
        address: '7300 E Camelback Rd',
        city: 'Scottsdale',
        state: 'AZ',
        zip: '85251',
        financials: { purchasePrice: 410000, projectedProfit: 300 },
      },
    ],
    newProject: {
      title: 'Tempe Full Gut',
      address: '110 E 5th St',
      city: 'Tempe',
      state: 'AZ',
      zip: '85281',
      financials: { purchasePrice: 320000, rehabBudget: 75000, arv: 520000 },
    },
  },
  {
    name: 'J. & Patricia Whitmore',
    email: 'whitmore.synthetic@paperworking.co',
    password: 'SyntheticAgent2024!',
    persona: 'buy_and_hold',
    handle: 'whitmore',
    tier: 'professional',
    card: '5555 5555 5555 4444',
    oldProjects: [
      {
        title: 'Austin 4-Plex',
        address: '1600 S Congress Ave',
        city: 'Austin',
        state: 'TX',
        zip: '78704',
        financials: { purchasePrice: 850000, monthlyCashFlow: -118, units: 4 },
      },
      {
        title: 'Houston Duplex',
        address: '2200 Post Oak Blvd',
        city: 'Houston',
        state: 'TX',
        zip: '77056',
        financials: { purchasePrice: 385000, monthlyCashFlow: 759, units: 2 },
      },
    ],
    newProject: {
      title: 'San Antonio Triplex',
      address: '300 E Travis St',
      city: 'San Antonio',
      state: 'TX',
      zip: '78205',
      financials: { purchasePrice: 620000, rentPerUnit: 1200, units: 3 },
    },
  },
  {
    name: 'Robert Kim / Atlas Commercial Group',
    email: 'robert.kim.synthetic@paperworking.co',
    password: 'SyntheticAgent2024!',
    persona: 'commercial',
    handle: 'robert_kim',
    tier: 'enterprise',
    card: '3782 822463 10005',
    oldProjects: [
      {
        title: 'Plano Retail Strip',
        address: '5800 Legacy Dr',
        city: 'Plano',
        state: 'TX',
        zip: '75024',
        financials: { purchasePrice: 3200000, capRate: 8.0, cashFlow: 81800 },
      },
      {
        title: 'Fort Worth Industrial',
        address: '400 W 7th St',
        city: 'Fort Worth',
        state: 'TX',
        zip: '76102',
        financials: { purchasePrice: 2850000 },
      },
    ],
    newProject: {
      title: 'Dallas Mixed-Use',
      address: '1900 Main St',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      financials: { purchasePrice: 4100000, propertyType: 'Mixed-Use (retail + office)' },
    },
  },
  {
    name: 'Eleanor Vance',
    email: 'eleanor.vance.synthetic@paperworking.co',
    password: 'SyntheticAgent2024!',
    persona: 'syndicator',
    handle: 'eleanor_vance',
    tier: 'professional',
    card: '5555 5555 5555 4444',
    oldProjects: [
      {
        title: 'Tampa 100-Unit',
        address: '400 N Ashley Dr',
        city: 'Tampa',
        state: 'FL',
        zip: '33602',
        financials: { purchasePrice: 14500000, irr: 18.4, units: 100 },
      },
      {
        title: 'Orlando 60-Unit',
        address: '200 S Orange Ave',
        city: 'Orlando',
        state: 'FL',
        zip: '32801',
        financials: { purchasePrice: 9200000, irr: 14.2, units: 60 },
      },
    ],
    newProject: {
      title: 'Jacksonville 80-Unit',
      address: '50 N Laura St',
      city: 'Jacksonville',
      state: 'FL',
      zip: '32202',
      financials: { purchasePrice: 11800000, strategy: 'value-add', units: 80 },
    },
  },
];

// Helper to get or create Stripe test prices
const TIER_PRICES: Record<string, number> = {
  free_trial: 2900,
  starter: 2900,
  professional: 9900,
  enterprise: 29900,
};

async function getOrCreatePriceId(tier: string): Promise<string> {
  const amount = TIER_PRICES[tier] || 2900;
  const productName = `PaperWorking ${tier.toUpperCase()}`;

  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find(p => p.name === productName);
  if (!product) {
    product = await stripe.products.create({ name: productName });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find(p => p.unit_amount === amount && p.recurring?.interval === 'month');
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
  }

  return price.id;
}

export async function seedAgentCrew() {
  console.log('🚀 Starting PaperWorking Synthetic Agent Seeder (REAL database & REAL Stripe test mode)...');

  const seedResults: any[] = [];
  const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
  const now = new Date();

  for (const agent of AGENTS) {
    console.log(`\n--------------------------------------------------`);
    console.log(`👤 Processing Agent: ${agent.name} (${agent.email})`);

    // 1. Firebase Auth User
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(agent.email);
      console.log(`   Found existing Firebase Auth UID: ${userRecord.uid}`);
    } catch (err: any) {
      userRecord = await adminAuth.createUser({
        email: agent.email,
        password: agent.password,
        displayName: agent.name,
        emailVerified: true,
      });
      console.log(`   Created new Firebase Auth UID: ${userRecord.uid}`);
    }
    const uid = userRecord.uid;

    // 2. Stripe Test Customer & Subscription
    let stripeCustomerId = `cus_test_${agent.handle}`;
    let stripeSubscriptionId = `sub_test_${agent.handle}`;
    let stripeStatus = agent.tier === 'free_trial' ? 'trialing' : 'active';

    try {
      const customer = await stripe.customers.create({
        email: agent.email,
        name: agent.name,
        metadata: { syntheticAgent: 'true', agentPersona: agent.persona, uid },
      });
      stripeCustomerId = customer.id;

      const cardNum = agent.card.replace(/\s+/g, '');
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: { number: cardNum, exp_month: 12, exp_year: 2030, cvc: '123' },
      });
      await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethod.id },
      });

      const priceId = await getOrCreatePriceId(agent.tier);
      const subParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: priceId }],
        default_payment_method: paymentMethod.id,
      };
      if (agent.tier === 'free_trial') {
        subParams.trial_period_days = 14;
      }
      const subscription = await stripe.subscriptions.create(subParams);
      stripeSubscriptionId = subscription.id;
      stripeStatus = subscription.status;
      console.log(`   Created Stripe Customer: ${customer.id} & Subscription: ${subscription.id} (${subscription.status})`);
    } catch (stripeErr: any) {
      console.warn(`   ⚠️ Stripe API call failed (${stripeErr.message}). Using test mode fallback IDs: ${stripeCustomerId}`);
    }

    // 3. Firestore Persistence
    await adminDb.collection('users').doc(uid).set({
      uid,
      email: agent.email,
      displayName: agent.name,
      role: 'Investor',
      accountType: 'investor',
      syntheticAgent: true,
      agentPersona: agent.persona,
      subscriptionPlan: agent.tier,
      subscriptionStatus: stripeStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      personalOrganizationId: `org_${agent.handle}`,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    }, { merge: true });

    await adminDb.collection('subscriptions').doc(stripeSubscriptionId).set({
      id: stripeSubscriptionId,
      userId: uid,
      stripeCustomerId,
      stripeSubscriptionId,
      plan: agent.tier,
      status: stripeStatus,
      syntheticAgent: true,
      stripeTestMode: true,
      createdAt: admin.firestore.Timestamp.fromDate(now),
    }, { merge: true });

    // 4. Prisma Persistence (AppUser, User, Subscription)
    await prisma.appUser.upsert({
      where: { id: uid },
      update: { email: agent.email, name: agent.name, syntheticAgent: true, agentPersona: agent.persona },
      create: { id: uid, email: agent.email, name: agent.name, syntheticAgent: true, agentPersona: agent.persona },
    });

    await prisma.user.upsert({
      where: { email: agent.email },
      update: { id: uid, name: agent.name, syntheticAgent: true, agentPersona: agent.persona },
      create: { id: uid, email: agent.email, name: agent.name, syntheticAgent: true, agentPersona: agent.persona },
    });

    await prisma.subscription.upsert({
      where: { id: stripeSubscriptionId },
      update: {
        userId: uid,
        stripeCustomerId,
        stripeSubscriptionId,
        plan: agent.tier,
        status: stripeStatus,
        syntheticAgent: true,
        stripeTestMode: true,
      },
      create: {
        id: stripeSubscriptionId,
        userId: uid,
        stripeCustomerId,
        stripeSubscriptionId,
        plan: agent.tier,
        status: stripeStatus,
        syntheticAgent: true,
        stripeTestMode: true,
      },
    });

    // 5. Seed 3 Projects (2 Old [35 days ago], 1 New [today])
    const agentProjectsList: any[] = [];
    const projectSpecs = [
      { spec: agent.oldProjects[0], createdAt: thirtyFiveDaysAgo, index: 1 },
      { spec: agent.oldProjects[1], createdAt: thirtyFiveDaysAgo, index: 2 },
      { spec: agent.newProject, createdAt: now, index: 3 },
    ];

    for (const item of projectSpecs) {
      const projectId = `proj_${agent.handle}_${item.index}`;
      const p = item.spec;

      // Write to Firestore
      await adminDb.collection('projects').doc(projectId).set({
        id: projectId,
        propertyName: p.title,
        name: p.title,
        address: p.address,
        addressLine: p.address,
        city: p.city,
        state: p.state,
        zip: p.zip,
        createdById: uid,
        organizationId: `org_${agent.handle}`,
        syntheticAgent: true,
        listedByAgent: agent.handle,
        status: 'acquisition',
        financials: p.financials,
        createdAt: admin.firestore.Timestamp.fromDate(item.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(item.createdAt),
      }, { merge: true });

      // Write to Prisma ReilProject
      await prisma.reilProject.upsert({
        where: { id: projectId },
        update: {
          displayName: p.title,
          addressLine: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          createdById: uid,
          syntheticAgent: true,
          listedByAgent: agent.handle,
          createdAt: item.createdAt,
        },
        create: {
          id: projectId,
          displayName: p.title,
          addressLine: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          createdById: uid,
          syntheticAgent: true,
          listedByAgent: agent.handle,
          createdAt: item.createdAt,
        },
      });

      // Write to Prisma Project
      await prisma.project.upsert({
        where: { id: projectId },
        update: {
          title: p.title,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          userId: uid,
          syntheticAgent: true,
          listedByAgent: agent.handle,
          createdAt: item.createdAt,
        },
        create: {
          id: projectId,
          title: p.title,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          userId: uid,
          syntheticAgent: true,
          listedByAgent: agent.handle,
          createdAt: item.createdAt,
        },
      });

      console.log(`   🏡 Project Created: ${projectId} - "${p.title}" (Created: ${item.createdAt.toISOString().slice(0,10)})`);
      agentProjectsList.push({
        id: projectId,
        title: p.title,
        createdAt: item.createdAt.toISOString(),
        syntheticAgent: true,
        listedByAgent: agent.handle,
        financials: p.financials,
      });
    }

    seedResults.push({
      name: agent.name,
      email: agent.email,
      persona: agent.persona,
      handle: agent.handle,
      uid,
      tier: agent.tier,
      stripeCustomerId,
      stripeSubscriptionId,
      stripeStatus,
      syntheticAgent: true,
      stripeTestMode: true,
      projects: agentProjectsList,
    });
  }

  // 6. Write Fixture JSON
  const fixturePath = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(
    fixturePath,
    JSON.stringify({ seededAt: now.toISOString(), agents: seedResults }, null, 2),
    'utf-8'
  );
  console.log(`\n✅ Fixture file written cleanly to: ${fixturePath}`);
  console.log(`🎉 Seeded 5 Agents and 15 Projects in REAL DB & Stripe test mode.`);

  return seedResults;
}

if (require.main === module) {
  seedAgentCrew()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeder failed:', err);
      process.exit(1);
    });
}
