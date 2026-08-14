/**
 * Persona Swarm — Run Waves CLI Script
 * 
 * Usage:
 *   npx tsx scripts/persona-swarm/run-waves.ts --wave=1,2
 *   npx tsx scripts/persona-swarm/run-waves.ts --all
 */

import { orchestrateWaves } from '../../persona-swarm/src/wave-orchestrator';

async function main() {
  const args = process.argv.slice(2);
  let waves: number[] = [1, 2];

  for (const arg of args) {
    if (arg === '--all') {
      waves = [1, 2, 3, 4, 5];
    } else if (arg.startsWith('--wave=')) {
      const parts = arg.replace('--wave=', '').split(',');
      waves = parts.map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n));
    }
  }

  console.log(`Starting Persona Swarm execution for waves: [${waves.join(', ')}]...`);
  const manifest = await orchestrateWaves(waves);

  console.log('\n--- Wave Execution Complete ---');
  console.log(`Signups Completed:    ${manifest.stats.signupsCompleted} / 50`);
  console.log(`Subscriptions Active: ${manifest.stats.subscriptionsActive} / 50`);
  console.log(`Projects Created:     ${manifest.stats.projectsCreated} / 500`);
  console.log(`Interactions Run:     ${manifest.stats.interactionsExecuted} / 80`);
  console.log(`Team Invites:         ${manifest.stats.invitesAccepted} / 103`);
  console.log(`Reports Written:      ${manifest.stats.reportsGenerated} / 50`);
}

main().catch((err) => {
  console.error('\nSwarm Wave execution FAILED:', err.message);
  process.exit(1);
});
