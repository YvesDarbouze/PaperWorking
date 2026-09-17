import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, type AuthUser } from '@paperworking/api';

/**
 * Test database seed fixture.
 * MUST NEVER execute in a production environment.
 */
export function seedTestUsers(): Record<string, AuthUser> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test seed fixture must NEVER run in production environment!');
  }

  const passwordHash = hashPassword('Password123!');

  const users: Record<string, AuthUser> = {
    'e2e@paperworking.test': {
      uid: 'e2e-test-user-1',
      email: 'e2e@paperworking.test',
      passwordHash,
      accountType: 'investor',
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
      displayName: 'E2E Test User',
    },
    'investor@paperworking.test': {
      uid: 'dev-user-investor',
      email: 'investor@paperworking.test',
      passwordHash,
      accountType: 'investor',
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
      displayName: 'Dev Investor',
    },
    'admin@paperworking.test': {
      uid: 'dev-user-admin',
      email: 'admin@paperworking.test',
      passwordHash,
      accountType: 'admin',
      subscriptionPlan: 'Team',
      subscriptionStatus: 'active',
      displayName: 'Dev Admin',
    },
    'vendor@paperworking.test': {
      uid: 'dev-user-vendor',
      email: 'vendor@paperworking.test',
      passwordHash,
      accountType: 'vendor',
      subscriptionPlan: 'Vendor Network',
      subscriptionStatus: 'active',
      displayName: 'Dev Vendor',
    },
    'investment_team@paperworking.test': {
      uid: 'dev-user-investment-team',
      email: 'investment_team@paperworking.test',
      passwordHash,
      accountType: 'admin' as any,
      subscriptionPlan: 'Team',
      subscriptionStatus: 'active',
      displayName: 'Dev Investment Team',
    },
  };

  const dataDir = fileURLToPath(new URL('../data', import.meta.url));
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filePath = path.join(dataDir, 'test-users.json');
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');

  return users;
}
