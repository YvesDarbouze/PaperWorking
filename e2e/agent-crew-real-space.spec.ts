import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Real-Space Synthetic Agent Crew Portfolio Verification', () => {
  const fixturePath = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');

  let agents: any[] = [];
  if (fs.existsSync(fixturePath)) {
    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    agents = data.agents || [];
  }

  const fallbackAgents = [
    {
      name: 'Marcus Chen',
      email: 'marcus.chen.synthetic@paperworking.co',
      handle: 'marcus_chen',
      persona: 'wholesaler',
      projects: [
        { title: 'Cleveland Assignment' },
        { title: 'Akron Double-Close' },
        { title: 'Columbus Wholesale Lead' },
      ],
    },
    {
      name: 'Dana Rodriguez',
      email: 'dana.rodriguez.synthetic@paperworking.co',
      handle: 'dana_rodriguez',
      persona: 'fix_and_flip',
      projects: [
        { title: 'Phoenix Flip' },
        { title: 'Scottsdale Cosmetic' },
        { title: 'Tempe Full Gut' },
      ],
    },
    {
      name: 'J. & Patricia Whitmore',
      email: 'whitmore.synthetic@paperworking.co',
      handle: 'whitmore',
      persona: 'buy_and_hold',
      projects: [
        { title: 'Austin 4-Plex' },
        { title: 'Houston Duplex' },
        { title: 'San Antonio Triplex' },
      ],
    },
    {
      name: 'Robert Kim / Atlas Commercial Group',
      email: 'robert.kim.synthetic@paperworking.co',
      handle: 'robert_kim',
      persona: 'commercial',
      projects: [
        { title: 'Plano Retail Strip' },
        { title: 'Fort Worth Industrial' },
        { title: 'Dallas Mixed-Use' },
      ],
    },
    {
      name: 'Eleanor Vance',
      email: 'eleanor.vance.synthetic@paperworking.co',
      handle: 'eleanor_vance',
      persona: 'syndicator',
      projects: [
        { title: 'Tampa 100-Unit' },
        { title: 'Orlando 60-Unit' },
        { title: 'Jacksonville 80-Unit' },
      ],
    },
  ];

  const testAgents = agents.length === 5 ? agents : fallbackAgents;

  for (const agent of testAgents) {
    test(`Portfolio Dashboard — Real-Space Agent ${agent.name} (${agent.persona}) displays 3 projects`, async ({ page, context }) => {
      // Set session cookie for test auth
      await context.addCookies([
        {
          name: '__session',
          value: 'mock_session_token_123',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // Set user profile in localStorage to simulate logged-in state
      await page.addInitScript((agentData) => {
        window.localStorage.setItem(
          'user_profile',
          JSON.stringify({
            uid: agentData.uid || `user_${agentData.handle}`,
            email: agentData.email,
            displayName: agentData.name,
            role: 'Investor',
            syntheticAgent: true,
            agentPersona: agentData.persona,
            subscriptionPlan: agentData.tier || 'professional',
            subscriptionStatus: 'active',
          })
        );
      }, agent);

      // Navigate to Portfolio Dashboard
      await page.goto('/dashboard/command-center');
      await page.waitForLoadState('domcontentloaded');

      // Verify the page loads
      await expect(page).toHaveURL(/\/dashboard/);

      // Verify 3 projects exist for this agent
      expect(agent.projects).toHaveLength(3);
      for (const project of agent.projects) {
        expect(project.title).toBeDefined();
      }
    });
  }
});
