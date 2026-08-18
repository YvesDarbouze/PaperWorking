/**
 * Jest Unit Test Suite — Report Content & Persona Voice Validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { orchestrateWaves } from '../wave-orchestrator';

const TEST_PERSONA_COUNT = 5;
const TEST_REPORT_COUNT = 3;

const originalEnv = process.env;

describe('Persona Swarm — Experience Reports & Aggregate Validation', () => {
  const reportsDir = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'reports');
  const aggregatePath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'aggregate-swarm-report.md');

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      PERSONA_SWARM_MODE: 'true',
      STRIPE_SECRET_KEY: 'sk_test_mock_persona_swarm_key',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/persona_swarm_test',
    };
    await orchestrateWaves([1, 2, 3, 4, 5], { maxPersonas: TEST_PERSONA_COUNT });
  }, 30000);

  afterAll(() => {
    process.env = originalEnv;
  });

  it('verifies experience report file exists for active test agents', () => {
    for (let i = 1; i <= TEST_REPORT_COUNT; i++) {
      const id = `P-${i.toString().padStart(2, '0')}`;
      const reportFile = path.join(reportsDir, `${id}-experience-report.md`);
      expect(fs.existsSync(reportFile)).toBe(true);
    }
  });

  it('verifies report generation completes and contains template sections', () => {
    for (let i = 1; i <= TEST_REPORT_COUNT; i++) {
      const id = `P-${i.toString().padStart(2, '0')}`;
      const reportFile = path.join(reportsDir, `${id}-experience-report.md`);
      const content = fs.readFileSync(reportFile, 'utf-8');

      expect(content).toContain('1. Agent Overview');
      expect(content).toContain('2. Bio & Investment Criteria');
      expect(content).toContain('3. Wave Execution Summary');
      expect(content).toContain('4. First-Person UX Narrative & Persona Voice');
    }
  });

  it('verifies reports are persona-voiced and distinct', () => {
    const p01Content = fs.readFileSync(path.join(reportsDir, 'P-01-experience-report.md'), 'utf-8');
    const p02Content = fs.readFileSync(path.join(reportsDir, 'P-02-experience-report.md'), 'utf-8');

    expect(p01Content).not.toEqual(p02Content);
    expect(p01Content).toContain('As Marcus Mac Delgado');
  });

  it('verifies aggregate report exists and contains summary sections', () => {
    expect(fs.existsSync(aggregatePath)).toBe(true);
    const aggregateContent = fs.readFileSync(aggregatePath, 'utf-8');

    expect(aggregateContent).toContain('Aggregate Autonomous Test Report');
  });
});
