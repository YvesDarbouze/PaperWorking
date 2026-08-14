/**
 * Jest Unit Test Suite — Persona Swarm Teardown Safety & Dry Run
 */

import { teardownSwarm } from '../../../scripts/persona-swarm/teardown';

describe('Persona Swarm Teardown Safety & Dry Run', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      PERSONA_SWARM_MODE: 'true',
      STRIPE_SECRET_KEY: 'sk_test_mock_persona_swarm_key',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/persona_swarm_test',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('executes teardownSwarm in --dry-run mode without throwing', async () => {
    await expect(teardownSwarm({ dryRun: true })).resolves.not.toThrow();
  });
});
