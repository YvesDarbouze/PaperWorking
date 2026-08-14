/**
 * Jest Unit Test Suite — Report Content & Persona Voice Validation (Amendment 1)
 * 
 * Validates all 50 generated experience reports and the aggregate report against master prompt requirements:
 * - File exists for every agent P-01 to P-50
 * - Contains all required sections (onboarding, billing, project UX, Insights KPIs, phase gates, team, bugs, feature requests)
 * - Category-tailored KPI metrics (wholesalers -> fee per deal, BRRRR -> CoC/refi equity, STR -> RevPAR)
 * - Persona-voiced narrative with non-identical text across agents
 * - Aggregate report covers cross-persona friction themes, top bugs, feature request tally, per-category findings
 */

import * as fs from 'fs';
import * as path from 'path';
import { orchestrateWaves } from '../wave-orchestrator';

const originalEnv = process.env;

describe('Persona Swarm — Experience Reports & Aggregate Validation (Amendment 1)', () => {
  const reportsDir = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'reports');
  const aggregatePath = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'aggregate-swarm-report.md');

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      PERSONA_SWARM_MODE: 'true',
      STRIPE_SECRET_KEY: 'sk_test_mock_persona_swarm_key',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/persona_swarm_test',
    };
    await orchestrateWaves([1, 2, 3, 4, 5]);
  }, 120000);

  afterAll(() => {
    process.env = originalEnv;
  });

  it('verifies experience report file exists for every agent P-01 to P-50', () => {
    for (let i = 1; i <= 50; i++) {
      const id = `P-${i.toString().padStart(2, '0')}`;
      const reportFile = path.join(reportsDir, `${id}-experience-report.md`);
      expect(fs.existsSync(reportFile)).toBe(true);
    }
  });

  it('verifies each report contains all required template sections', () => {
    for (let i = 1; i <= 50; i++) {
      const id = `P-${i.toString().padStart(2, '0')}`;
      const reportFile = path.join(reportsDir, `${id}-experience-report.md`);
      const content = fs.readFileSync(reportFile, 'utf-8');

      expect(content).toContain('1. Agent Overview');
      expect(content).toContain('2. Bio & Investment Criteria');
      expect(content).toContain('3. Wave Execution Summary');
      expect(content).toContain('4. First-Person UX Narrative & Persona Voice');
      expect(content).toContain('Onboarding Friction');
      expect(content).toContain('Billing Flow & Plan Selection');
      expect(content).toContain('Project Creation UX');
      expect(content).toContain('Insights & KPI Usefulness');
      expect(content).toContain('Phase-Gate Experience & Governance');
      expect(content).toContain('Collaboration & Team Features');
      expect(content).toContain('Bugs Identified');
      expect(content).toContain('Persona-Specific Feature Requests');
    }
  });

  it('verifies category-specific KPI metrics in reports (wholesalers, BRRRR, STR)', () => {
    // Wholesaler (P-01)
    const p01Content = fs.readFileSync(path.join(reportsDir, 'P-01-experience-report.md'), 'utf-8');
    expect(p01Content).toContain('Fee Per Deal');

    // BRRRR (P-15)
    const p15Content = fs.readFileSync(path.join(reportsDir, 'P-15-experience-report.md'), 'utf-8');
    expect(p15Content).toContain('Cash-on-Cash Return');

    // STR (P-25)
    const p25Content = fs.readFileSync(path.join(reportsDir, 'P-25-experience-report.md'), 'utf-8');
    expect(p25Content).toContain('RevPAR');
  });

  it('verifies reports are persona-voiced and distinct (pairwise content dissimilarity)', () => {
    const p01Content = fs.readFileSync(path.join(reportsDir, 'P-01-experience-report.md'), 'utf-8');
    const p02Content = fs.readFileSync(path.join(reportsDir, 'P-02-experience-report.md'), 'utf-8');
    const p32Content = fs.readFileSync(path.join(reportsDir, 'P-32-experience-report.md'), 'utf-8');

    expect(p01Content).not.toEqual(p02Content);
    expect(p01Content).not.toEqual(p32Content);

    // Verify first-person persona voice
    expect(p01Content).toContain('As Marcus Mac Delgado');
    expect(p32Content).toContain('As Evelyn Marsh');
  });

  it('verifies aggregate report exists and contains required summary sections', () => {
    expect(fs.existsSync(aggregatePath)).toBe(true);
    const aggregateContent = fs.readFileSync(aggregatePath, 'utf-8');

    expect(aggregateContent).toContain('Aggregate Autonomous Test Report');
    expect(aggregateContent).toContain('18 Strategy Category Coverage');
    expect(aggregateContent).toContain('Cross-Persona Friction Themes');
    expect(aggregateContent).toContain('Top Bugs by Frequency & Severity');
    expect(aggregateContent).toContain('Feature Request Tally');
    expect(aggregateContent).toContain('Strategic Architectural Recommendations');
  });
});
