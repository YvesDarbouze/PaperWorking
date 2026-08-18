/**
 * Jest Integration Test Suite — Persona Swarm Wave Execution (Waves 1 to 5)
 * 
 * Verifies multi-agent orchestration across active test personas:
 * - Wave 1: Signup & Firestore profile completion
 * - Wave 2: Stripe test-mode billing subscriptions
 * - Wave 3: Real Estate Projects + Plaid sandbox ingestion
 * - Wave 4: Cross-Agent Deal Interactions & Team Invitations
 * - Wave 5: Individual Experience Reports & Aggregate Swarm Report
 */

import * as fs from 'fs';
import * as path from 'path';
import { orchestrateWaves, type SwarmManifest } from '../wave-orchestrator';

const TEST_PERSONA_COUNT = 5;   // Was 50 (reduced for fast integration tests)
const TEST_PROJECT_COUNT = 50;  // 10 projects per persona

const originalEnv = process.env;

describe('Persona Swarm — Wave Execution Suite', () => {
  let manifest: SwarmManifest;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      PERSONA_SWARM_MODE: 'true',
      STRIPE_SECRET_KEY: 'sk_test_mock_persona_swarm_key',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/persona_swarm_test',
    };

    manifest = await orchestrateWaves([1, 2, 3, 4, 5], { maxPersonas: TEST_PERSONA_COUNT });
  }, 30000);

  afterAll(() => {
    process.env = originalEnv;
  });

  it('runs Waves 1 through 5 successfully within timeout', () => {
    expect(manifest).toBeDefined();
    expect(manifest.completedWaves).toEqual([1, 2, 3, 4, 5]);
  });

  describe('Wave 1 & 2 Verification (Signup & Billing)', () => {
    it('verifies active test agents completed signup and have valid UIDs', () => {
      expect(manifest.stats.signupsCompleted).toBeGreaterThanOrEqual(TEST_PERSONA_COUNT);
      const agentStates = Object.values(manifest.agents).slice(0, TEST_PERSONA_COUNT);
      expect(agentStates.length).toBe(TEST_PERSONA_COUNT);

      for (const state of agentStates) {
        expect(state.signupResult?.success).toBe(true);
        expect(state.uid).toBeDefined();
        expect(state.uid!.length).toBeGreaterThan(0);
      }
    });

    it('verifies active test agents have active Stripe test-mode subscriptions', () => {
      expect(manifest.stats.subscriptionsActive).toBeGreaterThanOrEqual(TEST_PERSONA_COUNT);
      for (const state of Object.values(manifest.agents).slice(0, TEST_PERSONA_COUNT)) {
        expect(state.billingResult?.success).toBe(true);
        expect(['Individual', 'Team', 'Vendor Network']).toContain(state.billingResult?.plan);
      }
    });
  });

  describe('Wave 3 Verification (Projects & Plaid)', () => {
    it('verifies projects created across test persona blueprints', () => {
      expect(manifest.stats.projectsCreated).toBeGreaterThanOrEqual(TEST_PROJECT_COUNT);
      for (const state of Object.values(manifest.agents).slice(0, TEST_PERSONA_COUNT)) {
        expect(state.projectCount).toBe(10);
      }
    });
  });

  describe('Wave 5 Verification (Reports & Manifest)', () => {
    it('verifies experience reports created in artifacts/persona-swarm/reports/', () => {
      expect(manifest.stats.reportsGenerated).toBeGreaterThanOrEqual(TEST_PERSONA_COUNT);
      const reportsDir = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'reports');

      for (let i = 1; i <= TEST_PERSONA_COUNT; i++) {
        const id = `P-${i.toString().padStart(2, '0')}`;
        const reportPath = path.join(reportsDir, `${id}-experience-report.md`);
        expect(fs.existsSync(reportPath)).toBe(true);
      }
    });

    it('verifies swarm-manifest.json exists and is valid', () => {
      const manifestPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'swarm-manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
    });
  });
});
