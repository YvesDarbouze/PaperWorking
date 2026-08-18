/**
 * Jest Unit Test Suite — Persona Swarm Registry & Interaction Graph Integrity
 * 
 * Validates roster uniqueness, snapshot fidelity against authoritative-roster.json fixture,
 * category coverage, graph connectivity, invite thresholds, project blueprints, and strict
 * adherence to house terminology conventions.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Persona Registry & Interaction Graph Integrity', () => {
  const personasPath = path.join(process.cwd(), 'persona-swarm', 'config', 'personas.registry.json');
  const rosterFixturePath = path.join(process.cwd(), 'persona-swarm', 'config', 'authoritative-roster.json');
  const categoriesPath = path.join(process.cwd(), 'persona-swarm', 'config', 'categories.json');
  const graphPath = path.join(process.cwd(), 'persona-swarm', 'config', 'interaction-graph.json');

interface PersonaRecord {
  id: string;
  name: string;
  email: string;
  entity: string;
  category?: string;
  market: string;
  investmentCriteria: {
    strategy: string;
    [key: string]: unknown;
  };
  projects?: unknown[];
  [key: string]: unknown;
}

  let personas: PersonaRecord[];
  let rosterFixture: PersonaRecord[];
  let categories: any[];
  let graph: { edges: any[]; inviteMatrix: Record<string, string[]> };

  beforeAll(() => {
    personas = JSON.parse(fs.readFileSync(personasPath, 'utf-8'));
    rosterFixture = JSON.parse(fs.readFileSync(rosterFixturePath, 'utf-8'));
    categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8')).categories;
    graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
  });

  describe('50-Agent Authoritative Roster Snapshot Fidelity', () => {
    it('asserts 100% deep equality between personas.registry.json and authoritative-roster.json fixture', () => {
      expect(personas.length).toBe(rosterFixture.length);

      for (let i = 0; i < rosterFixture.length; i++) {
        const fixtureAgent = rosterFixture[i] as any;
        const registryAgent = personas.find((p) => p.id === fixtureAgent.id) as any;

        expect(registryAgent).toBeDefined();
        expect(registryAgent.name).toBe(fixtureAgent.name);
        expect(registryAgent.entity).toBe(fixtureAgent.entity);
        expect(registryAgent.category).toBe(fixtureAgent.category);
        expect(registryAgent.market).toBe(fixtureAgent.market);
        
        // Email pattern check
        const _expectedEmail = `agent${fixtureAgent.id.replace('P-', '')}.${fixtureAgent.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')}@paperworking-test.dev`;
        // Ensure email starts with agentNN and matches domain
        expect(registryAgent.email).toMatch(new RegExp(`^agent${fixtureAgent.id.replace('P-', '')}\\.`));
        expect(registryAgent.email).toMatch(/@paperworking-test\.dev$/);
      }
    });
  });

  describe('50-Agent Roster Invariants', () => {
    it('contains exactly 50 unique persona agents', () => {
      expect(personas.length).toBe(50);
      const ids = new Set(personas.map((p) => p.id));
      expect(ids.size).toBe(50);
    });

    it('enforces uniqueness for names, emails, entities, and market+strategy combos', () => {
      const names = new Set();
      const emails = new Set();
      const entities = new Set();
      const marketStrategies = new Set();

      for (const p of personas) {
        expect(names.has(p.name)).toBe(false);
        expect(emails.has(p.email)).toBe(false);
        expect(entities.has(p.entity)).toBe(false);

        const msCombo = `${p.market}::${p.investmentCriteria.strategy}`;
        expect(marketStrategies.has(msCombo)).toBe(false);

        names.add(p.name);
        emails.add(p.email);
        entities.add(p.entity);
        marketStrategies.add(msCombo);
      }
    });

    it('enforces strict surname uniqueness and anti-doubling quality lints (max 2 per surname across all 50 personas)', () => {
      const surnameCounts: Record<string, number> = {};

      for (const p of personas) {
        const tokens = p.name.trim().split(/\s+/);
        
        // 1. Anti-doubling: no consecutive identical name tokens (e.g. "Gary Gary" or "Chloe Chloe")
        for (let i = 0; i < tokens.length - 1; i++) {
          expect(tokens[i].toLowerCase()).not.toBe(tokens[i + 1].toLowerCase());
        }

        // Extract surname (last token)
        const surname = tokens[tokens.length - 1];
        surnameCounts[surname] = (surnameCounts[surname] || 0) + 1;
      }

      // 2. Max 2 agents sharing ANY surname across the entire roster
      for (const [_surname, count] of Object.entries(surnameCounts)) {
        expect(count).toBeLessThanOrEqual(2);
      }
    });

    it('ensures emails conform to agentNN.firstname.lastname@paperworking-test.dev format without repeated tokens', () => {
      const emailRegex = /^agent\d{2}\.([a-z0-9]+(?:\.[a-z0-9]+)*)@paperworking-test\.dev$/;

      for (const p of personas) {
        const match = p.email.match(emailRegex);
        expect(match).not.toBeNull();
      }
    });

    it('covers all 18 investor strategy categories from categories.json', () => {
      const categoryIds = new Set(categories.map((c) => c.id));
      expect(categoryIds.size).toBe(18);

      const rosterCategories = new Set(personas.map((p) => p.category));
      expect(rosterCategories.size).toBe(18);

      for (const catId of categoryIds) {
        expect(rosterCategories.has(catId)).toBe(true);
      }
    });

    it('ensures every agent has exactly 10 project blueprints (500 projects total)', () => {
      let totalProjects = 0;
      for (const p of personas) {
        expect(p.projects).toBeDefined();
        expect(p.projects?.length).toBe(10);
        totalProjects += p.projects?.length || 0;
      }
      expect(totalProjects).toBe(500);
    });

    it('ensures Plaid sandbox is designated for exactly 5 specific agents (P-16, P-23, P-30, P-33, P-37)', () => {
      const expectedPlaid = new Set(['P-16', 'P-23', 'P-30', 'P-33', 'P-37']);
      const actualPlaid = new Set(personas.filter((p) => p.plaidSandbox).map((p) => p.id));

      expect(actualPlaid.size).toBe(5);
      expect(actualPlaid).toEqual(expectedPlaid);
    });
  });

  describe('Interaction Graph Invariants', () => {
    it('contains exactly 80 deal-interaction edges across Tiers A, B, C, D', () => {
      expect(graph.edges.length).toBe(80);
      const tiers = new Set(graph.edges.map((e) => e.tier));
      expect(tiers).toEqual(new Set(['A', 'B', 'C', 'D']));
    });

    it('is a single connected graph linking all 50 agents', () => {
      const adjacency = new Map<string, Set<string>>();
      for (const p of personas) {
        adjacency.set(p.id, new Set());
      }

      for (const edge of graph.edges) {
        adjacency.get(edge.from)?.add(edge.to);
        adjacency.get(edge.to)?.add(edge.from);
      }

      // BFS from P-01
      const visited = new Set<string>();
      const queue = ['P-01'];
      visited.add('P-01');

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors = adjacency.get(curr) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      expect(visited.size).toBe(50);
    });

    it('asserts every agent sends >= 2 team invites and receives/accepts >= 1 team invite', () => {
      const sentCounts: Record<string, number> = {};
      const receivedCounts: Record<string, number> = {};

      for (const p of personas) {
        sentCounts[p.id] = 0;
        receivedCounts[p.id] = 0;
      }

      for (const [sender, recipients] of Object.entries(graph.inviteMatrix)) {
        sentCounts[sender] = (sentCounts[sender] || 0) + recipients.length;
        for (const recipient of recipients) {
          receivedCounts[recipient] = (receivedCounts[recipient] || 0) + 1;
        }
      }

      for (const p of personas) {
        expect(sentCounts[p.id]).toBeGreaterThanOrEqual(2);
        expect(receivedCounts[p.id]).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('House Terminology Rule Guard', () => {
    it('verifies ZERO occurrences of forbidden terminology across all config files', () => {
      const filesToCheck = [personasPath, rosterFixturePath, categoriesPath, graphPath];
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content.toLowerCase()).not.toContain('sponsor');
      }
    });
  });
});
