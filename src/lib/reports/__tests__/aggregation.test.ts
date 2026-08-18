import { buildPortfolioReport } from '../report-builder';

describe('Agent 5: Portfolio Report Aggregation Unit Tests', () => {
  test('buildPortfolioReport generates valid executive summary and metrics snapshot', async () => {
    const report = await buildPortfolioReport('quarterly', 'pdf');

    expect(report.reportId).toContain('report_quarterly');
    expect(report.type).toBe('quarterly');
    expect(report.executiveSummary).toContain('NOI');
    expect(report.metrics.scorecard.noi.value).not.toBeNull();
  });

  test('buildPortfolioReport generates CSV content when format is csv', async () => {
    const report = await buildPortfolioReport('monthly', 'csv');

    expect(report.format).toBe('csv');
    expect(report.csvContent).toContain('Metric,Value');
    expect(report.csvContent).toContain('NOI');
  });
});
