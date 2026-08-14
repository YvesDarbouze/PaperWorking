/**
 * Persona Swarm — Agent Runner
 * 
 * Executes wave lifecycle steps for an individual persona agent.
 * Handles Wave 1 (Signup & Profile), Wave 2 (Billing Subscription),
 * Wave 3 (Project Creation & Plaid), Wave 4 (Interactions & Team Invites), Wave 5 (Reports).
 */

import { executeSignup, type PersonaAgent, type SignupResult } from './actions/signup';
import { executeBilling, type BillingResult } from './actions/billing';
import { executeProjectCreation } from './actions/projects';
import { executeInteractions } from './actions/collaborate';
import { executeReport } from './actions/report-writer';
import { logSwarmEvent } from './lib/artifact-log';
import { errorMessage } from './types';

export interface AgentExecutionState {
  agentId: string;
  uid?: string;
  email: string;
  signupResult?: SignupResult;
  billingResult?: BillingResult;
  projectCount: number;
  interactionCount: number;
  inviteCount: number;
  reportGenerated: boolean;
  errors: string[];
}

export async function runAgentWave(
  agent: PersonaAgent,
  wave: number,
  state: AgentExecutionState
): Promise<AgentExecutionState> {
  const agentId = agent.id;

  try {
    switch (wave) {
      case 1: {
        // Wave 1: Signup & Profile Provisioning
        logSwarmEvent(agentId, 'WAVE_1', 'START', { email: agent.email });
        const res = await executeSignup(agent);
        state.signupResult = res;
        if (res.success) {
          state.uid = res.uid;
          logSwarmEvent(agentId, 'WAVE_1', 'COMPLETE', { uid: res.uid });
        } else {
          state.errors.push(`Wave 1 Signup failed: ${res.error}`);
          logSwarmEvent(agentId, 'WAVE_1', 'FAILED', { error: res.error });
        }
        break;
      }

      case 2: {
        // Wave 2: Billing & Subscription Setup
        logSwarmEvent(agentId, 'WAVE_2', 'START');
        if (!state.uid) {
          state.errors.push('Wave 2 Billing skipped: UID missing from Wave 1');
          logSwarmEvent(agentId, 'WAVE_2', 'SKIPPED', { reason: 'UID missing' });
          break;
        }
        const bRes = await executeBilling(agent, state.uid);
        state.billingResult = bRes;
        if (bRes.success) {
          logSwarmEvent(agentId, 'WAVE_2', 'COMPLETE', { plan: bRes.plan });
        } else {
          state.errors.push(`Wave 2 Billing failed: ${bRes.error}`);
          logSwarmEvent(agentId, 'WAVE_2', 'FAILED', { error: bRes.error });
        }
        break;
      }

      case 3: {
        // Wave 3: Project Creation (10 projects per blueprint) & Plaid
        logSwarmEvent(agentId, 'WAVE_3', 'START');
        if (!state.uid) {
          state.errors.push('Wave 3 Projects skipped: UID missing');
          logSwarmEvent(agentId, 'WAVE_3', 'SKIPPED', { reason: 'UID missing' });
          break;
        }
        const pRes = await executeProjectCreation(agent, state.uid);
        state.projectCount = pRes.created;
        if (pRes.success) {
          logSwarmEvent(agentId, 'WAVE_3', 'COMPLETE', { created: pRes.created });
        } else {
          state.errors.push(`Wave 3 Projects failed: ${pRes.error}`);
          logSwarmEvent(agentId, 'WAVE_3', 'FAILED', { error: pRes.error });
        }
        break;
      }

      case 4: {
        // Wave 4: Deal Interactions & Team Invites
        logSwarmEvent(agentId, 'WAVE_4', 'START');
        if (!state.uid) {
          state.errors.push('Wave 4 Interactions skipped: UID missing');
          logSwarmEvent(agentId, 'WAVE_4', 'SKIPPED', { reason: 'UID missing' });
          break;
        }
        const iRes = await executeInteractions(agent, state.uid);
        state.interactionCount = iRes.interactionsExecuted;
        state.inviteCount = iRes.invitesSent;
        if (iRes.success) {
          logSwarmEvent(agentId, 'WAVE_4', 'COMPLETE', {
            interactions: iRes.interactionsExecuted,
            invites: iRes.invitesSent,
          });
        } else {
          state.errors.push(`Wave 4 Interactions failed: ${iRes.error}`);
          logSwarmEvent(agentId, 'WAVE_4', 'FAILED', { error: iRes.error });
        }
        break;
      }

      case 5: {
        // Wave 5: Persona Experience Report
        logSwarmEvent(agentId, 'WAVE_5', 'START');
        const rRes = await executeReport(agent, state);
        state.reportGenerated = rRes.success;
        if (rRes.success) {
          logSwarmEvent(agentId, 'WAVE_5', 'COMPLETE', { reportPath: rRes.path });
        } else {
          state.errors.push(`Wave 5 Report failed: ${rRes.error}`);
          logSwarmEvent(agentId, 'WAVE_5', 'FAILED', { error: rRes.error });
        }
        break;
      }

      default:
        state.errors.push(`Unknown wave number: ${wave}`);
    }
  } catch (err: unknown) {
    const msg = errorMessage(err);
    state.errors.push(`Wave ${wave} exception: ${msg}`);
    logSwarmEvent(agentId, `WAVE_${wave}`, 'EXCEPTION', { error: msg });
  }

  return state;
}
