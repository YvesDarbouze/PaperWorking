import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, '../..');
const CHART_FILES = [
  path.join(WEB_ROOT, 'components/insights/ProjectComparisonChart.tsx'),
  path.join(WEB_ROOT, 'components/insights/PortfolioInsightsPanel.tsx'),
];

describe('Data Visualization Constitution Static Lint Suite (Article 1–5 Enforcement)', () => {
  it('enforces that every full-size chart surface imports and renders inside ChartFrame', () => {
    for (const file of CHART_FILES) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain("import { ChartFrame }");
      expect(content).toMatch(/<ChartFrame[\s\S]*?>/);
    }
  });

  it('prohibits truncated axes and enforces zero-baseline on bar/column charts (Article 2 Rule 1)', () => {
    for (const file of CHART_FILES) {
      const content = fs.readFileSync(file, 'utf-8');
      // Ban artificial non-zero baselines on bar charts
      expect(content).not.toMatch(/yAxisMin\s*=\s*['"]?[1-9]/);
      expect(content).not.toMatch(/domain\s*=\s*\{\[\s*[1-9]/);
      expect(content).not.toMatch(/baseline\s*=\s*['"]?[1-9]/);
    }

    // Explicitly verify ProjectComparisonChart uses niceTickRange starting at 0
    const comparisonChart = fs.readFileSync(
      path.join(WEB_ROOT, 'components/insights/ProjectComparisonChart.tsx'),
      'utf-8',
    );
    expect(comparisonChart).toContain('niceTickRange(0,');
  });

  it('prohibits 3D chartjunk, extrusion, and drop shadows on data marks (Article 4 Rule 1)', () => {
    for (const file of CHART_FILES) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/\bis3D\b/i);
      expect(content).not.toMatch(/\bextrusion\b/i);
      expect(content).not.toMatch(/\bisometric\b/i);
    }
  });

  it('prohibits unauthorized hardcoded hex colors outside theme.ts (Article 3 Rule 1)', () => {
    const projectComparison = fs.readFileSync(
      path.join(WEB_ROOT, 'components/insights/ProjectComparisonChart.tsx'),
      'utf-8',
    );

    // Banned legacy or off-token hexes
    expect(projectComparison).not.toContain('#6366f1');
    expect(projectComparison).not.toContain('#10b981');
    expect(projectComparison).not.toContain('#f59e0b');

    // ChartFrame itself should not contain arbitrary hex values
    const chartFrame = fs.readFileSync(
      path.join(WEB_ROOT, 'lib/viz/ChartFrame.tsx'),
      'utf-8',
    );
    expect(chartFrame).not.toContain('#6366f1');
    expect(chartFrame).not.toContain('#10b981');
  });

  it('enforces accessible visually-hidden data tables (Article 4 Rule 2)', () => {
    for (const file of CHART_FILES) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain('dataTable=');
    }
  });

  it('enforces provenance source attribution on all full-size charts (Article 4 Rule 3)', () => {
    for (const file of CHART_FILES) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain('source=');
      expect(content).toMatch(/Source:\s*[^"']+/);
    }
  });

  it('enforces zero occurrence of forbidden terminology ("Sponsor") across chart infrastructure and surfaces', () => {
    const vizFiles = [
      path.join(WEB_ROOT, 'lib/viz/format.ts'),
      path.join(WEB_ROOT, 'lib/viz/theme.ts'),
      path.join(WEB_ROOT, 'lib/viz/ChartFrame.tsx'),
      path.join(WEB_ROOT, 'components/insights/ProjectComparisonChart.tsx'),
    ];

    for (const file of vizFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/\bSponsor\b/);
      expect(content).not.toMatch(/\bsponsor\b/);
    }
  });
});
