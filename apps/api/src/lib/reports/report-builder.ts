import {
  deriveAllProjectMetrics,
  canonicalSeedDeal,
} from '@paperworking/financial-engine';

export interface GeneratedReport {
  reportId: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'overall';
  format: 'pdf' | 'csv';
  generatedAt: string;
  executiveSummary: string;
  metrics: Awaited<ReturnType<typeof deriveAllProjectMetrics>>;
  csvContent?: string;
}

export async function buildPortfolioReport(
  type: 'monthly' | 'quarterly' | 'yearly' | 'overall' = 'quarterly',
  format: 'pdf' | 'csv' = 'pdf',
): Promise<GeneratedReport> {
  const sampleMetrics = await deriveAllProjectMetrics('proj_demo_1', { mockData: canonicalSeedDeal });

  const noi = sampleMetrics.scorecard.noi.value || 0;
  const capRate = sampleMetrics.scorecard.capRate.value || 0;

  const executiveSummary = `Your portfolio generated $${noi.toLocaleString()} in NOI this ${type}, with an average Cap Rate of ${capRate}%. Currently 1 project is in the Hold phase.`;

  const reportId = `report_${type}_${Date.now()}`;

  if (format === 'csv') {
    const csvContent = `Metric,Value\nNOI,$${noi}\nCap Rate,${capRate}%\nCash Flow,$${sampleMetrics.scorecard.cashFlow.value}\nDSCR,${sampleMetrics.scorecard.dscr.value}`;
    return {
      reportId,
      type,
      format,
      generatedAt: new Date().toISOString(),
      executiveSummary,
      metrics: sampleMetrics,
      csvContent,
    };
  }

  return {
    reportId,
    type,
    format,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    metrics: sampleMetrics,
  };
}
