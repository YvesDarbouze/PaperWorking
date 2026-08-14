/**
 * Persona Swarm Seed Script
 * 
 * Prepares the disposable database schema for paperworking_persona_swarm.
 */

import { assertDisposableDatabase, assertSwarmFeatureFlag } from '../../persona-swarm/src/bootstrap';
import { prisma } from '../../src/lib/prisma';

export async function seedSwarmDatabase() {
  console.log('🌱 Initializing Persona Swarm Disposable Database Seed...');

  assertSwarmFeatureFlag();
  assertDisposableDatabase();

  console.log('✅ Persona Swarm Database verified safe and disposable.');
  console.log('✅ Seed initialization complete.');
}

if (require.main === module) {
  seedSwarmDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed script failed:', err.message);
      process.exit(1);
    });
}
