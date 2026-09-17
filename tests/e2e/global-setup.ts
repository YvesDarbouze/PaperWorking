import { seedTestUsers } from './fixtures/test-user-seed.js';

export default async function globalSetup() {
  // Seed dedicated test users with real password hashes for real auth verification
  seedTestUsers();
}
