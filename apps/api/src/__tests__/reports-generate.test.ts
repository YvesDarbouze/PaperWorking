import { describe, expect, it, jest } from '@jest/globals';
import { handleReportsGeneratePost } from '../routes/reports/generate/handler.js';

describe('POST /api/reports/generate', () => {
  it('returns CSV attachment when format is csv', async () => {
    const result = await handleReportsGeneratePost(
      { type: 'quarterly', format: 'csv' },
      {
        buildReport: jest.fn().mockResolvedValue({
          reportId: 'r1',
          type: 'quarterly',
          format: 'csv',
          generatedAt: new Date().toISOString(),
          executiveSummary: 'Summary',
          metrics: {},
          csvContent: 'Metric,Value\nNOI,$100',
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(result.headers?.['content-type']).toBe('text/csv');
    expect(result.body).toContain('NOI');
  });

  it('returns PDF buffer when format is pdf', async () => {
    const pdf = Buffer.from('%PDF-mock');
    const result = await handleReportsGeneratePost(
      { format: 'pdf' },
      {
        buildReport: jest.fn().mockResolvedValue({
          reportId: 'r2',
          type: 'quarterly',
          format: 'pdf',
          generatedAt: new Date().toISOString(),
          executiveSummary: 'Summary',
          metrics: { scorecard: { noi: { value: 1 }, capRate: { value: 2 }, cashFlow: { value: 3 }, dscr: { value: 4 }, occupancyRate: { value: 5 } } },
        }),
        exportPdf: jest.fn().mockResolvedValue(pdf),
      },
    );

    expect(result.status).toBe(200);
    expect(result.headers?.['content-type']).toBe('application/pdf');
    expect(result.body).toBe(pdf);
  });
});
