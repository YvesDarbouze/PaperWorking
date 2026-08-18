import React from 'react';
import { buildPortfolioReport } from '@/lib/reports/report-builder';

export default async function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const resolvedParams = await params;
  const report = await buildPortfolioReport('quarterly', 'pdf');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <header className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white">Report #{resolvedParams.reportId}</h1>
        <p className="text-sm text-slate-400">Generated on {new Date(report.generatedAt).toLocaleDateString()}</p>
      </header>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-emerald-400">Executive Summary</h2>
        <p className="text-sm text-slate-300">{report.executiveSummary}</p>
      </div>
    </div>
  );
}
