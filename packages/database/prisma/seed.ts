/**
 * Dev/demo seed ONLY — never run against production as SoT replacement.
 * Usage: `npm run seed --workspace=@paperworking/database`
 */
import 'dotenv/config';
import { getApiPrismaClient } from '../src/client.js';

async function main() {
  const prisma = getApiPrismaClient();

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    create: { name: 'Demo Organization', slug: 'demo-org' },
    update: { name: 'Demo Organization' },
  });

  const user = await prisma.user.upsert({
    where: { email: 'dev@paperworking.test' },
    create: {
      id: 'dev-user-1',
      firebaseUid: 'dev-user-1',
      email: 'dev@paperworking.test',
      name: 'Dev User',
      displayName: 'Dev User',
      accountType: 'investor',
      role: 'CEO',
    },
    update: { displayName: 'Dev User' },
  });

  await prisma.organizationMember.upsert({
    where: { id: 'om-dev-1' },
    create: {
      id: 'om-dev-1',
      organizationId: org.id,
      userId: user.id,
      email: user.email,
      role: 'CEO',
      status: 'active',
    },
    update: { role: 'CEO', status: 'active' },
  });

  await prisma.project.upsert({
    where: { id: 'proj_harbor' },
    create: {
      id: 'proj_harbor',
      name: '88 Harbor Lane',
      title: '88 Harbor Lane',
      status: 'active',
      currentPhase: 2,
      purchasePrice: 425000,
      organizationId: org.id,
      userId: user.id,
    },
    update: { name: '88 Harbor Lane', currentPhase: 2 },
  });

  await prisma.project.upsert({
    where: { id: 'proj_elm' },
    create: {
      id: 'proj_elm',
      name: '1247 Elm Street',
      title: '1247 Elm Street',
      status: 'active',
      currentPhase: 1,
      purchasePrice: 310000,
      organizationId: org.id,
      userId: user.id,
    },
    update: { name: '1247 Elm Street', currentPhase: 1 },
  });

  // eslint-disable-next-line no-console
  console.log('[seed] demo org/user/projects ready', { orgId: org.id, userId: user.id });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    // pool stays process-global; exit is fine for seed script
  });
