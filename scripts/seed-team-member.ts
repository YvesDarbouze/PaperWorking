import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing env vars');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

async function run() {
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  // 1. Create the Investment Team Member user (scoped to only the seeded deal)
  console.log('Seeding team member user...');
  await db.collection('users').doc('user_team_member_seed').set({
    uid: 'user_team_member_seed',
    email: 'team_member@apexcapital.io',
    displayName: 'Investment Team Member',
    organizationId: 'org_paperworking_seed',
    role: 'Investment Team',
    subscriptionPlan: 'Team',
    subscriptionStatus: 'active',
    membershipScopes: {
      org_paperworking_seed: {
        isScoped: true,
        scopedProjectIds: {
          deal_123_main_st_seed: true
        }
      }
    },
    createdAt: now,
    updatedAt: now,
  });

  // 2. Add them as a member to the seeded Project
  console.log('Adding team member to seeded project...');
  const dealRef = db.collection('projects').doc('deal_123_main_st_seed');
  const snap = await dealRef.get();
  if (snap.exists) {
    const data = snap.data();
    const members = data?.members || {};
    const assignedUsers = data?.assignedUsers || [];

    members['user_team_member_seed'] = {
      uid: 'user_team_member_seed',
      role: 'Investment Team',
      joinedAt: new Date().toISOString(),
    };

    if (!assignedUsers.includes('user_team_member_seed')) {
      assignedUsers.push('user_team_member_seed');
    }

    await dealRef.update({
      members,
      assignedUsers,
    });
    console.log('Project updated successfully.');
  } else {
    console.error('Seeded project not found!');
  }
}

run().catch(console.error);
