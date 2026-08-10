/**
 * PaperWorking Synthetic Investor Crew — Runner & Orchestrator Stub
 *
 * Provides execution methods for running synthetic persona behavior scripts,
 * simulated actions, and lifecycle flows. Stubbed for Prompt 1; filled in Prompt 5.
 */

import { PERSONA_ROSTER, type PersonaKey } from './personas';
import { resolvePersonaPlan, CREW_TARGET_ENV, CREW_BASE_URL } from './config';

export interface PersonaExecutionResult {
  personaKey: PersonaKey;
  success: boolean;
  actionsExecuted: string[];
  errors: string[];
  timestamp: string;
}

export interface RunnerOptions {
  targetEnv?: string;
  baseUrl?: string;
  personas?: PersonaKey[];
  dryRun?: boolean;
}

/**
 * Synthetic Crew Runner Harness.
 */
export class CrewRunner {
  private targetEnv: string;
  private baseUrl: string;

  constructor(options: RunnerOptions = {}) {
    this.targetEnv = options.targetEnv || CREW_TARGET_ENV;
    this.baseUrl = options.baseUrl || CREW_BASE_URL;
  }

  /**
   * Executes behavior scripts for specified persona(s) or all 9 personas.
   */
  async executePersonas(personaKeys?: PersonaKey[], dryRun = false): Promise<PersonaExecutionResult[]> {
    const keysToRun = personaKeys && personaKeys.length > 0 ? personaKeys : (Object.keys(PERSONA_ROSTER) as PersonaKey[]);
    const results: PersonaExecutionResult[] = [];

    for (const key of keysToRun) {
      const persona = PERSONA_ROSTER[key];
      const planInfo = resolvePersonaPlan(key);
      const timestamp = new Date().toISOString();

      if (!persona) {
        results.push({
          personaKey: key,
          success: false,
          actionsExecuted: [],
          errors: [`Persona key "${key}" not found in PERSONA_ROSTER`],
          timestamp,
        });
        continue;
      }

      if (dryRun) {
        results.push({
          personaKey: key,
          success: true,
          actionsExecuted: [`Dry-run: Validated profile and plan assignment (${planInfo.canonicalName}) for ${persona.name}`],
          errors: [],
          timestamp,
        });
      } else {
        // Stub: Detailed behavior execution for each persona key will be implemented in Prompt 5.
        results.push({
          personaKey: key,
          success: true,
          actionsExecuted: [
            `Initialized persona ${persona.name} (${key})`,
            `Assigned plan ${planInfo.canonicalName} (${planInfo.planId})`,
            `Loaded ${persona.fixtures.length} deal fixture(s)`,
          ],
          errors: [],
          timestamp,
        });
      }
    }

    return results;
  }
}

/**
 * Global runner instance.
 */
export const crewRunner = new CrewRunner();
