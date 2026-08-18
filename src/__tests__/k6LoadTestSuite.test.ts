import fs from 'fs';
import path from 'path';

describe('k6 Load Testing Suite Verification (AGENT P-4-LOAD)', () => {
  const k6Dir = path.resolve(process.cwd(), 'tests/load/k6');

  const requiredFiles = [
    'auth-flow.js',
    'project-creation.js',
    'metric-engine.js',
    'portfolio-dashboard.js',
    'marketplace.js',
    'run-all.js',
  ];

  test('all required k6 load testing scenario files exist', () => {
    requiredFiles.forEach((file) => {
      const filePath = path.join(k6Dir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('k6 scenario scripts define thresholds and stage configurations', () => {
    requiredFiles.forEach((file) => {
      const filePath = path.join(k6Dir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('export const options');
      expect(content).toContain('stages');
      expect(content).toContain('thresholds');
    });
  });

  test('master run-all.js imports and configures all 5 scenarios', () => {
    const runAllPath = path.join(k6Dir, 'run-all.js');
    const content = fs.readFileSync(runAllPath, 'utf8');

    expect(content).toContain('auth_flow');
    expect(content).toContain('project_creation');
    expect(content).toContain('metric_engine');
    expect(content).toContain('portfolio_dashboard');
    expect(content).toContain('marketplace');
    expect(content).toContain('target: 1000');
  });

  test('docs/load-test/LOAD-TEST-RESULTS.md exists with sign-off', () => {
    const reportPath = path.resolve(process.cwd(), 'docs/load-test/LOAD-TEST-RESULTS.md');
    expect(fs.existsSync(reportPath)).toBe(true);
    const content = fs.readFileSync(reportPath, 'utf8');
    expect(content).toContain('Platform verified for 1,000 concurrent users');
  });
});
