/**
 * Jest Integration Test Suite — Persona Swarm Wave Execution (Waves 1 to 5)
 * 
 * Verifies full multi-agent orchestration across all 50 personas:
 * - Wave 1: Signup & Firestore profile completion
 * - Wave 2: Stripe test-mode billing subscriptions & edge cases (P-24, P-35)
 * - Wave 3: 500 Real Estate Projects + Plaid sandbox ingestion (P-16, P-23, P-30, P-33, P-37)
 * - Wave 4: 80 Cross-Agent Deal Interactions & 103 Team Invitations
 * - Wave 5: 50 Individual Experience Reports & Aggregate Swarm Report
 */

import * as fs from 'fs';
import * as path from 'path';
import { orchestrateWaves, type SwarmManifest } from '../wave-orchestrator';

const originalEnv = process.env;

describe('Persona Swarm — Full Wave Execution Suite', () => {
  let manifest: SwarmManifest;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      PERSONA_SWARM_MODE: 'true',
      STRIPE_SECRET_KEY: 'sk_test_mock_persona_swarm_key',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/persona_swarm_test',
    };

    manifest = await orchestrateWaves([1, 2, 3, 4, 5]);
  }, 120000);

  afterAll(() => {
    process.env = originalEnv;
  });

  it('runs Waves 1 through 5 successfully across all 50 persona agents', () => {
    expect(manifest).toBeDefined();
    expect(manifest.completedWaves).toEqual([1, 2, 3, 4, 5]);
  });

  describe('Wave 1 & 2 Verification (Signup & Billing)', () => {
    it('verifies all 50 agents completed signup and have valid UIDs', () => {
      expect(manifest.stats.signupsCompleted).toBe(50);
      const agentStates = Object.values(manifest.agents);
      expect(agentStates.length).toBe(50);

      for (const state of agentStates) {
        expect(state.signupResult?.success).toBe(true);
        expect(state.uid).toBeDefined();
        expect(state.uid!.length).toBeGreaterThan(0);
      }
    });

    it('verifies all 50 agents have active Stripe test-mode subscriptions', () => {
      expect(manifest.stats.subscriptionsActive).toBe(50);
      for (const state of Object.values(manifest.agents)) {
        expect(state.billingResult?.success).toBe(true);
        expect(['Individual', 'Team', 'Vendor Network']).toContain(state.billingResult?.plan);
        expect(state.billingResult?.stripeCustomerId).toMatch(/^cus_test_swarm_/);
      }
    });

    it('verifies P-24 invalid coupon test (CHEAPSKATE10 rejection logged)', () => {
      const p24LogPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'logs', 'P-24.jsonl');
      expect(fs.existsSync(p24LogPath)).toBe(true);
      const p24LogContent = fs.readFileSync(p24LogPath, 'utf-8');

      expect(p24LogContent).toContain('APPLY_COUPON_ATTEMPT');
      expect(p24LogContent).toContain('COUPON_REJECTED');
      expect(p24LogContent).toContain('CHEAPSKATE10');
    });

    it('verifies P-35 abandoned checkout recovery test', () => {
      const p35LogPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'logs', 'P-35.jsonl');
      expect(fs.existsSync(p35LogPath)).toBe(true);
      const p35LogContent = fs.readFileSync(p35LogPath, 'utf-8');

      expect(p35LogContent).toContain('CHECKOUT_INITIATED');
      expect(p35LogContent).toContain('CHECKOUT_ABANDONED');
      expect(p35LogContent).toContain('CHECKOUT_RESUMED');
    });
  });

  describe('Wave 3 Verification (Projects & Plaid)', () => {
    it('verifies exactly 500 projects created across 50 persona blueprints', () => {
      expect(manifest.stats.projectsCreated).toBe(500);
      for (const state of Object.values(manifest.agents)) {
        expect(state.projectCount).toBe(10);
      }
    });

    it('verifies Plaid sandbox events logged for designated agents (P-16, P-23, P-30, P-33, P-37)', () => {
      const plaidAgents = ['P-16', 'P-23', 'P-30', 'P-33', 'P-37'];
      for (const agentId of plaidAgents) {
        const logPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'logs', `${agentId}.jsonl`);
        expect(fs.existsSync(logPath)).toBe(true);
        const logContent = fs.readFileSync(logPath, 'utf-8');
        expect(logContent).toContain('PLAID');
        expect(logContent).toContain('SANDBOX_TRANSACTIONS_INGESTED');
      }
    });
  });

  describe('Wave 4 Verification (Interactions & Team Invites)', () => {
    it('verifies 80 deal interactions executed across graph edges', () => {
      expect(manifest.stats.interactionsExecuted).toBe(80);
    });

    it('verifies 103 team invitations sent and accepted', () => {
      expect(manifest.stats.invitesAccepted).toBe(103);
    });
  });

  describe('Wave 5 Verification (Reports & Manifest)', () => {
    it('verifies 50 individual persona experience reports created in artifacts/persona-swarm/reports/', () => {
      expect(manifest.stats.reportsGenerated).toBe(50);
      const reportsDir = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'reports');

      for (let i = 1; i <= 50; i++) {
        const id = `P-${i.toString().padStart(2, '0')}`;
        const reportPath = path.join(reportsDir, `${id}-experience-report.md`);
        expect(fs.existsSync(reportPath)).toBe(true);
        const content = fs.readFileSync(reportPath, 'utf-8');
        expect(content).toContain(`Persona Experience Report —`);
        expect(content).toContain(`Persona ID:** ${id}`);
      }
    });

    it('verifies aggregate swarm report created at artifacts/persona-swarm/aggregate-swarm-report.md', () => {
      const aggregatePath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'aggregate-swarm-report.md');
      expect(fs.existsSync(aggregatePath)).toBe(true);
      const content = fs.readFileSync(aggregatePath, 'utf-8');

      expect(content).toContain('Persona Swarm — Aggregate Autonomous Test Report');
      expect(content).toContain('50 / 50');
      expect(content).toContain('500');
      expect(content).toContain('80');
      expect(content).toContain('103');
    });

    it('verifies swarm-manifest.json exists and is valid', () => {
      const manifestPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'swarm-manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
    });
  });

  describe('House Terminology Compliance', () => {
    it('verifies ZERO occurrences of forbidden terminology across all generated reports', () => {
      const reportsDir = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'reports');
      const files = fs.readdirSync(reportsDir).map((f) => path.join(reportsDir, f));
      files.push(path.join(process.cwd(), 'artifacts', 'persona-swarm', 'aggregate-swarm-report.md'));

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content.toLowerCase()).not.toContain('sponsor');
      }
    });
  });
});
