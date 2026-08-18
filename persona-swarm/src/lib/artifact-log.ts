/**
 * Persona Swarm Artifact & Event Logger
 * 
 * Writes structured JSONL event logs per agent and saves screenshots
 * to artifacts/persona-swarm/logs/ and artifacts/persona-swarm/shots/.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Page } from '@playwright/test';

export interface SwarmEventLog {
  ts: string;
  agentId: string;
  wave: number;
  step: string;
  action: string;
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
  screenshotPath?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export class AgentArtifactLogger {
  private agentId: string;
  private logFilePath: string;
  private shotDirPath: string;

  constructor(agentId: string, baseDir?: string) {
    this.agentId = agentId;
    const rootArtifactDir = baseDir || path.join(process.cwd(), 'artifacts', 'persona-swarm');
    const logDir = path.join(rootArtifactDir, 'logs');
    this.shotDirPath = path.join(rootArtifactDir, 'shots', this.agentId);

    fs.mkdirSync(logDir, { recursive: true });
    fs.mkdirSync(this.shotDirPath, { recursive: true });

    this.logFilePath = path.join(logDir, `${this.agentId}.jsonl`);
  }

  /**
   * Logs an event to the agent's JSONL file.
   */
  logEvent(event: Omit<SwarmEventLog, 'ts' | 'agentId'>): SwarmEventLog {
    const fullEvent: SwarmEventLog = {
      ts: new Date().toISOString(),
      agentId: this.agentId,
      ...event,
    };

    fs.appendFileSync(this.logFilePath, JSON.stringify(fullEvent) + '\n', 'utf-8');
    return fullEvent;
  }

  /**
   * Takes a Playwright page screenshot and records the event.
   */
  async captureCheckpoint(
    page: Page,
    checkpointName: string,
    wave: number,
    action: string,
    result: 'SUCCESS' | 'FAILED' | 'BLOCKED' = 'SUCCESS',
    error?: string
  ): Promise<string> {
    const filename = `${this.agentId}_W${wave}_${checkpointName.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    const relativeShotPath = path.join('shots', this.agentId, filename);
    const absoluteShotPath = path.join(this.shotDirPath, filename);

    try {
      await page.screenshot({ path: absoluteShotPath, fullPage: true });
    } catch (e: unknown) {
      console.warn(`[${this.agentId}] Screenshot capture failed: ${(e as Error).message}`);
    }

    this.logEvent({
      wave,
      step: checkpointName,
      action,
      result,
      screenshotPath: relativeShotPath,
      error,
    });

    return relativeShotPath;
  }
}

/**
 * Top-level convenience logger for Swarm actions.
 */
export function logSwarmEvent(
  agentId: string,
  category: string,
  action: string,
  details?: Record<string, unknown>
): void {
  const logger = new AgentArtifactLogger(agentId);
  logger.logEvent({
    wave: category.startsWith('WAVE_') ? parseInt(category.replace('WAVE_', ''), 10) || 0 : 0,
    step: category,
    action,
    result: action.includes('ERROR') || action.includes('FAIL') ? 'FAILED' : 'SUCCESS',
    details,
  });
}
