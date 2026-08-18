/**
 * Persona Swarm — Wave Orchestrator
 * 
 * Orchestrates multi-agent execution across Waves 1 through 5.
 * Maintains persistent state and updates `artifacts/persona-swarm/swarm-manifest.json`.
 */

import * as fs from 'fs';
import * as path from 'path';
import { assertSwarmFeatureFlag, assertStripeTestMode, assertDisposableDatabase } from './bootstrap';
import { runAgentWave, type AgentExecutionState } from './agent-runner';
import { compileAggregateReport } from './actions/report-writer';
import type { PersonaAgent } from './actions/signup';

export interface SwarmManifest {
  updatedAt: string;
  totalPersonas: number;
  completedWaves: number[];
  stats: {
    signupsCompleted: number;
    subscriptionsActive: number;
    projectsCreated: number;
    interactionsExecuted: number;
    invitesAccepted: number;
    reportsGenerated: number;
  };
  agents: Record<string, AgentExecutionState>;
}

export async function orchestrateWaves(
  wavesToRun: number[],
  options?: { maxPersonas?: number }
): Promise<SwarmManifest> {
  // Safety checks
  assertSwarmFeatureFlag();
  assertStripeTestMode();
  assertDisposableDatabase();

  const personasPath = path.join(process.cwd(), 'persona-swarm', 'config', 'personas.registry.json');
  let personas: PersonaAgent[] = JSON.parse(fs.readFileSync(personasPath, 'utf-8'));
  if (options?.maxPersonas && options.maxPersonas > 0) {
    personas = personas.slice(0, options.maxPersonas);
  }

  const manifestPath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'swarm-manifest.json');
  let manifest: SwarmManifest;

  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } else {
    manifest = {
      updatedAt: new Date().toISOString(),
      totalPersonas: personas.length,
      completedWaves: [],
      stats: {
        signupsCompleted: 0,
        subscriptionsActive: 0,
        projectsCreated: 0,
        interactionsExecuted: 0,
        invitesAccepted: 0,
        reportsGenerated: 0,
      },
      agents: {},
    };
  }

  // Initialize agent state maps if missing
  for (const agent of personas) {
    if (!manifest.agents[agent.id]) {
      manifest.agents[agent.id] = {
        agentId: agent.id,
        email: agent.email,
        projectCount: 0,
        interactionCount: 0,
        inviteCount: 0,
        reportGenerated: false,
        errors: [],
      };
    }
  }

  // Execute waves sequentially across agents
  for (const wave of wavesToRun) {
    console.log(`\n========================================`);
    console.log(`  Executing Persona Swarm Wave ${wave}...`);
    console.log(`========================================\n`);

    let index = 0;
    const total = personas.length;
    for (const agent of personas) {
      index++;
      const state = manifest.agents[agent.id];
      manifest.agents[agent.id] = await runAgentWave(agent, wave, state);
      if (process.env.NODE_ENV === 'test') {
        console.log(`[Wave ${wave}] ${index}/${total} (${Math.round((index / total) * 100)}%) ${agent.id}`);
      }
    }

    if (!manifest.completedWaves.includes(wave)) {
      manifest.completedWaves.push(wave);
    }
  }

  // Update aggregate statistics
  const agentStates = Object.values(manifest.agents);
  manifest.stats.signupsCompleted = agentStates.filter((s) => s.signupResult?.success).length;
  manifest.stats.subscriptionsActive = agentStates.filter((s) => s.billingResult?.success).length;
  manifest.stats.projectsCreated = agentStates.reduce((acc, s) => acc + s.projectCount, 0);
  manifest.stats.interactionsExecuted = agentStates.reduce((acc, s) => acc + s.interactionCount, 0);
  manifest.stats.invitesAccepted = agentStates.reduce((acc, s) => acc + s.inviteCount, 0);
  manifest.stats.reportsGenerated = agentStates.filter((s) => s.reportGenerated).length;
  manifest.updatedAt = new Date().toISOString();

  // If Wave 5 was executed, compile the aggregate report
  if (wavesToRun.includes(5)) {
    await compileAggregateReport(agentStates);
  }

  // Persist manifest
  const artifactsDir = path.dirname(manifestPath);
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\nSwarm Manifest updated at: ${manifestPath}`);
  return manifest;
}
