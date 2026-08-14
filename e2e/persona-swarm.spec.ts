import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Playwright End-to-End Test Suite — Persona Swarm Surface Navigation & Real PNG Screenshot Assertions (Amendment 2)
 * 
 * Asserts smoke cohort (P-01, P-05, P-32) metrics, experience report presence,
 * navigation contract compliance, terminology rule guards, and presence of real PNG screenshots.
 */

test.describe('Persona Swarm — Smoke Cohort & Surface Integrity (Amendment 2)', () => {
  const baseURL = process.env.PERSONA_SWARM_BASE_URL || 'http://localhost:3000';
  const manifestPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'swarm-manifest.json');
  const graphPath = path.join(process.cwd(), 'persona-swarm', 'config', 'interaction-graph.json');
  const shotsDir = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'shots', 'P-01');

  test('asserts smoke cohort (P-01, P-05, P-32) metrics, interactions, and report files', async () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));

    const smokeAgents = ['P-01', 'P-05', 'P-32'];

    for (const agentId of smokeAgents) {
      // 1. Assert project count in manifest equals 10
      const state = manifest.agents[agentId];
      expect(state).toBeDefined();
      expect(state.projectCount).toBe(10);

      // 2. Assert sent/received interaction counts match interaction-graph config
      const expectedOutboundEdges = graph.edges.filter((e: any) => e.from === agentId).length;
      expect(state.interactionCount).toBe(expectedOutboundEdges);

      const expectedInvitesSent = (graph.inviteMatrix[agentId] || []).length;
      expect(state.inviteCount).toBe(expectedInvitesSent);

      // 3. Assert agent's experience report file exists and is non-empty
      const reportPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'reports', `${agentId}-experience-report.md`);
      expect(fs.existsSync(reportPath)).toBe(true);
      const reportContent = fs.readFileSync(reportPath, 'utf-8');
      expect(reportContent.length).toBeGreaterThan(200);
      expect(reportContent).toContain(`Persona ID:** ${agentId}`);
    }
  });

  test('verifies global navigation contract routes and presence of captured PNG screenshots', async ({ page }) => {
    const requiredShots = [
      '01-signup-onboarding.png',
      '02-stripe-billing-checkout.png',
      '03-portfolio-command-center.png',
      '04-insights-kpi-analytics.png',
      '05-phase-gate-override.png',
      '06-team-collaboration-inbox.png',
    ];

    for (const file of requiredShots) {
      const shotPath = path.join(shotsDir, file);
      expect(fs.existsSync(shotPath)).toBe(true);
      expect(fs.statSync(shotPath).size).toBeGreaterThan(50000);
    }

    const routes = [
      '/dashboard/command-center',
      '/dashboard/projects',
      '/dashboard/deals',
      '/dashboard/insights',
      '/dashboard/reports',
      '/dashboard/settings/billing',
    ];

    for (const route of routes) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'commit' });
      await expect(page.locator('body')).toBeAttached();
    }
  });

  test('verifies zero occurrences of forbidden terminology on public & dashboard surfaces', async ({ page }) => {
    const routes = [
      '/',
      '/pricing',
      '/dashboard/command-center',
      '/dashboard/projects',
      '/dashboard/deals',
    ];

    for (const route of routes) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'commit' });
      const textContent = await page.innerText('body');
      expect(textContent.toLowerCase()).not.toContain('sponsor');
    }
  });
});
